const down = new Set<string>();
let qa: Set<string> | null = null;
let onAction: ((code: string) => void) | null = null;

const NAV = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);

export type Held = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  bite: boolean;
};

const prev: Held = { left: false, right: false, up: false, down: false, bite: false };

function isDown(code: string) {
  if (qa) return qa.has(code);
  return down.has(code);
}

export function heldNow(): Held {
  return {
    left: isDown("ArrowLeft") || isDown("KeyA"),
    right: isDown("ArrowRight") || isDown("KeyD"),
    up: isDown("ArrowUp") || isDown("KeyW"),
    down: isDown("ArrowDown") || isDown("KeyS"),
    bite: isDown("Space"),
  };
}

export function sampleInput(): { held: Held; pressed: Held; released: Held } {
  const held = heldNow();
  const pressed = {
    left: held.left && !prev.left,
    right: held.right && !prev.right,
    up: held.up && !prev.up,
    down: held.down && !prev.down,
    bite: held.bite && !prev.bite,
  };
  const released = {
    left: !held.left && prev.left,
    right: !held.right && prev.right,
    up: !held.up && prev.up,
    down: !held.down && prev.down,
    bite: !held.bite && prev.bite,
  };
  prev.left = held.left;
  prev.right = held.right;
  prev.up = held.up;
  prev.down = held.down;
  prev.bite = held.bite;
  return { held, pressed, released };
}

export function primeInput() {
  const held = heldNow();
  prev.left = held.left;
  prev.right = held.right;
  prev.up = held.up;
  prev.down = held.down;
  prev.bite = held.bite;
}

export function setQa(codes: string[] | null) {
  qa = codes ? new Set(codes) : null;
}

export function setKeyAction(fn: ((code: string) => void) | null) {
  onAction = fn;
}

export function pressVirtual(code: string, on: boolean) {
  if (on) down.add(code);
  else down.delete(code);
}

export function installInput() {
  const kd = (e: KeyboardEvent) => {
    if (NAV.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    onAction?.(e.code);
  };
  const ku = (e: KeyboardEvent) => {
    down.delete(e.code);
  };
  const blur = () => down.clear();
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", blur);
    down.clear();
  };
}
