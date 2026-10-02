#!/usr/bin/env python3
"""Build a static-only Netlify publication directory; no source tools or secrets."""
from pathlib import Path
import base64, hashlib, re, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
STATIC = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.xml'}
SKIP = {'tools','tests','node_modules','dist','.git','.agents','.codex','src','server','netlify'}

def allowed(path):
    if any(part.startswith('.') or part in SKIP for part in path.parts): return False
    if path.name == 'index.src.html': return False
    return path.suffix.lower() in STATIC or path.name in {'ads.txt','robots.txt','cevaplar.txt','kelimehavuzu.txt'} or (path.parts[0]=='assets' and path.suffix=='.json')

def headers(directory):
    # Hashes match the built HTML, not the source. Script restrictions are initially
    # Report-Only: AdSense uses changing third-party origins and must not be broken.
    hashes=set()
    for html in directory.rglob('*.html'):
        for attrs,code in re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',html.read_text(),re.I):
            if 'src=' not in attrs and code.strip():
                digest=base64.b64encode(hashlib.sha256(code.encode()).digest()).decode()
                hashes.add("'sha256-"+digest+"'")
    policy="script-src 'self' https: "+' '.join(sorted(hashes))+"; object-src 'none'; base-uri 'self'"
    (directory/'_headers').write_text('/*\n  Content-Security-Policy-Report-Only: '+policy+'\n')

if __name__ == '__main__':
    if '--headers-only' in sys.argv:
        if not (OUT/'index.html').is_file(): raise SystemExit('Build index.html first')
    else:
        files=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
        chosen=[Path(name) for name in files if name and allowed(Path(name))]
        # Known newly introduced web asset; other untracked files never enter a deploy.
        for asset in ['assets/game-security.js','assets/game-remote.js']:
            if (ROOT/asset).is_file(): chosen.append(Path(asset))
        if not Path('index.html') in chosen: raise SystemExit('Tracked index.html is required')
        if OUT.is_symlink(): raise SystemExit('Refusing a symlink publication directory')
        if OUT.exists(): shutil.rmtree(OUT)
        OUT.mkdir()
        for rel in chosen:
            src=ROOT/rel
            if not src.is_file(): continue
            if src.is_symlink() or ROOT.resolve() not in src.resolve().parents: raise SystemExit('Unsafe asset: '+str(rel))
            dest=OUT/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
    headers(OUT)
    print('Publication ready:',OUT)
