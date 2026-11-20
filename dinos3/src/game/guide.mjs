// Průvodce prvky trati: jedna tabulka pro nápovědu, rady ve hře i vývojářský výběr.
export const GUIDE = [
  { kind: 'amber', name: 'Jantar', how: 'seber', hint: '◆  Posbírej jantar', from: 0, note: 'Plní zásobu a rozdmýchává lovecký trans.' },
  { kind: 'shield', name: 'Štít', how: 'seber', hint: '◇  Ochranný štít', from: 0, note: 'Jednou tě zachrání.' },
  { kind: 'rock', name: 'Kámen', how: 'přeskoč', hint: '↑  Přeskoč kámen', from: 0 },
  { kind: 'log', name: 'Nízký kmen', how: 'podlez', hint: '↓  Podlez kmen', from: 0 },
  { kind: 'wood', name: 'Suchá větev', how: 'rozkousni', hint: 'MEZERNÍK  •  Křupni větev', from: 0 },
  { kind: 'snack', name: 'Kořist', how: 'rozkousni', hint: 'MEZERNÍK  •  Kořist', from: 0 },
  { kind: 'thorn', name: 'Trní', how: 'oběhni', hint: '← →  Vyhni se trní', from: 150 },
  { kind: 'root', name: 'Kořeny', how: 'přeskoč', hint: '↑  Přeskoč kořeny', from: 450 },
  { kind: 'pool', name: 'Brod', how: 'přeskoč', hint: '↑  Přeskoč vodu a zachovej kombo', from: 900, note: 'Neublíží, jen smaže kombo. Za deště stojí louže všude.' },
  { kind: 'rollingWood', name: 'Kutálející se větev', how: 'přeskoč', hint: '↑  Přeskoč kutálející se větev', from: 1800 },
  { kind: 'rollingRock', name: 'Pohyblivý kámen', how: 'přeskoč', hint: '↑  Přeskoč pohyblivý kámen', from: 3000 },
];
export const HINTS = Object.fromEntries(GUIDE.map((g) => [g.kind, g.hint]));
export const KIND_NAMES = Object.fromEntries(GUIDE.map((g) => [g.kind, g.name]));
export const DIFFICULTY_NAMES = { klid: 'Pohoda', lov: 'Výprava', dravec: 'Dravec' };
