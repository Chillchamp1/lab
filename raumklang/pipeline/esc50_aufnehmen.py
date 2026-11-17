"""ESC-50-Clips ins Quellenverzeichnis aufnehmen (nur Einzellizenz CC0 oder CC BY).
Aufruf: python3 pipeline/esc50_aufnehmen.py <esc50-ordner> <schlüssel> [<schlüssel> ...]
Schlüssel wie 3-157149-A. Kopiert die Clips nach material/roh/ und trägt sie in quellen.json ein."""
import csv, json, re, shutil, sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent


def main():
    esc = Path(sys.argv[1])
    txt = (esc / 'LICENSE').read_text(encoding='utf-8', errors='replace')
    lic = {m.group(1): dict(titel=m.group(2), url=m.group(3), urheber=m.group(4), lizenz=m.group(5))
           for m in re.finditer(r'- \[(\d-\d+-[A-Z])\.ogg\]: clip derived from (.*?) \((http\S+)\) by (.*?) \[(.*?)\]', txt)}
    datei = {r['filename'].rsplit('-', 1)[0]: r['filename'] for r in csv.DictReader(open(esc / 'meta' / 'esc50.csv'))}
    q = json.loads((WURZEL / 'quellen.json').read_text())
    da = {e['id'] for e in q}
    neu = 0
    for k in sys.argv[2:]:
        l = lic[k]
        if l['lizenz'] not in ('CC0', 'CC-BY'):
            print('übersprungen (Lizenz):', k, l['lizenz'])
            continue
        i = 'esc_' + k
        ziel = WURZEL / 'material' / 'roh' / (i + '.wav')
        if not ziel.exists():
            shutil.copy(esc / 'audio' / datei[k], ziel)
        if i in da:
            continue
        q.append(dict(id=i, herkunft='esc50', datei=datei[k], lokal=i + '.wav',
                      lizenz={'CC0': 'CC0', 'CC-BY': 'CC BY 3.0'}[l['lizenz']], urheber=l['urheber'],
                      titel=l['titel'].replace('​', ''), seite=l['url'].replace('http://www.', 'https://')))
        neu += 1
    (WURZEL / 'quellen.json').write_text(json.dumps(q, ensure_ascii=False, indent=1))
    print(neu, 'neu aufgenommen')


if __name__ == '__main__':
    main()
