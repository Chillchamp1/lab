"""Tiny frame-sink server for the MP4 export (video_export.js).

  python -I video_server.py [--port 8767] [--min-free-mb 500] [--out video_out] [--ffmpeg PFAD]

--out     output folder for mp4s and snapshots (default: video_out/ next to this script)
--ffmpeg  ffmpeg executable (default: $FFMPEG, else imageio_ffmpeg's bundled binary, else 'ffmpeg' from PATH)

GET  /<file>            static file from this folder (e.g. the assembled page copy)
GET  /out/<file>        file from the output folder (finished mp4, snapshots)
GET  /status            JSON: running, frames, bytes, output size, free disk
POST /start?w=1920&h=1080&fps=60&name=x.mp4[&fmt=jpeg|png][&crf=17][&preset=slow][&faststart=1]
                        starts ffmpeg (image2pipe -> libx264); 409 if one is running (POST /abort first)
POST /frame?i=<n>       body = one JPEG/PNG frame, written synchronously to ffmpeg stdin (= backpressure).
                        i must be the next index; a repeated i (client retry) is acknowledged without writing.
POST /finish            closes stdin, waits for ffmpeg, returns {code, size, frames, path, log}
POST /abort             kills ffmpeg and deletes the partial output
POST /snapshot?name=x.png   saves the body (single PNG/JPEG) into the output folder
All responses carry permissive CORS headers (page may also be opened from file://).
"""
import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "video_out")          # overridden by --out


def default_ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg") or "ffmpeg"


FFMPEG = None                                        # set in main() (--ffmpeg)
LOG_PATH = os.path.join(ROOT, "video_ffmpeg.log")
MIN_FREE = 500 * 1024 * 1024


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def free_bytes():
    try:
        return shutil.disk_usage(OUT_DIR).free
    except OSError:
        return -1


def safe_name(name, exts):
    name = os.path.basename((name or "").replace("\\", "/")).strip()
    if not name or name.startswith(".") or os.path.splitext(name)[1].lower() not in exts:
        return None
    return name


class Job:
    def __init__(self):
        self.lock = threading.Lock()
        self.proc = None
        self.reset()

    def reset(self):
        self.proc = None
        self.path = None
        self.expected = 0
        self.bytes_in = 0
        self.t0 = 0.0
        self.last_log = 0.0
        self.logf = None
        self.params = {}


JOB = Job()


def log_tail(n=2500):
    try:
        with open(LOG_PATH, "rb") as f:
            f.seek(0, 2)
            sz = f.tell()
            f.seek(max(0, sz - n))
            return f.read().decode("utf-8", "replace")
    except OSError:
        return ""


def start_ffmpeg(q):
    w, h, fps = int(q.get("w", 1920)), int(q.get("h", 1080)), float(q.get("fps", 60))
    fmt = q.get("fmt", "jpeg").lower()
    crf, preset = str(int(q.get("crf", 17))), q.get("preset", "slow")
    if preset not in ("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"):
        raise ValueError("bad preset")
    name = safe_name(q.get("name", "video.mp4"), {".mp4"})
    if not name:
        raise ValueError("name must be a plain *.mp4 file name")
    path = os.path.join(OUT_DIR, name)
    dec = "png" if fmt == "png" else "mjpeg"
    # JPEG aus dem Canvas: BT.601, volle Spanne -> BT.709, begrenzte Spanne (Standard für HD-Video), korrekt getaggt
    rng = "in_range=full:" if dec == "mjpeg" else ""
    vf = (f"scale={w}:{h}:{rng}out_range=limited:out_color_matrix=bt709:"
          "flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,"
          "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv")
    cmd = [FFMPEG, "-hide_banner", "-loglevel", "warning", "-stats", "-y",
           "-f", "image2pipe", "-c:v", dec, "-framerate", f"{fps:g}", "-i", "-",
           "-vf", vf, "-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
    if q.get("faststart", "1") != "0":
        cmd += ["-movflags", "+faststart"]
    cmd.append(path)
    logf = open(LOG_PATH, "wb")
    logf.write((" ".join(cmd) + "\n").encode())
    logf.flush()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=logf, bufsize=0)
    JOB.reset()
    JOB.proc, JOB.path, JOB.logf, JOB.t0 = proc, path, logf, time.time()
    JOB.params = dict(w=w, h=h, fps=fps, fmt=dec, crf=crf, preset=preset, name=name)
    log(f"START {name}  {w}x{h}@{fps:g}  {dec}->x264 crf {crf} {preset}  free {free_bytes() / 1e9:.2f} GB")
    return JOB.params


