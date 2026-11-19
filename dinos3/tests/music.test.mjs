import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicPlayer, TRACKS } from '../src/audio/music.mjs';
class Clock {
  constructor() {
    this.currentTime = 0;
    this.sources = [];
    this.peak = 0;
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} },
      connect() {},
      disconnect() {},
    };
  }
  createBufferSource() {
    const c = this,
      s = {
        connected: false,
        startAt: Infinity,
        stopAt: Infinity,
        connect() {
          this.connected = true;
        },
        disconnect() {
          this.connected = false;
        },
        start(at) {
          this.startAt = at;
          this.endAt = at + this.buffer.duration;
          c.measure();
        },
        stop(at = c.currentTime) {
          this.stopAt = at;
        },
      };
    this.sources.push(s);
    return s;
  }
  measure() {
    const count = this.sources.filter(
      (s) => s.connected && s.startAt <= this.currentTime && Math.min(s.stopAt, s.endAt) > this.currentTime,
    ).length;
    this.peak = Math.max(this.peak, count);
    assert.ok(count <= 1, 'two music sources became audible at once');
  }
  advance(dt) {
    this.currentTime += dt;
    this.measure();
  }
}
function setup() {
  const c = new Clock(),
    buffers = new Map(Object.keys(TRACKS).map((n) => [n, { duration: 35 }]));
  return { c, buffers, p: new MusicPlayer(c, {}, (n) => buffers.get(n), { rng: () => 0 }) };
}
test('short recordings finish naturally and never restart over themselves', () => {
  const { c, p } = setup();
  p.request('shield');
  for (let i = 0; i < 349; i++) {
    p.request('shield');
    p.update();
    c.advance(0.1);
  }
  assert.equal(p.starts, 1);
  c.advance(0.2);
  p.update();
  assert.equal(p.starts, 2);
  assert.equal(c.peak, 1);
  assert.ok(c.sources.every((s) => s.loop === false));
});
test('rapid menu/pause/run/shield changes never overlap music sources', () => {
  const { c, p } = setup(),
    cues = ['menu', 'start', 'run', 'shield', 'pause', 'peril', 'rush'];
  for (let i = 0; i < 4000; i++) {
    p.request(cues[(i * 7 + Math.floor(i / 3)) % 7]);
    p.update();
    c.measure();
    c.advance(i % 23 === 0 ? 1.5 : 0.017);
  }
  assert.ok(p.starts > 20);
  assert.equal(c.peak, 1);
  assert.ok(c.sources.filter((s) => s.connected).length <= 1);
});
test('rapid requests keep the original fade deadline and choose the latest cue', () => {
  const { c, p } = setup();
  p.update();
  c.advance(1);
  p.request('run');
  p.update();
  const stop = p.current.stopAt;
  c.advance(0.12);
  p.request('shield');
  p.update();
  assert.equal(p.current.stopAt, stop);
  c.advance(0.6);
  p.update();
  assert.ok(p.song.startsWith('run_'));
  assert.equal(p.activeCount, 1);
});
test('a missing decode cannot create a stale asynchronously started song', () => {
  const { c, p, buffers } = setup();
  p.update();
  for (const n of ['run_a', 'run_b', 'run_c', 'run_d', 'grove_a', 'grove_b']) buffers.delete(n);
  p.request('shield');
  p.update();
  assert.ok(p.song.startsWith('menu'));
  p.request('pause');
  c.advance(1);
  p.update();
  buffers.set('run_a', { duration: 35 });
  c.advance(0.3);
  p.update();
  assert.ok(p.song.startsWith('menu_'));
  assert.equal(c.peak, 1);
});
test('an old ended callback cannot clear or disconnect the new voice', () => {
  const { c, p } = setup();
  p.update();
  const ended = p.current.source.onended;
  p.request('run');
  p.update();
  c.advance(0.7);
  p.update();
  const next = p.current;
  ended();
  assert.equal(p.current, next);
  assert.ok(next.source.connected);
});
test('long suspension or throttled frames cannot stack missed music changes', () => {
  const { c, p } = setup();
  p.update();
  c.advance(600);
  p.request('rush');
  p.update();
  assert.equal(p.starts, 2);
  assert.equal(c.peak, 1);
  assert.equal(p.activeCount, 1);
});

