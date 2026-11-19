"""Sucht auf Freesound nach Aufnahmen mit freier Lizenz (CC0 oder CC BY, keine NC/SA-Varianten)
und schreibt die Treffer als JSON nach material/roh/suche/<begriff>.json.
Aufruf: python3 freesound_suche.py "begriff 1; begriff 2" (Schlüssel in FREESOUND_API_KEY)."""
import json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / 'material' / 'roh' / 'suche'
FREI = {'http://creativecommons.org/publicdomain/zero/1.0/', 'https://creativecommons.org/publicdomain/zero/1.0/',
        'http://creativecommons.org/licenses/by/3.0/', 'https://creativecommons.org/licenses/by/4.0/',
        'http://creativecommons.org/licenses/by/4.0/', 'https://creativecommons.org/licenses/by/3.0/'}
FELDER = 'id,name,username,license,duration,samplerate,channels,type,avg_rating,num_ratings,num_downloads,tags,description,url'


def suche(begriff, key, seiten=2):
    treffer = []
    for seite in range(1, seiten + 1):
        q = urllib.parse.urlencode({'query': begriff, 'page_size': 50, 'page': seite, 'fields': FELDER,
                                    'filter': 'license:("Creative Commons 0" OR "Attribution")', 'sort': 'score'})
        req = urllib.request.Request('https://freesound.org/apiv2/search/text/?' + q,
                                     headers={'Authorization': 'Token ' + key, 'User-Agent': 'raumklang-pipeline/0.2 (https://github.com/chillchamp1/lab)'})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
        treffer += [t for t in d['results'] if t['license'].rstrip('/') + '/' in FREI]
        if not d.get('next'):
            break
    return treffer


def main():
    key = os.environ.get('FREESOUND_API_KEY')
    if not key:
        sys.exit('FREESOUND_API_KEY fehlt')
    ZIEL.mkdir(parents=True, exist_ok=True)
    for begriff in [b.strip() for b in ' '.join(sys.argv[1:]).split(';') if b.strip()]:
        t = suche(begriff, key)
        name = re.sub(r'[^a-z0-9]+', '_', begriff.lower()).strip('_')
        (ZIEL / f'{name}.json').write_text(json.dumps(t, ensure_ascii=False, indent=1))
        print(f'{begriff}: {len(t)} Treffer mit freier Lizenz', flush=True)


if __name__ == '__main__':
    main()
