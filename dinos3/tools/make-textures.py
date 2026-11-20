"""Tři textury hry 512 × 512, všechny z volných podkladů (CC0).

wood.jpg   kůra z balíku Quaternius „Stylized Nature MegaKit“ (Bark_NormalTree.png)
rock.jpg   skála z téhož balíku (Rocks_Diffuse.png)
ground.jpg vlastní malovaná půda: plošky Voroného diagramu, bezešvá, pevný seed

Barvy se dorovnají na průměr a kontrast, na které jsou vyladěné materiály hry.
Spuštění: python3 tools/make-textures.py   (čte ../asset_sources, píše public/textures)
"""
import glob, os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'textures')
SRC = os.path.join(HERE, '..', '..', 'asset_sources')
N = 512
# (průměr RGB, rozptyl RGB, síla dorovnání barvy 0–1)
TARGET = {'ground': ((159, 125, 67), (15, 14, 12), 1.0), 'rock': ((150, 132, 104), (27, 26, 26), 1.0), 'wood': ((204, 181, 150), (24, 25, 25), 1.0)}

def match(rgb, name):
    mean, std, k = TARGET[name]
    out = (rgb - rgb.mean((0, 1))) / (rgb.std((0, 1)) + 1e-6) * np.array(std) + np.array(mean)
    return rgb * (1 - k) + out * k

def save(name, rgb):
    Image.fromarray(np.clip(match(rgb, name), 0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, name + '.jpg'), quality=86, optimize=True)

def source(file):
    path = glob.glob(os.path.join(SRC, '**', file), recursive=True)[0]
    return np.asarray(Image.open(path).convert('RGB').resize((N, N), Image.LANCZOS)).astype(float)

def painted_ground(seed=7, cells=900):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, N, (cells, 2))
    tone = rng.uniform(0, 1, cells)
    y, x = np.mgrid[0:N, 0:N].astype(np.float32)
    d1 = np.full((N, N), 1e9, np.float32); d2 = d1.copy(); idx = np.zeros((N, N), np.int32)
    for i, (px, py) in enumerate(pts):
        dx = (x - px + N / 2) % N - N / 2
        dy = ((y - py + N / 2) % N - N / 2) * 1.35  # plošky protažené ve směru běhu
        d = dx * dx + dy * dy
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d)); idx = np.where(closer, i, idx); d1 = np.where(closer, d, d1)
    edge = np.clip((np.sqrt(d2) - np.sqrt(d1)) / 3.0, 0, 1)          # tmavší spáry mezi ploškami
    h = tone[idx] * 0.75 + 0.25 * edge
    pebble = (tone[idx] > 0.93) * edge                                 # světlé kamínky
    dark, light, stone = np.array((104, 74, 44.)), np.array((178, 140, 92.)), np.array((205, 196, 172.))
    rgb = dark + (light - dark) * h[..., None]
    rgb = rgb * (1 - 0.7 * pebble[..., None]) + stone * 0.7 * pebble[..., None]
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    # Rozmazání přes okraj: dlaždici zopakujeme 3 × 3, rozmažeme a vyřízneme střed.
    big = Image.new('RGB', (3 * N, 3 * N))
    for a in range(3):
        for b in range(3): big.paste(img, (a * N, b * N))
    return np.asarray(big.filter(ImageFilter.GaussianBlur(1.0)).crop((N, N, 2 * N, 2 * N))).astype(float)

os.makedirs(OUT, exist_ok=True)
save('wood', source('Bark_NormalTree.png'))
save('rock', source('Rocks_Diffuse.png'))
save('ground', painted_ground())
print('Textury zapsány:', {f: os.path.getsize(os.path.join(OUT, f)) for f in sorted(os.listdir(OUT))})