test('start, run, rush, shield and pause preserve a playing exploration song', () => {
  const { c, p } = setup();
  p.request('start');
  p.update();
  const voice = p.current;
  for (const cue of ['run', 'rush', 'shield', 'pause', 'run', 'peril', 'run']) {
    c.advance(0.5);
    p.request(cue);
    p.update();
    assert.equal(p.current, voice);
  }
  assert.equal(p.starts, 1);
});
test('all four exploration variants play before any repeats', () => {
  const { c, p } = setup();
  p.request('run');
  const heard = [];
  for (let i = 0; i < 4; i++) {
    p.update();
    heard.push(p.song);
    c.advance(36);
  }
  assert.equal(new Set(heard).size, 4);
});
test('entering the grove transitions to its expanded playlist without overlap', () => {
  const { c, p } = setup();
  p.update();
  p.request('grove');
  p.update();
  c.advance(0.7);
  p.update();
  assert.ok(['run_a', 'run_b', 'run_c', 'run_d', 'grove_a', 'grove_b'].includes(p.song));
  assert.equal(c.peak, 1);
});

test('ten minutes of a long-song run rotates through all six eligible songs without overlap', () => {
  const { c, p, buffers } = setup();
  for (const name of buffers.keys()) buffers.set(name, { duration: 240 });
  p.request('run');
  const heard = [];
  let prev = 0;
  for (let sec = 0; sec < 600; sec++) {
    p.update();
    if (p.starts !== prev) {
      heard.push(p.song);
      prev = p.starts;
    }
    c.advance(1);
  }
  assert.ok(heard.length >= 6);
  assert.equal(new Set(heard.slice(0, 6)).size, 6);
  assert.ok(heard.includes('grove_a') && heard.includes('grove_b'));
  assert.equal(c.peak, 1);
  assert.ok(c.sources.every((s) => s.stopAt - s.startAt <= 95));
});
test('manual next fades once and repeated clicks do not postpone the change', () => {
  const { c, p, buffers } = setup();
  for (const name of buffers.keys()) buffers.set(name, { duration: 240 });
  p.update();
  const first = p.song;
  c.advance(2);
  p.next();
  p.update();
  const stop = p.current.stopAt;
  for (let i = 0; i < 5; i++) {
    p.next();
    p.update();
    assert.equal(p.current.stopAt, stop);
    c.advance(0.05);
  }
  c.advance(0.7);
  p.update();
  assert.notEqual(p.song, first);
  assert.equal(p.starts, 2);
  assert.equal(c.peak, 1);
});
test('menu reaches both Night Menu and both Lazy Grove recordings before repeating', () => {
  const { c, p } = setup();
  const heard = [];
  for (let i = 0; i < 4; i++) {
    p.update();
    heard.push(p.song);
    c.advance(36);
  }
  assert.deepEqual(new Set(heard), new Set(['menu_a', 'menu_b', 'grove_a', 'grove_b']));
});

test('developer can audition every supplied track through the same single-voice player', () => {
  const { c, p } = setup();
  p.request('run');
  p.update();
  for (const name of Object.keys(TRACKS)) {
    p.choose(name);
    p.update();
    c.advance(0.8);
    p.update();
    assert.equal(p.song, name);
    const v = p.current;
    c.advance(0.1);
    p.request('run');
    p.update();
    assert.equal(p.current, v);
    assert.equal(c.peak, 1);
  }
});
test('manual song waits for its decode and cannot stack sources or extend a fade', () => {
  const { c, p, buffers } = setup();
  p.update();
  buffers.delete('run_d');
  p.choose('run_d');
  p.update();
  assert.equal(p.song, 'menu_a');
  buffers.set('run_d', { duration: 240 });
  p.update();
  const stop = p.current.stopAt;
  c.advance(0.2);
  p.choose('run_c');
  p.update();
  assert.equal(p.current.stopAt, stop);
  c.advance(0.5);
  p.update();
  assert.equal(p.song, 'run_c');
  assert.equal(c.peak, 1);
});
test('auditioning the current song leaves no stuck skip request', () => {
  const { c, p } = setup();
  p.update();
  const v = p.current;
  p.choose(p.song);
  p.update();
  assert.equal(p.current, v);
  assert.equal(p.requested, null);
  assert.equal(p.skipRequested, false);
  p.next();
  p.update();
  c.advance(0.7);
  p.update();
  assert.notEqual(p.current, v);
  assert.equal(c.peak, 1);
});
