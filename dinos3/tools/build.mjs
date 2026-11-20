import { build } from 'esbuild';
import { Script } from 'node:vm';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sfx = [
  'click',
  'back',
  'jump',
  'slide',
  'bite',
  'chomp',
  'wood',
  'crash',
  'thud',
  'amber',
  'shield',
  'step0',
  'step1',
  'step2',
  'jingle',
  'fail',
];
const songs = ['menu_a', 'menu_b', 'grove_a', 'grove_b', 'run_a', 'run_b', 'run_c', 'run_d'];
const files = [
  'models/raptor.glb',
  'fallback/raptor-atlas.webp',
  'fallback/raptor-atlas.json',
  ...['ground', 'rock', 'wood'].map((x) => 'textures/' + x + '.jpg'),
  ...sfx.map((x) => 'audio/' + x + '.mp3'),
  ...Array.from({ length: 6 }, (_, i) => 'audio/music/insect' + i + '.ogg'),
  ...songs.map((x) => 'music/' + x + '.ogg'),
];
const nature = JSON.parse(await readFile(resolve(root, 'public/nature/manifest.json'), 'utf8'));
if (nature.length !== 43) throw Error('Incomplete nature manifest');
files.push(
  'nature/manifest.json',
  'nature/atlas.json',
  'nature/scenery.webp',
  'nature/fauna.webp',
  ...nature.map((m) => 'nature/' + m.id + '.glb'),
);
const fonts = ['latin-500', 'latin-ext-500', 'latin-700', 'latin-ext-700'].map((x) => 'fonts/fredoka-' + x + '-normal.woff2');
const mime = {
  glb: 'model/gltf-binary',
  jpg: 'image/jpeg',
  png: 'image/png',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  woff2: 'font/woff2',
  webp: 'image/webp',
  json: 'application/json',
};
const assets = {};
for (const p of [...files, ...fonts]) {
  const b = await readFile(resolve(root, 'public', p));
  assets[p] = 'data:' + mime[p.split('.').pop()] + ';base64,' + b.toString('base64');
}
const compiled = await build({
  entryPoints: [resolve(root, 'src/app.mjs')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  define: { 'process.env.NODE_ENV': '"production"' },
});
let css = await readFile(resolve(root, 'src/style.css'), 'utf8');
css = css.replace(/url\('\/(.*?)'\)/g, (_, p) => 'url("' + assets[p] + '")');
let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="/src/style.css">', () => '<style>' + css + '</style>');
const fontless = Object.fromEntries(Object.entries(assets).filter(([p]) => !p.startsWith('fonts/')));
html = html.replace(
  '<script type="module" src="/src/app.mjs"></script>',
  () =>
    '<script>window.DINO_ASSETS=' +
    JSON.stringify(fontless) +
    ';</script><script>' +
    compiled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script') +
    '</script>',
);
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (inlineScripts.length !== 2) throw Error('Standalone must contain exactly two scripts');
for (const [i, m] of inlineScripts.entries()) new Script(m[1], { filename: 'standalone-' + i + '.js' });
await mkdir(resolve(root, 'dist'), { recursive: true });
const dest = resolve(root, 'dist/Dinos_3.html');
await writeFile(dest, html);
await writeFile(
  resolve(root, 'dist/asset-manifest.json'),
  JSON.stringify({ version: '3.0.0', assets: [...files, ...fonts], inline: true, bytes: (await stat(dest)).size }, null, 2),
);
console.log('Built', dest, (await stat(dest)).size, 'bytes; all', files.length + fonts.length, 'assets inline.');
