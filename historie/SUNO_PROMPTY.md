# Hudba pro Dinoše 2.2 — zadání pro Suno

Hra již má osm vlastních procedurálních OGG. Pro novou hudbu prosím vrať jednotlivé skladby jako WAV, případně kvalitní MP3; převod na OGG a nasazení udělám já. Připoj názvy z tabulky. Pro první výměnu stačí Menu A, Běh A, Zrychlení a Pauza, ideální je všech osm. Tato zadání jsou volitelnou cestou k produkčně bohatším skladbám. V Suno nebyly během tohoto úkolu žádné skladby vytvářeny. Prompt je v angličtině kvůli přesnějšímu popisu instrumentace.

Společné zadání pro všechny skladby: instrumentální, žádný zpěv ani mluvené slovo, přívětivé dobrodružství místo hororu, bez citace konkrétní filmové melodie. Jemná dynamika, krátký úvod, žádný velký finální úder. Hlavní melodický motiv nejvýš 3–5 tónů, aby se při opakování nevnucoval. U běžných stop cíl 60–120 s, u Startu 8–15 s. Začátek musí být použitelný okamžitě, konec klidný bez doznívajícího finále. Přechod mezi skladbami v Dinošovi 2.2 nejprve ztiší starou stopu a pak pustí novou; skladby se nikdy nepřekrývají.

| Situace | Soubor ve hře | BPM | Charakter |
| --- | --- | ---: | --- |
| Menu A | `menu_a.ogg` | 82 | Zvědavé ranní kapradí |
| Menu B | `menu_b.ogg` | 78 | Vzdušná alternativní melodie |
| Začátek běhu | `start.ogg` | 104 | První dobrodružný krok |
| Běh A | `run_a.ogg` | 110 | Lehký pružný pohyb |
| Běh B | `run_b.ogg` | 114 | Alternativa se synkopou |
| Zrychlení | `rush.ogg` | 136 | Napětí bez paniky |
| Štít | `shield.ogg` | 118 | Hravý pocit ochrany |
| Pauza / dozvuk | `pause.ogg` | 68 | Prostor k oddechu |

## 1. Menu — Ranní kapradí

> Instrumental prehistoric adventure game menu, 82 BPM, warm woody marimba and mellow bamboo flute, sparse hand drums, soft bowed strings, gentle D minor pentatonic motif that feels curious rather than sad, airy forest space, small melodic variations every eight bars, friendly and cinematic but intimate, no vocals, no choir, no trailer impacts, understated beginning and loop-friendly ending.

## 2. Menu — Mezi větvemi

> Instrumental alternate menu cue, 78 BPM, plucked kalimba, breathy ocarina, low warm strings and subtle seed shakers, a different three-note motif in a soft F-centered modal harmony, a feeling of watching lively dinosaurs wander between tall ferns, unhurried, light and playful, spacious stereo image, no vocals, no bird calls printed into the music, no abrupt ending, suitable for quiet background looping.

## 3. Start — První stopa

> Instrumental game start into a continuous run, 104 BPM, brief uplifting two-second pickup, wooden percussion, pizzicato strings, marimba ostinato and a simple rising flute phrase, adventurous and agile, consistent groove after the opening, keep room for jump and bite sound effects, no vocals, no huge brass, no sharp cymbal crashes, loop-friendly transition into exploration.

## 4. Běh A — Jantarová stezka

> Instrumental endless runner soundtrack, 110 BPM, springy hand drum pulse, dry marimba ostinato, restrained cello bass and gentle flute accents, quick-footed prehistoric forest adventure, clear but not insistent rhythm, varied percussion fills every sixteen bars, melody should stay sparse and non-repetitive, no vocals, no dance synth lead, no heroic trailer climax, short gentle release, no long echo tail.

## 5. Běh B — Po měkké hlíně

> Instrumental alternate running cue, 114 BPM, syncopated wooden slit drums, plucked strings, round bass and short low flute answers, nimble and sunny, different harmonic progression and melody from a conventional adventure theme, organic acoustic timbres, a little rhythmic surprise while maintaining a steady pulse, no vocals, no loud snares, no heavy action brass, loopable background arrangement.

## 6. Zrychlení — Ještě rychleji

> Instrumental fast but friendly game chase, 136 BPM, tight frame drums, quick marimba patterns, short staccato strings and controlled low toms, increasing momentum without fear or aggression, harmonically stable, readable pulse, small rests that leave space for obstacle sounds, no vocals, no horror textures, no distorted guitars, no sudden orchestral hits, maintain energy until a short gentle ending.

## 7. Štít — Tyrkysová záře

> Instrumental magical protection game cue, 118 BPM, warm celesta, tiny glass-like accents, light hand percussion, hopeful plucked strings and a calm bass pulse, playful turquoise glow around an agile little dinosaur, confident and curious rather than triumphant, simple shimmering motif with subtle variation, no vocals, no choir, no loud sparkle sweeps, no dramatic finale, smooth background loop.

## 8. Pauza — Chvilka v háji

> Instrumental pause menu ambience, 68 BPM, very sparse soft marimba, distant warm flute and slow string harmonics, almost no percussion, a safe quiet clearing in a prehistoric forest, gentle and breathable, low melodic density, warm dusk colours, no vocals, no strong rhythmic accents, no sadness or defeat, fade-friendly beginning and ending, unobtrusive for a long pause.

## Co mi vrátit

- Soubory z tabulky, ideálně WAV; MP3 také přijmu. OGG je cílový formát ve hře, nemusíš jej vyrábět sám.
- Jednu vybranou verzi každé skladby, případně dvě alternativy pro menu a běh.
- Čistou hudbu bez hmyzu, ptáků, dinosaurů nebo herních efektů. Přírodu a akce už míchá hra samostatně.
- Bez zpěvu a bez melodie neustále opakované v krátkém zpoždění: žádný kánon, výrazný delay ani dlouhé dozvuky. Hudba má nechávat prostor ovládání a efektům.

Ve verzi 2.2 běží nejvýše jeden hudební zdroj. Stopa začne od začátku a v rámci jedné situace dohraje; pak se střídá s alternativou, pokud existuje. Při změně situace následuje krátké ztišení před novým nástupem. Nemění se náhodně ladění ani místo uprostřed skladby.

## Nasazení pro dalšího vývojáře

Nahradit odpovídající soubory v `zdroje/public/music/`, sjednotit hlasitost a přegenerovat HTML pomocí `npm run build`. Režii spravují `src/audio.mjs` a `src/music.mjs`. Pro běžné hraní už jsou původní stopy vložené v HTML.

Soubory před nasazením společně poslechnout, srovnat vnímanou hlasitost a ověřit hudební nástupy. Zvukové soubory z této verze nebyly nahrazené výstupem Suno; nová jsou pravidla jejich přehrávání.
