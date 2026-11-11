"""Mini-Server: liefert render_tiles.html aus (http://127.0.0.1:8766/render_tiles.html) und speichert per POST
gerenderte Kartenbilder nach renders/<name>.png (neben diesem Skript)."""
import http.server, os, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "renders"); os.makedirs(OUT, exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def do_POST(self):
        name = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)["name"][0]
        assert name.replace("_", "").isalnum()
        data = self.rfile.read(int(self.headers["Content-Length"]))
        open(os.path.join(OUT, name + ".png"), "wb").write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")


http.server.ThreadingHTTPServer(("127.0.0.1", 8766), H).serve_forever()
