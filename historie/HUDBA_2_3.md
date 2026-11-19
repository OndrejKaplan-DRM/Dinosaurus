# Dinoš 2.3 — hudba ze Suno

Integrovaných všech osm dodaných nahrávek, celkem 1 070,76 s (17 min 51 s). Původní MP3 nejsou upravené; jejich kopie jsou v `suno_originaly/`. Používané herní soubory jsou OGG ve `zdroje/public/music/` a vložené přímo v HTML.

| Dodaný soubor | Herní soubor | Použití |
| --- | --- | --- |
| Night Menu.mp3 | menu_a.ogg | Hlavní menu |
| Night Menu (1).mp3 | menu_b.ogg | Druhá varianta menu |
| Lazy Prehistoric Grove.mp3 | grove_a.ogg | Volný háj, dlouhá pauza |
| Lazy Prehistoric Grove (1).mp3 | grove_b.ogg | Druhá varianta háje |
| Agile Exploration.mp3 | run_a.ogg | Stezka |
| Agile Exploration (1).mp3 | run_b.ogg | Stezka |
| Agile Exploration (2).mp3 | run_c.ogg | Stezka |
| Agile Exploration (3).mp3 | run_d.ogg | Stezka |

Zařazení vychází z dodaných tematických skupin. Technicky změřena hlasitost, délka a špičky všech nahrávek. Neprohlašuji subjektivní poslech, který zde nebyl dostupný.

## Hudební režie

- Menu a háj mají vlastní dvojice skladeb. Přechod nejdřív 0,65 s ztišuje starý zdroj a pak 1,2 s rozehrává nový. Souběžně nezní dva hudební zdroje.
- Běh má čtyři varianty se střídáním bez opakování, dokud se nevyčerpá dostupná sada. Stopy se přehrávají celé a od začátku.
- Start, běh, štít a zrychlení tvoří souvislý hudební celek. Nemění se rychlost ani výška tónu, nevkládá se další hudební smyčka. Zrychlení mírně zdůrazní podkres.
- Pauza a konec běhu nechají aktuální skladbu pokračovat ztišenou. Pokud dohraje, nastoupí klidná skladba z háje. Krátká pauza tedy nerozbije hudební frázi a návrat pokračuje bez restartu stejné skladby.
- Výrazné efekty (náraz, štít, rozkousnutí) krátce sníží hudbu na 65 % její aktuální úrovně; návrat je plynulý.
- Hlasitost hudby lze dál upravovat nezávisle na přírodě a efektech. Zobrazuje se název skladby; při vypnutí hudby zmizí.

## Zpracování a obnova

Dvouprůchodová normalizace FFmpeg na −20 LUFS, limit true peak −2 dBTP, stereo Vorbis q4/44,1 kHz. Po opětovném změření OGG: −20,04 až −19,99 LUFS; maximální naměřený true peak −6,54 dBTP. Celé skladby bez stříhání. Podrobné hodnoty, délky a SHA256 původních MP3 jsou v `SUNO_AUDIO_ANALYZA.json`.

Reprodukce převodu s nainstalovaným FFmpeg: ze složky zdroje spusť `python3 tools/prepare-music.py ../suno_originaly`. Pak `npm ci`, `npm test`, `npm run build` a `node tools/validate-build.mjs`.

Hudba pochází z uživatelem dodaných výstupů Suno. Není označená jako CC0 ani jako původní procedurální hudba. Práva k dodaným nahrávkám zůstávají podle jejich skutečných licencí.

## Kontrola

45 automatických testů prošlo včetně souběhu hudebních zdrojů, rychlých změn situace, zachování skladby při pauze/štítu/zrychlení a vystřídání čtyř běhových variant. Build ověřuje vložené soubory proti zdrojům. Starší zprávy v historii popisují předchozí verze.

Skutečně spuštěno sestavené HTML v Chrome: menu_a → grove_b → run_b. AudioContext běžel, 1 hudební hlas, 0 chyb. Pauza a pokračování zachovaly run_b a počet spuštění 3. Zobrazen název skladby. Zkoušky proběhly v Canvas režimu; WebGL a subjektivní poslech zde nejsou dostupné.
