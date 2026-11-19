import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createCanvas, Image, Path2D } from '@napi-rs/canvas';
import { CanvasScene } from '../src/render/canvas-scene.mjs';
import { Runner } from '../src/game/core.mjs';
import { Grove } from '../src/game/grove.mjs';
import { Environment } from '../src/game/environment.mjs';
// Exact embedded assets from the final standalone HTML, without a browser or GPU.
const html = await readFile(new URL('../dist/Dinos_2_Stezka_oziva.html', import.meta.url), 'utf8'),
  inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)],
  scope = { window: {} };
runInNewContext(inline[0][1], scope);
const assets = scope.window.DINO_ASSETS;
globalThis.Image = Image;
globalThis.Path2D = Path2D;
globalThis.window = { devicePixelRatio: 1 };
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;
globalThis.document = { createElement: () => createCanvas(1, 1) };
const c = createCanvas(1280, 800),
  view = await new CanvasScene().init(c, (p) => assets[p]),
  s = new Runner();
s.environment = new Environment(27);
for (let i = 0; i < 100; i++) s.environment.tick(0.1, { weather: 'clear', daylight: 'noon' });
s.environment.options = { hour: 12 };
s.grove = new Grove();
s.grove.enter();
s.time = 8;
s.environment.elapsed = 8;
s.phase = 'menu';
await mkdir(new URL('../../ukazky/', import.meta.url), { recursive: true });
for (const [name, distance] of [
  ['haj', 0],
  ['ricni_breh', 1100],
  ['jehlicnany', 3300],
  ['niva', 4800],
]) {
  s.phase = distance ? 'playing' : 'menu';
  s.distance = s.world = distance;
  s.objects = [];
  if (distance) {
    s.spawn('rock', -1, -20);
    s.spawn('wood', 1, -12);
  }
  view.draw(s, 0);
  await writeFile(new URL('../../ukazky/' + name + '.png', import.meta.url), c.toBuffer('image/png'));
}
console.log('Embedded assets:', Object.keys(assets).length, 'models', view.nature.stats.models, 'four scenes rendered');
