export const LEVELS = [
  { at: 0, name: 'Kapradinový háj', note: 'Kapradiny, cykasy a první kořeny.' },
  { at: 900, name: 'Říční břeh', note: 'Tůně, přesličky a stopy v bahně.' },
  { at: 1800, name: 'Záplavový les', note: 'Listnáče, mrtvé dřevo a kutálející se větev.' },
  { at: 3000, name: 'Jehličnatý háj', note: 'Stinné jehličnany, šištice a pohyblivý kámen.' },
  { at: 4500, name: 'Slunná niva', note: 'Otevřenější břehy, palmy a drobná fauna.' },
];
export const DETAILS = [
  ['mammal', 'Drobný savec'],
  ['lizard', 'Ještěrka'],
  ['amphibian', 'Obojživelník u vody'],
  ['fish', 'Ryby v tůni'],
  ['shells', 'Sladkovodní lastury'],
  ['seeds', 'Šištice a semena'],
  ['litter', 'Opadané listí'],
  ['deadwood', 'Duté mrtvé dřevo'],
  ['tracks', 'Tříprsté stopy v bahně'],
  ['sandbar', 'Říční náplav'],
];
export function levelAt(d) {
  let i = 0;
  for (let n = 1; n < LEVELS.length; n++) if (d >= LEVELS[n].at) i = n;
  return i;
}
const weights = [
  { fern: 1, cycad: 1, broadleaf: 0.6, palm: 0.45, conifer: 0.25, ginkgo: 0.4, horsetail: 0.4, pond: 0.2 },
  { fern: 0.65, horsetail: 1, pond: 1, palm: 0.6, conifer: 0.1, broadleaf: 0.3, ginkgo: 0.2, cycad: 0.3 },
  { fern: 0.85, broadleaf: 1, ginkgo: 0.8, conifer: 0.2, pond: 0.7, palm: 0.2, cycad: 0.5, horsetail: 0.7 },
  { fern: 0.7, conifer: 1, broadleaf: 0.2, ginkgo: 0.4, palm: 0.05, cycad: 0.4, horsetail: 0.2, pond: 0.15 },
  { fern: 0.4, palm: 1, broadleaf: 0.35, ginkgo: 0.2, conifer: 0.05, cycad: 0.7, horsetail: 1, pond: 1 },
];
export function sceneryWeight(kind, d) {
  const i = levelAt(d),
    a = weights[i][kind] ?? 0.8;
  if (!i) return a;
  const blend = Math.min(1, Math.max(0, (d - LEVELS[i].at) / 180));
  return (weights[i - 1][kind] ?? 0.8) * (1 - blend) + a * blend;
}
export function sceneryVisible(kind, d, index, options = {}) {
  if (options.fauna === false && ['turtle', 'croc', 'mammal', 'lizard', 'amphibian', 'fish'].includes(kind)) return false;
  const threshold = ((index * 73.73) % 100) / 100;
  return threshold < sceneryWeight(kind, d) * (options.density ?? 1);
}

export const DETAIL_UNLOCK = {
  mammal: 0,
  lizard: 450,
  amphibian: 900,
  fish: 900,
  shells: 900,
  seeds: 3000,
  litter: 0,
  deadwood: 1800,
  tracks: 450,
  sandbar: 900,
};
