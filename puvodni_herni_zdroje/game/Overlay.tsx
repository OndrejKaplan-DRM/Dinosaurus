import { useEffect, useState, useSyncExternalStore } from "react";
import { playSfx, unlockAudio } from "@/game/audio";
import { pressVirtual, setKeyAction } from "@/game/input";
import { getHud, subscribeHud, beginRun, pauseRun, resumeRun, toMenu, resetBest, sim } from "@/game/sim";
import { patchSettings, settings, subscribeSettings, type Difficulty, type TouchMode } from "@/game/settings";

function useHud() {
  return useSyncExternalStore(subscribeHud, getHud, getHud);
}

function useSettings() {
  return useSyncExternalStore(subscribeSettings, () => settings, () => settings);
}

function useShowTouch(mode: TouchMode) {
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setAuto(mq.matches || window.innerWidth < 860);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  if (mode === "on") return true;
  if (mode === "off") return false;
  return auto;
}

export function Overlay() {
  const hud = useHud();
  const pref = useSettings();
  const showTouch = useShowTouch(pref.touch);
  const [panel, setPanel] = useState(false);
  const [armReset, setArmReset] = useState(false);

  useEffect(() => {
    setKeyAction((code) => {
      unlockAudio();
      if (code === "Escape") {
        if (panel) {
          setPanel(false);
          playSfx("back", { rate: 1, vol: 0.8 });
          return;
        }
        if (sim.phase === "playing") pauseRun();
        else if (sim.phase === "paused") resumeRun();
        return;
      }
      if (panel) return;
      if (code !== "Space" && code !== "Enter") return;
      if (sim.phase === "menu" || sim.phase === "dead") beginRun();
      else if (sim.phase === "paused") resumeRun();
    });
    return () => setKeyAction(null);
  }, [panel]);

  const openSettings = () => {
    unlockAudio();
    playSfx("click", { rate: 1, vol: 0.8 });
    if (sim.phase === "playing") pauseRun();
    setPanel(true);
    setArmReset(false);
  };

  const pads = showTouch && hud.phase === "playing" && !panel;

  return (
    <>
      <div className={hud.phase === "playing" ? "vignette live" : hud.phase === "menu" ? "vignette menu" : "vignette"} />
      <div className="flash" style={{ opacity: Math.min(0.45, hud.flash) }} />
      <div className="overlay">
        {hud.phase === "menu" && !panel && (
          <>
            <header className="topbar">
              <p className="eyebrow">Pravěká arkáda</p>
            </header>
            <div className="best-chip">
              <div className="stat-label">Rekord</div>
              <div className="stat-value">{hud.best.toLocaleString("cs-CZ")}</div>
            </div>
            <section className="panel">
              <p>Dinoš. Tři pruhy, žádná brzda. Kameny přeskoč, kmeny podjeď, bedny a kořist rozkousej.</p>
              <div className="keys">
                <span><b>← →</b> pruh</span>
                <span><b>↑</b> skok</span>
                <span><b>↓</b> skluz</span>
                <span><b>mezerník</b> kousnutí</span>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    unlockAudio();
                    playSfx("click", { rate: 1, vol: 0.7 });
                    beginRun();
                  }}
                >
                  Běž
                </button>
                <button type="button" className="btn btn-ghost" onClick={openSettings}>
                  Nastavení
                </button>
              </div>
            </section>
          </>
        )}

        {hud.phase === "playing" && !panel && (
          <>
            <div className="hud-card hud-dist">
              <div className="stat-label">Metry</div>
              <div className="stat-value">{hud.distance.toLocaleString("cs-CZ")}</div>
            </div>
            <div className="hud-card hud-score">
              <div className="stat-label">Skóre</div>
              <div className="stat-value">{hud.score.toLocaleString("cs-CZ")}</div>
            </div>
            <button type="button" className="pause-btn btn btn-ghost" onClick={() => { unlockAudio(); pauseRun(); }}>
              Pauza
            </button>
            {hud.combo > 1 && <div className="combo">×{hud.combo}</div>}
            {hud.shields > 0 && <div className="shields">ŠTÍT</div>}
            {hud.distance < 40 && !showTouch && (
              <div className="hint">← → pruh · ↑ skok · ↓ skluz · mezerník kousnutí</div>
            )}
          </>
        )}

        {(hud.phase === "paused" || (panel && hud.phase !== "menu")) && !panel && (
          <section className="panel center-panel">
            <h2 className="wordmark wordmark-md">Pauza</h2>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => { unlockAudio(); resumeRun(); }}>
                Pokračovat
              </button>
              <button type="button" className="btn" onClick={openSettings}>
                Nastavení
              </button>
            </div>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => { unlockAudio(); playSfx("confirm", { rate: 1 }); beginRun(); }}>
                Znovu
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { unlockAudio(); playSfx("back", { rate: 1 }); setPanel(false); toMenu(); }}>
                Menu
              </button>
            </div>
          </section>
        )}

        {hud.phase === "dead" && !panel && (
          <section className="panel center-panel">
            <p className="eyebrow">Konec běhu</p>
            <h2 className="wordmark wordmark-md">{hud.isRecord ? "Rekord" : "Náraz"}</h2>
            <p className="fail-note">Jen sis nabil hubu. Nikdo tě nesežral.</p>
            <div className="stats">
              <div>
                <div className="stat-label">Metry</div>
                <div className="stat-value">{hud.distance.toLocaleString("cs-CZ")}</div>
              </div>
              <div>
                <div className="stat-label">Skóre</div>
                <div className="stat-value">{hud.score.toLocaleString("cs-CZ")}</div>
              </div>
              <div>
                <div className="stat-label">Jantar</div>
                <div className="stat-value">{hud.amber}</div>
              </div>
              <div>
                <div className="stat-label">Kousnutí</div>
                <div className="stat-value">{hud.chomps}</div>
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => { unlockAudio(); beginRun(); }}>
                Ještě jednou
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { unlockAudio(); playSfx("back", { rate: 1 }); toMenu(); }}>
                Menu
              </button>
            </div>
          </section>
        )}

        {panel && (
          <section className="panel center-panel">
            <h2 className="wordmark wordmark-md">Nastavení</h2>
            <label className="field">
              <span>Hlasitost <b>{Math.round(pref.master * 100)}</b></span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(pref.master * 100)}
                onChange={(e) => patchSettings({ master: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="field">
              <span>Hudba <b>{Math.round(pref.music * 100)}</b></span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(pref.music * 100)}
                onChange={(e) => patchSettings({ music: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="field">
              <span>Efekty <b>{Math.round(pref.sfx * 100)}</b></span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(pref.sfx * 100)}
                onChange={(e) => patchSettings({ sfx: Number(e.target.value) / 100 })}
              />
            </label>
            <div className="field">
              <span>Tempo</span>
              <div className="seg">
                {(["klid", "lov", "dravec"] as Difficulty[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={pref.difficulty === id}
                    onClick={() => {
                      unlockAudio();
                      playSfx("toggle", { rate: 1, vol: 0.7 });
                      patchSettings({ difficulty: id });
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Dotyk</span>
              <div className="seg">
                {(["auto", "on", "off"] as TouchMode[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={pref.touch === id}
                    onClick={() => {
                      playSfx("toggle", { rate: 1, vol: 0.7 });
                      patchSettings({ touch: id });
                    }}
                  >
                    {id === "auto" ? "auto" : id === "on" ? "zap" : "vyp"}
                  </button>
                ))}
              </div>
            </div>
            <label className="toggle">
              Otřesy
              <input
                type="checkbox"
                checked={pref.shake}
                onChange={(e) => patchSettings({ shake: e.target.checked })}
              />
            </label>
            <label className="toggle">
              Stíny
              <input
                type="checkbox"
                checked={pref.shadows}
                onChange={(e) => patchSettings({ shadows: e.target.checked })}
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (!armReset) {
                  setArmReset(true);
                  return;
                }
                resetBest();
                setArmReset(false);
                playSfx("back", { rate: 1 });
              }}
            >
              {armReset ? "Opravdu smazat" : "Smazat rekord"}
            </button>
            <p className="credit">Zvuky: Kenney, háj a hmyz, CC0. Model raptořice je tvůj.</p>
            <button
              type="button"
              className="btn btn-primary btn-wide"
              onClick={() => {
                playSfx("back", { rate: 1, vol: 0.8 });
                setPanel(false);
              }}
            >
              Zpět
            </button>
          </section>
        )}

        <div className="toasts">
          {hud.toasts.map((t) => (
            <div key={t.id} className="toast">
              {t.text}
            </div>
          ))}
        </div>
      </div>
      {pads && (
        <div className="pads">
          <div className="pad-cluster">
            <Hold code="ArrowLeft">←</Hold>
            <Hold code="ArrowDown">↓</Hold>
            <Hold code="ArrowUp">↑</Hold>
            <Hold code="ArrowRight">→</Hold>
          </div>
          <Hold code="Space" bite>
            KOUS
          </Hold>
        </div>
      )}
    </>
  );
}

function Hold({ code, children, bite = false }: { code: string; children: string; bite?: boolean }) {
  return (
    <button
      type="button"
      className={bite ? "pad bite" : "pad"}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        pressVirtual(code, true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={() => pressVirtual(code, false)}
      onPointerCancel={() => pressVirtual(code, false)}
    >
      {children}
    </button>
  );
}
