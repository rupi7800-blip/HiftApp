"""Logo HIFT Lab senza sfondo bianco + icone dell'app.
Uso: python3 tools/logo.py <logo.jpg|png>
- toglie solo il bianco collegato ai bordi (riempimento dai bordi): i contorni bianchi
  interni del logo (kettlebell, lettere) restano
- bordi morbidi: nella fascia di contatto il bianco diventa trasparenza (color-to-alpha)
- scrive icons/logo.png (trasparente) e le icone dell'app su fondo scuro
"""
import sys
from collections import deque
from PIL import Image, ImageFilter

SRC = sys.argv[1]
BG = (27, 26, 28)  # fondo scuro dell'app (#1B1A1C)

im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()
white = lambda c: min(c) >= 205

# 1) sfondo = bianco raggiungibile dai bordi
bg = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if white(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if white(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny * W + nx] and white(px[nx, ny]):
            bg[ny * W + nx] = 1; q.append((nx, ny))

# 2) buchi chiusi (anse dei kettlebell): zone bianche interne "spesse"; i contorni sottili restano
seen = bytearray(W * H)
buchi = 0
for sy in range(H):
    for sx in range(W):
        i0 = sy * W + sx
        if bg[i0] or seen[i0] or not white(px[sx, sy]):
            continue
        comp = []; seen[i0] = 1; q = deque([(sx, sy)])
        while q:
            x, y = q.popleft(); comp.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                j = ny * W + nx
                if 0 <= nx < W and 0 <= ny < H and not seen[j] and not bg[j] and white(px[nx, ny]):
                    seen[j] = 1; q.append((nx, ny))
        cs = set(comp)
        spesso = sum(1 for (x, y) in comp if all((x + dx, y + dy) in cs for dx in (-3, 0, 3) for dy in (-3, 0, 3)))
        if spesso > 60:
            buchi += 1
            for (x, y) in comp:
                bg[y * W + x] = 1
print('anse rese trasparenti:', buchi)

mask = Image.frombytes('L', (W, H), bytes(255 if v else 0 for v in bg))
band = mask.filter(ImageFilter.MaxFilter(5))  # fascia di 2 px attorno allo sfondo
bp = band.load()

out = Image.new('RGBA', (W, H))
op = out.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        if bg[y * W + x]:
            op[x, y] = (255, 255, 255, 0)
        elif bp[x, y]:
            # color-to-alpha dal bianco: recupera il colore e rende trasparente la parte "bianca"
            a = max(255 - r, 255 - g, 255 - b) / 255
            if a <= 0.02:
                op[x, y] = (255, 255, 255, 0)
            else:
                f = lambda c: max(0, min(255, round((c - (1 - a) * 255) / a)))
                op[x, y] = (f(r), f(g), f(b), round(a * 255))
        else:
            op[x, y] = (r, g, b, 255)

box = out.getbbox()
logo = out.crop(box)
logo.save('icons/logo.png', optimize=True)
print('logo', logo.size, 'ritaglio', box)

def icona(size, scala, path, fondo=BG, raggio=0):
    can = Image.new('RGBA', (size, size), fondo + (255,))
    lw, lh = logo.size
    s = scala * size / max(lw, lh)
    l2 = logo.resize((round(lw * s), round(lh * s)), Image.LANCZOS)
    can.alpha_composite(l2, ((size - l2.width) // 2, (size - l2.height) // 2))
    can.convert('RGB').save(path, optimize=True)

icona(512, 0.78, 'icons/icon-512.png')     # 78%: dentro la zona sicura delle icone "maskable"
icona(192, 0.78, 'icons/icon-192.png')
icona(180, 0.82, 'icons/apple-touch-icon.png')
icona(32, 0.92, 'icons/favicon-32.png')
print('icone scritte')
