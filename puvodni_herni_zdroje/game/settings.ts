export type Difficulty = "klid" | "lov" | "dravec";
export type TouchMode = "auto" | "on" | "off";

export type Settings = {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  shadows: boolean;
  difficulty: Difficulty;
  touch: TouchMode;
};

const KEY = "drap-settings-v1";

const fallback: Settings = {
  master: 0.85,
  music: 0.55,
  sfx: 0.9,
  shake: true,
  shadows: true,
  difficulty: "lov",
  touch: "auto",
};

function load(): Settings {
  if (typeof window === "undefined") return { ...fallback };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

export let settings: Settings = load();

const listeners = new Set<() => void>();

export function patchSettings(partial: Partial<Settings>) {
  settings = { ...settings, ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function paceOf(difficulty = settings.difficulty) {
  if (difficulty === "klid") return 0.84;
  if (difficulty === "dravec") return 1.14;
  return 1;
}