def stop_ffmpeg(kill=False, timeout=None):
    p = JOB.proc
    if not p:
        return None
    if kill:
        p.kill()
    else:
        try:
            p.stdin.close()
        except OSError:
            pass
    try:
        code = p.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        p.kill()
        code = p.wait()
    if JOB.logf:
        JOB.logf.close()
    return code


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "VideoSink/1"

    def log_message(self, fmt, *args):  # Zugriffe nur für Nicht-Frames protokollieren
        if "/frame" not in self.path:
            sys.stdout.write(time.strftime("%H:%M:%S ") + (fmt % args) + "\n")

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def reply(self, code, obj=None, ctype="application/json"):
        body = (json.dumps(obj) if ctype == "application/json" else obj or "").encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        buf, got = bytearray(), 0
        while got < n:
            chunk = self.rfile.read(min(1 << 20, n - got))
            if not chunk:
                break
            buf += chunk
            got += len(chunk)
        return bytes(buf)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        p = urllib.parse.unquote(u.path)
        if p == "/status":
            j = JOB
            out = os.path.getsize(j.path) if j.path and os.path.exists(j.path) else 0
            return self.reply(200, dict(running=bool(j.proc and j.proc.poll() is None), frames=j.expected,
                                        bytes_in=j.bytes_in, out_size=out, path=j.path, params=j.params,
                                        free=free_bytes(), log=log_tail(600)))
        if p.startswith("/out/"):
            base, rel = OUT_DIR, p[5:]
        else:
            base, rel = ROOT, p.lstrip("/") or "index.html"
        fp = os.path.realpath(os.path.join(base, rel))
        if not fp.startswith(os.path.realpath(base) + os.sep) or not os.path.isfile(fp):
            return self.reply(404, {"error": "not found", "path": p})
        ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype.endswith("javascript"):
            ctype += "; charset=utf-8"
        size = os.path.getsize(fp)
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with open(fp, "rb") as f:
            shutil.copyfileobj(f, self.wfile, 1 << 20)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        q = dict(urllib.parse.parse_qsl(u.query))
        route = u.path
        data = self.body()
        try:
            if route == "/frame":
                return self.frame(q, data)
            with JOB.lock:
                if route == "/start":
                    if JOB.proc and JOB.proc.poll() is None:
                        return self.reply(409, {"error": "ffmpeg already running - POST /finish or /abort first"})
                    fb = free_bytes()
                    if 0 <= fb < MIN_FREE:
                        return self.reply(507, {"error": f"only {fb / 1e6:.0f} MB free on the output drive"})
                    return self.reply(200, {"ok": True, **start_ffmpeg(q)})
                if route == "/finish":
                    if not JOB.proc:
                        return self.reply(409, {"error": "not running"})
                    n, path, t0 = JOB.expected, JOB.path, JOB.t0
                    log(f"FINISH: {n} frames received, waiting for ffmpeg ...")
                    code = stop_ffmpeg(timeout=3600)
                    size = os.path.getsize(path) if os.path.exists(path) else 0
                    log(f"DONE code {code}  {path}  {size / 1e6:.1f} MB  ({time.time() - t0:.0f} s)")
                    JOB.reset()
                    return self.reply(200, {"code": code, "size": size, "frames": n, "path": path, "log": log_tail()})
                if route == "/abort":
                    path = JOB.path
                    code = stop_ffmpeg(kill=True)
                    removed = False
                    if path and os.path.exists(path):
                        os.remove(path)
                        removed = True
                    log(f"ABORT (code {code}), partial output removed: {removed}")
                    JOB.reset()
                    return self.reply(200, {"aborted": code is not None, "removed": removed})
                if route == "/snapshot":
                    name = safe_name(q.get("name", "snapshot.png"), {".png", ".jpg", ".jpeg"})
                    if not name:
                        return self.reply(400, {"error": "name must be *.png / *.jpg"})
                    path = os.path.join(OUT_DIR, name)
                    with open(path, "wb") as f:
                        f.write(data)
                    log(f"SNAPSHOT {path} ({len(data) / 1e3:.0f} kB)")
                    return self.reply(200, {"path": path, "size": len(data)})
            return self.reply(404, {"error": "unknown route"})
        except Exception as e:  # noqa: BLE001 – Fehler an den Client melden
            log("ERROR", route, repr(e))
            return self.reply(500, {"error": repr(e)})

    def frame(self, q, data):
        with JOB.lock:
            j = JOB
            if not j.proc:
                return self.reply(409, {"error": "not started"})
            if j.proc.poll() is not None:
                return self.reply(500, {"error": f"ffmpeg exited ({j.proc.returncode})", "log": log_tail()})
            i = int(q.get("i", j.expected))
            if i < j.expected:
                return self.reply(200, {"dup": True, "next": j.expected})
            if i > j.expected:
                return self.reply(409, {"error": f"expected frame {j.expected}, got {i}", "next": j.expected})
            if not data:
                return self.reply(400, {"error": "empty frame"})
            if j.expected % 120 == 0:
                fb = free_bytes()
                if 0 <= fb < MIN_FREE:
                    log(f"DISK nearly full ({fb / 1e6:.0f} MB) - refusing frames; POST /finish to keep what exists")
                    return self.reply(507, {"error": f"disk nearly full ({fb / 1e6:.0f} MB free)", "next": j.expected})
            try:
                j.proc.stdin.write(data)  # blockiert, solange ffmpeg nicht nachkommt -> natürliche Drosselung
            except (BrokenPipeError, OSError) as e:
                return self.reply(500, {"error": f"ffmpeg pipe: {e!r}", "log": log_tail()})
            j.expected += 1
            j.bytes_in += len(data)
            now = time.time()
            if now - j.last_log > 5:
                j.last_log = now
                el = now - j.t0
                out = os.path.getsize(j.path) / 1e6 if os.path.exists(j.path) else 0
                log(f"frame {j.expected:6d}  {j.expected / max(el, 1e-6):5.1f} fps avg  in {j.bytes_in / 1e6:7.1f} MB "
                    f"(last {len(data) / 1e3:.0f} kB)  mp4 {out:6.1f} MB  free {free_bytes() / 1e9:.2f} GB")
            return self.reply(200, {"ok": True, "next": j.expected})


def main():
    global MIN_FREE, OUT_DIR, FFMPEG
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8767)
    ap.add_argument("--min-free-mb", type=int, default=500)
    ap.add_argument("--out", default=OUT_DIR, help="output folder (mp4, snapshots)")
    ap.add_argument("--ffmpeg", default=None, help="ffmpeg executable")
    a = ap.parse_args()
    MIN_FREE = a.min_free_mb * 1024 * 1024
    OUT_DIR = os.path.abspath(a.out)
    FFMPEG = a.ffmpeg or default_ffmpeg()
    os.makedirs(OUT_DIR, exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), H)
    srv.daemon_threads = True
    log(f"serving {ROOT} on http://127.0.0.1:{a.port}/  -> output {OUT_DIR}  (free {free_bytes() / 1e9:.2f} GB)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop_ffmpeg(kill=True)


if __name__ == "__main__":
    main()
