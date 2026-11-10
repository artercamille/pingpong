#!/usr/bin/env python3
"""Génère les visuels des cartes du menu (assets/ui/*.jpg) à partir du jeu lui-même.
Lancer un serveur local sur le port 8123 puis : python3 tools/keyart.py"""
import asyncio, io, os
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = [
    ('career', 'finale', dict(pos=[-2.4, 0.85, 4.2], look=[0.5, 1.15, 0.3], fov=36, dof=[8, 15, 14])),
    ('quick', 'neotokyo', dict(pos=[3.0, 1.15, 1.3], look=[0, 1.0, -0.7], fov=40, dof=[7.5, 15, 13])),
    ('online', 'beach', dict(pos=[-3.7, 1.9, 4.4], look=[0, 0.95, -0.6], fov=38, dof=[11, 22, 10])),
]
WIDE = dict(pos=[4.4, 2.1, 5.8], look=[-0.4, 0.9, 0], fov=42, dof=[12, 24, 9])
TIERS = [('challenger', 'WTT Feeder Doha'), ('contender', 'WTT Contender Doha'), ('star', 'WTT Champions Doha'), ('slam', 'Singapore Smash'), ('finals', 'WTT Finals'), ('worlds', 'Championnats du monde'), ('olympics', 'Jeux olympiques de Paris')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width': 1200, 'height': 800})).new_page()
        await pg.goto('http://localhost:8123/index.html')
        await pg.wait_for_function("document.querySelector('#loading').classList.contains('hidden')", timeout=150000)
        await pg.add_style_tag(content='#hud, #menu, .overlay, #victory, #replay { display: none !important; }')
        await pg.evaluate("() => { document.querySelector('[data-go=scr-ai]').click(); document.querySelector('#ai-go').click(); }")
        await asyncio.sleep(1.5)
        await pg.evaluate("() => { window.__noRender = true; const g = window.__pp.game; g.ctrl[0] = 'ai'; g.ai[0] = new window.__pp.AI(g, 0, 3); window.__pp.R.intro = 0; }")
        for name, arena, cam in SHOTS:
            await pg.evaluate("""async (a) => { const v = document.querySelector('#ver').textContent.slice(1); const A = await import('/js/arenas.js?v=' + v), V = await import('/js/venues.js?v=' + v); const R = window.__pp.R;
              R.setVenue(a === 'finale' ? V.defaultVenue({ neon: 0xd23cff, legs: 0x7a3fd6, light: 0x8a3cff }) : A.ARENA_VENUES[a]); }""", arena)
            await pg.wait_for_function("window.__pp.game.state === 'rally' && window.__pp.game.rallyCount >= 2 && Math.abs(window.__pp.game.ball.p.z) < 0.7", timeout=120000)
            await pg.evaluate("""(cam) => { const R = window.__pp.R, g = window.__pp.game; R.camOverride = cam; R.intro = 0;
              if (R.kit) R.kit.update(0.016, 41, 0); for (let i = 0; i < 3; i++) R.update(g, 0.016); }""", cam)
            png = await pg.screenshot(timeout=300000)
            Image.open(io.BytesIO(png)).convert('RGB').resize((1080, 720), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'ui', name + '.jpg'), quality=84)
            print('ok', name)
        for tier, name in TIERS + [('exhib', '')]:
            await pg.evaluate("""async ([t, n]) => { const v = document.querySelector('#ver').textContent.slice(1); const A = await import('/js/arenas.js?v=' + v), V = await import('/js/venues.js?v=' + v); const R = window.__pp.R;
              R.setVenue(t === 'exhib' ? A.ARENA_VENUES.neotokyo : V.venueFor({ tier: t, ev: { name: n, tier: t } })); }""", [tier, name])
            await pg.wait_for_function("window.__pp.game.state === 'rally' && window.__pp.game.rallyCount >= 1 && Math.abs(window.__pp.game.ball.p.z) < 0.8", timeout=120000)
            await pg.evaluate("""(cam) => { const R = window.__pp.R, g = window.__pp.game; R.camOverride = cam; R.intro = 0;
              if (R.kit) R.kit.update(0.016, 41, 0); for (let i = 0; i < 3; i++) R.update(g, 0.016); }""", WIDE)
            png = await pg.screenshot(timeout=300000)
            Image.open(io.BytesIO(png)).convert('RGB').resize((900, 600), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'ui', 'tier_' + tier + '.jpg'), quality=80)
            print('ok', tier)
        await b.close()
asyncio.run(main())
