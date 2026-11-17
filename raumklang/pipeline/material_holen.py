"""Lädt die in quellen.json verzeichneten Aufnahmen nach material/roh/.

Wikimedia Commons: direkt von upload.wikimedia.org (Pfad aus dem MD5 des Dateinamens).
ESC-50: Fünf-Sekunden-Ausschnitte von Freesound-Aufnahmen aus github.com/karolpiczak/ESC-50
(hier nur Clips, deren Original CC0 oder CC-BY ist).
Freesound: HQ-Vorschau über die API (Schlüssel in FREESOUND_API_KEY; in der
Claude-Cloud-Umgebung setzt der Netz-Proxy ihn selbst ein).
"""
import hashlib, json, os, sys, time, urllib.parse, urllib.request
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
ROH = WURZEL / 'material' / 'roh'
KOPF = {'User-Agent': 'raumklang-pipeline/0.1 (audio research script)'}


def hole(url, ziel, kopf=KOPF):
    for versuch in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=kopf), timeout=120) as r:
                ziel.write_bytes(r.read())
            return True
        except Exception as e:
            print('   ', type(e).__name__, e, '– warte', flush=True)
            time.sleep(8 + 6 * versuch)
    return False


def commons_url(datei):
    name = datei.replace(' ', '_')
    h = hashlib.md5(name.encode()).hexdigest()
    return f'https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{urllib.parse.quote(name)}'


def freesound_url(nr):
    kopf = dict(KOPF)
    key = os.environ.get('FREESOUND_API_KEY')
    if key:
        kopf['Authorization'] = 'Token ' + key
    with urllib.request.urlopen(urllib.request.Request(f'https://freesound.org/apiv2/sounds/{nr}/?fields=previews', headers=kopf), timeout=60) as r:
        return json.load(r)['previews']['preview-hq-ogg']


def main():
    ROH.mkdir(parents=True, exist_ok=True)
    quellen = json.loads((WURZEL / 'quellen.json').read_text())
    if len(sys.argv) > 1:                       # nur die genannten ids, in dieser Reihenfolge
        nach_id = {q['id']: q for q in quellen}
        quellen = [nach_id[i] for i in sys.argv[1:]]
    for q in quellen:
        ziel = ROH / q['lokal']
        if ziel.exists() and ziel.stat().st_size > 1000:
            continue
        if q['herkunft'] == 'commons':
            url = commons_url(q['datei'])
        elif q['herkunft'] == 'esc50':
            url = 'https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/' + q['datei']
        else:
            url = freesound_url(q['nummer'])
        print(q['lokal'], '<-', url, flush=True)
        ok = hole(url, ziel)
        print('   ok' if ok else '   FEHLGESCHLAGEN', flush=True)
        time.sleep(2)


if __name__ == '__main__':
    main()
