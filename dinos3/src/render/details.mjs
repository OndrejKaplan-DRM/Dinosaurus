import * as T from 'three';
import { DETAILS } from '../game/progression.mjs';
export const DETAIL_KINDS = DETAILS.map((x) => x[0]);
/** Generic groups documented for Hell Creek; silhouettes are not species reconstructions. */
export function detailMesh(kind) {
  const g = new T.Group(),
    mat = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.92 }),
    brown = mat('#73553c'),
    green = mat('#4b6743'),
    pale = mat('#c2b99a'),
    dark = mat('#302b23'),
    water = mat('#417e80');
  water.roughness = 0.2;
  const ell = (x, y, z, sx, sy, sz, m = brown) => {
    const o = new T.Mesh(new T.SphereGeometry(1, 10, 6), m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    g.add(o);
    return o;
  };
  const tube = (points, r, m = brown) => {
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))), 8, r, 6, false), m));
  };
  if (['mammal', 'lizard', 'amphibian'].includes(kind)) {
    const m = kind === 'mammal' ? brown : green;
    ell(0, 0.2, 0, 0.36, 0.18, 0.19, m);
    ell(0.34, 0.23, 0, 0.17, 0.12, 0.12, m);
    for (let i = 0; i < 4; i++) ell(i < 2 ? -0.2 : 0.2, 0.07, i % 2 ? 0.18 : -0.18, 0.12, 0.045, 0.08, m);
    if (kind !== 'amphibian')
      tube(
        [
          [-0.25, 0.18, 0],
          [-0.55, 0.1, 0.1],
          [-0.9, 0.06, 0.23],
        ],
        0.035,
        m,
      );
    if (kind === 'mammal') for (const z of [-0.09, 0.09]) ell(0.3, 0.34, z, 0.06, 0.08, 0.035, m);
    ell(0.41, 0.28, 0.09, 0.025, 0.025, 0.025, dark);
  }
  if (kind === 'fish') {
    ell(0, 0.02, 0, 1.5, 0.03, 1, water);
    for (let i = 0; i < 3; i++) {
      ell((i - 1) * 0.6, 0.075, Math.sin(i) * 0.35, 0.23, 0.035, 0.07, pale);
      const tail = ell((i - 1) * 0.6 - 0.23, 0.075, Math.sin(i) * 0.35, 0.08, 0.025, 0.13, pale);
      tail.rotation.y = 0.3;
    }
  }
  if (kind === 'shells')
    for (let i = 0; i < 12; i++) {
      const x = Math.sin(i * 5) * 0.8,
        z = Math.cos(i * 2) * 0.6;
      const shell = ell(x, 0.04, z, 0.12, 0.05, 0.09, pale);
      shell.rotation.y = i * 0.7;
    }
  if (kind === 'seeds')
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * 3) * 0.55,
        z = Math.cos(i * 3) * 0.45;
      ell(x, 0.13, z, 0.12, 0.21, 0.12, brown);
      for (let j = 0; j < 5; j++) ell(x, 0.05 + j * 0.05, z, 0.135, 0.015, 0.135, pale);
    }
  if (kind === 'litter')
    for (let i = 0; i < 26; i++) {
      const leaf = ell(Math.sin(i * 6) * 1.1, 0.025, Math.cos(i * 4) * 0.9, 0.14, 0.012, 0.07, i % 3 ? brown : green);
      leaf.rotation.y = i;
    }
  if (kind === 'deadwood') {
    const log = new T.Mesh(new T.CylinderGeometry(0.31, 0.39, 2.2, 12, 1, true), brown);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.35;
    g.add(log);
    for (const x of [-1.1, 1.1]) {
      const hole = new T.Mesh(new T.CircleGeometry(0.3, 12), dark);
      hole.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
      hole.position.set(x, 0.35, 0);
      g.add(hole);
    }
    tube(
      [
        [0, 0.5, 0],
        [0.2, 0.7, 0.2],
        [0.4, 0.9, 0.3],
      ],
      0.09,
    );
  }
  if (kind === 'tracks') {
    ell(0, 0.01, 0, 0.85, 0.02, 1.5, brown);
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? 0.24 : -0.24,
        z = -1 + i * 0.6;
      for (let j = -1; j <= 1; j++) {
        const toe = ell(x + j * 0.07, 0.035, z - 0.1, 0.035, 0.012, 0.16, dark);
        toe.rotation.y = j * 0.5;
      }
    }
  }
  if (kind === 'sandbar') {
    ell(0, 0.01, 0, 1.9, 0.08, 1.1, pale);
    for (let i = 0; i < 5; i++)
      tube(
        [
          [-1.3, 0.08, -0.7 + i * 0.3],
          [0, 0.11, -0.5 + i * 0.3],
          [1.3, 0.08, -0.7 + i * 0.3],
        ],
        0.013,
        brown,
      );
  }
  return g;
}
export function detailSprite(kind) {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 250;
  const g = c.getContext('2d'),
    ellipse = (x, y, rx, ry, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    },
    line = (p, col, width) => {
      g.strokeStyle = col;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
  if (['mammal', 'lizard', 'amphibian'].includes(kind)) {
    const col = kind === 'mammal' ? '#836044' : '#657a47';
    if (kind !== 'amphibian')
      line(
        [
          [140, 175],
          [80, 191],
          [25, 210],
        ],
        col,
        12,
      );
    for (let i = 0; i < 4; i++) ellipse(150 + (i % 2) * 100, 190 + (i % 2) * 10, 25, 11, col);
    ellipse(200, 170, 80, 34, col);
    ellipse(290, 153, 38, 24, col);
    if (kind === 'mammal') {
      ellipse(273, 126, 10, 18, col);
      ellipse(296, 128, 9, 15, col);
    }
    ellipse(304, 149, 4, 4, '#171c17');
  }
  if (kind === 'fish') {
    ellipse(200, 180, 192, 60, '#3e797b');
    for (let i = 0; i < 3; i++) {
      const x = 90 + i * 105,
        y = 155 + (i % 2) * 30;
      ellipse(x, y, 35, 8, '#acbfa4');
      g.fillStyle = '#a0af95';
      g.beginPath();
      g.moveTo(x - 28, y);
      g.lineTo(x - 50, y - 13);
      g.lineTo(x - 50, y + 13);
      g.fill();
    }
  }
  if (kind === 'shells' || kind === 'seeds' || kind === 'litter') {
    for (let i = 0; i < (kind === 'litter' ? 36 : 14); i++) {
      const x = 30 + ((i * 83) % 340),
        y = 120 + ((i * 61) % 110);
      ellipse(x, y, kind === 'seeds' ? 11 : 17, kind === 'seeds' ? 22 : 8, kind === 'shells' ? '#c8bfa3' : i % 3 ? '#9b8150' : '#586c36');
      if (kind === 'shells') {
        g.strokeStyle = '#7d7763';
        g.beginPath();
        g.arc(x, y, 8, Math.PI, Math.PI * 2);
        g.stroke();
      }
    }
  }
  if (kind === 'deadwood') {
    line(
      [
        [75, 174],
        [330, 167],
      ],
      '#776044',
      72,
    );
    line(
      [
        [95, 155],
        [315, 148],
      ],
      '#aa8b59',
      9,
    );
    ellipse(75, 174, 29, 38, '#b29464');
    ellipse(75, 174, 20, 28, '#302c22');
    line(
      [
        [210, 148],
        [240, 90],
        [280, 66],
      ],
      '#776044',
      16,
    );
  }
  if (kind === 'tracks' || kind === 'sandbar') {
    ellipse(200, 176, 190, 63, kind === 'tracks' ? '#716650' : '#b8b087');
    for (let i = 0; i < 5; i++) {
      if (kind === 'sandbar')
        line(
          [
            [60, 140 + i * 16],
            [190, 132 + i * 16],
            [342, 144 + i * 16],
          ],
          '#928a66',
          2,
        );
      else {
        const x = 80 + i * 55,
          y = 170 + (i % 2) * 30;
        for (let j = -1; j <= 1; j++)
          line(
            [
              [x, y],
              [x + j * 15, y - 24],
            ],
            '#403d2c',
            6,
          );
      }
    }
  }
  return c;
}
