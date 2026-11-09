#!/usr/bin/env python3
"""Ajoute un numéro de version à tous les fichiers JS/CSS (import map + liens) pour que
les navigateurs ne gardent jamais une ancienne version en cache après une mise à jour.
À lancer avant chaque commit : python3 tools/version.py"""
import json, os, re, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = time.strftime('%y%m%d%H%M')
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
imports = {'three': './lib/three.module.min.js', 'three/addons/': './lib/addons/'}
for f in sorted(os.listdir(os.path.join(root, 'js'))):
    if f.endswith('.js'):
        imports[f'./js/{f}'] = f'./js/{f}?v={v}'
im = '<script type="importmap">' + json.dumps({'imports': imports}, ensure_ascii=False) + '</script>'
s = re.sub(r'<script type="importmap">.*?</script>', lambda m: im, s, count=1, flags=re.S)
s = re.sub(r'(href="css/[\w-]+\.css)(\?v=\d+)?"', lambda m: f'{m.group(1)}?v={v}"', s)
s = re.sub(r'<script type="module" src="js/main\.js(\?v=\d+)?"></script>', f'<script type="module" src="js/main.js?v={v}"></script>', s)
s = re.sub(r'<span id="ver">[^<]*</span>', f'<span id="ver">v{v}</span>', s)
open(p, 'w', encoding='utf-8').write(s)
print('version', v)
