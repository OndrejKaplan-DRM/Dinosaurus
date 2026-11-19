"""Vytvoří tři bezešvé textury 1024 × 1024 (ground, rock, wood) z filtrovaného šumu.
Bez cizích podkladů; výsledek je volné dílo (CC0 1.0). Stejný seed dá stejné soubory.
Spuštění: python3 tools/make-textures.py [cílová_složka]   (výchozí public/textures)
"""
import sys, os
import numpy as np
from PIL import Image

N = 1024
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'textures')

def noise(seed, beta=2.0, sx=1.0, sy=1.0):
    """Periodický šum se spektrem 1/f^beta; sx, sy protahují zrno v ose x, y."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((N, N)))
    ky = np.fft.fftfreq(N)[:, None] * sy
    kx = np.fft.fftfreq(N)[None, :] * sx
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1.0
    out = np.real(np.fft.ifft2(f / k ** (beta / 2)))
    out -= out.min()
    return out / out.max()

def ridged(a):
    return 1.0 - np.abs(a * 2.0 - 1.0)

def blobs(seed, count, rmin, rmax):
    """Řídké oblé skvrny (kamínky), přes okraj navazují."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:N, 0:N]
    out = np.zeros((N, N))
    for _ in range(count):
        cx, cy, r = rng.uniform(0, N), rng.uniform(0, N), rng.uniform(rmin, rmax)
        e = rng.uniform(0.6, 1.0)
        dx = (x - cx + N / 2) % N - N / 2
        dy = ((y - cy + N / 2) % N - N / 2) / e
        out = np.maximum(out, np.clip(1.0 - (dx * dx + dy * dy) / (r * r), 0, 1) * rng.uniform(0.5, 1.0))
    return out

def colour(height, dark, light, tint=None, tint_amount=0.0):
    h = np.clip(height, 0, 1)[..., None]
    rgb = np.array(dark)[None, None, :] * (1 - h) + np.array(light)[None, None, :] * h
    if tint is not None:
        rgb = rgb * (1 - tint_amount[..., None]) + np.array(tint)[None, None, :] * tint_amount[..., None]
    return rgb

# Průměr a rozptyl barev, na které jsou vyladěné materiály hry (změřeno na texturách verze 2.7).
TARGET = {'ground': ((159, 125, 67), (25, 23, 21)), 'rock': ((170, 121, 70), (27, 26, 28)), 'wood': ((204, 181, 150), (24, 25, 25))}

def save(name, rgb):
    mean, std = TARGET[name]
    rgb = (rgb - rgb.mean((0, 1))) / rgb.std((0, 1)) * np.array(std) + np.array(mean)
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    img.save(os.path.join(OUT, name + '.jpg'), quality=88, optimize=True)

# Půda: hrubé skvrny, jemné zrno, kamínky a tmavé drobky.
g = 0.55 * noise(11, 2.4) + 0.3 * noise(12, 1.2) + 0.15 * noise(13, 0.4)
peb = blobs(14, 260, 3, 11)
g = np.clip(g + 0.18 * peb - 0.25 * (noise(15, 0.2) > 0.86), 0, 1)
save('ground', colour(g, (88, 62, 38), (176, 138, 92), tint=(196, 184, 160), tint_amount=peb * 0.3))

# Skála: vrstvy, praskliny z hřebenového šumu, lišejníkové skvrny.
r = 0.6 * noise(21, 2.6) + 0.25 * noise(22, 1.4) + 0.15 * noise(23, 0.5)
cracks = np.clip((ridged(noise(24, 2.2)) - 0.93) / 0.07, 0, 1)
moss = np.clip((noise(25, 2.8) - 0.62) / 0.2, 0, 1) * 0.45
save('rock', colour(np.clip(r - 0.5 * cracks, 0, 1), (84, 80, 74), (176, 168, 152), tint=(112, 126, 88), tint_amount=moss))

# Dřevo a kůra: zrno protažené svisle, tmavé rýhy.
w = 0.55 * noise(31, 2.2, sx=0.7, sy=6.0) + 0.3 * noise(32, 1.4, sx=1.0, sy=10.0) + 0.15 * noise(33, 0.5)
grooves = np.clip((ridged(noise(34, 2.0, sx=0.5, sy=5.0)) - 0.9) / 0.1, 0, 1)
save('wood', colour(np.clip(w - 0.45 * grooves, 0, 1), (70, 46, 28), (164, 122, 80)))
print('Textury zapsány do', os.path.abspath(OUT))
