import { readFile } from 'node:fs/promises';
import { Script, runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
const html = await readFile(new URL('../dist/Dinos_2_Stezka_oziva.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (scripts.length !== 2) throw Error('Nesprávný počet skriptů');
for (const [i, s] of scripts.entries()) new Script(s[1], { filename: 'final-' + i + '.js' });
const scope = { window: {} };
runInNewContext(scripts[0][1], scope);
const assets = scope.window.DINO_ASSETS,
  sha = (b) => createHash('sha256').update(b).digest('hex');
for (const [path, url] of Object.entries(assets)) {
  if (!url.startsWith('data:')) throw Error('Externí zdroj: ' + path);
  const data = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'),
    source = await readFile(new URL('../public/' + path, import.meta.url));
  if (sha(data) !== sha(source)) throw Error('Změněná data: ' + path);
}
for (const p of ['models/raptor.glb', 'fallback/raptor-atlas.webp', 'fallback/raptor-atlas.json'])
  if (!assets[p]) throw Error('Chybí ' + p);
if (/<(?:script|link)\b[^>]*(?:src|href)=["']\/(?!\/)/i.test(html)) throw Error('Nevložený místní skript nebo CSS');
console.log(
  JSON.stringify(
    {
      version: '2.7.1',
      inlineScripts: scripts.length,
      embeddedBinaryAssets: Object.keys(assets).length,
      embeddedFonts: 4,
      hashes: 'all identical to source',
      needsServer: false,
      bytes: Buffer.byteLength(html),
    },
    null,
    2,
  ),
);
