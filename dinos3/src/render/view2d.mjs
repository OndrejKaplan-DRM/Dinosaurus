// Úsporné vykreslení (Canvas 2D) se stejným rozhraním jako view3d.mjs.
// Používá se, když prohlížeč nemá WebGL 2, když 3D selže za běhu, nebo na přání hráče.
import { CanvasScene } from './canvas-scene.mjs';

export async function createView2D({ canvas, asset, game, prefs }) {
  const scene = await new CanvasScene().init(canvas, asset);
  // Scéna čte jen příznak otřesů; předáme jí živý pohled do předvoleb.
  scene.settings = {
    get shake() {
      return prefs.shake && !prefs.reduced;
    },
  };
  return {
    kind: 'canvas2d',
    canvas,
    draw: (dt, wire = false) => scene.draw(game, dt, wire),
    resize: () => scene.resize(),
    onEvent: (e) => scene.event(e, game),
    step: () => scene.kickDust(game.x, 0, 2),
    get natureStats() {
      return scene.nature?.stats || null;
    },
    onContextLost() {},
    dispose() {},
  };
}
