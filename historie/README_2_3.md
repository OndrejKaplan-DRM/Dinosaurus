# Dinoš 2.3 — Suno soundtrack

**Spuštění:** stáhni `Dinos_2_Stezka_oziva.html` a otevři jej v prohlížeči. Model, textury, české písmo, zvuky i osm dodaných skladeb ze Suno (téměř 18 minut) jsou uvnitř souboru. Ke hraní není potřeba instalace, server ani internet. Pouhý náhled přílohy nemusí spouštět JavaScript; otevři stažený soubor.

## Nově ve verzi 2.3

Night Menu doprovází nabídku, Lazy Prehistoric Grove volné pobíhání a čtyři Agile Exploration běh. Pauza ztiší stávající skladbu, štít a zrychlení ji nepřerušují. Srovnaná hlasitost a krátké ustoupení hudby při výrazných efektech. Přehled, měření a pokyny pro obnovu: `HUDBA_2_3.md`.

## Zachované opravy 2.2

- Opraven směr textury země ve 3D i v úsporném režimu. Stezka se posouvá stejně jako překážky; pod menu zůstává stát.
- Hudební přehrávač připouští jedinou skladbu. Před další stopou nejprve ztiší a odpojí předchozí. Odstraněno průběžné restartování téže smyčky, náhodné vnitřní začátky a překryv při změně situace.
- V menu nové **Poběhat si v háji**. Dinosaurus se zlatým kruhem patří hráči; ostatní se dál toulají sami. Pohyb všemi směry, běh, skok, klávesnice i dotyková tlačítka.

## Hraní

**Vyrazit na stezku** je běh o rekord. **Klidná výprava** je pomalejší běh bez prohry. **Poběhat si v háji** je volný pohyb v prostředí menu bez skóre a překážkového závodu.

| Ovládání | Na stezce | V háji |
| --- | --- | --- |
| ← / A, → / D | Změna pruhu | Pohyb vlevo/vpravo |
| ↑ / W | Skok | Pohyb dopředu |
| ↓ / S | Podřep; lze držet | Pohyb dozadu |
| Mezerník | Kousnutí | Skok |
| Shift | — | Rychlejší běh; lze držet |
| Esc | Pauza, zavření panelu | Zpět do menu |
| P | Pauza / pokračování | — |
| Enter | Start / pokračování / nový běh | Start závodu |

Na mobilu se v háji zobrazí směrový kříž a tlačítka Běh/Skok. Drž směr a případně druhým prstem Běh. Na počítači lze dotyková tlačítka zapnout v nastavení. Na stezce fungují také tahy prstem a klepnutí pro kousnutí.

Kameny přeskoč, kmeny podlez, větve a drobnou zelenou kořist rozkousej nebo oběhni. Trní oběhni. Jantar zvyšuje skóre, tyrkysový štít pohltí náraz. Ocas nezpůsobuje prohru a podřep se pod kmenem bezpečně podrží. Rekordy a volby jsou uložené jen v daném prohlížeči.

Zvuk začne po prvním kliknutí nebo stisku klávesy. Hudbu, efekty a přírodu lze ztišit samostatně. Přepnutí okna pozastaví běh a uvolní držené vstupy.

## Ověření

**45 automatických testů prošlo.** Zahrnují pravidla a průběžné kolize, podřep, skutečnou kostru modelu, Rapier, oba směry vykreslování země, hudební přechody včetně 4 000 rychlých změn, volný pohyb a mobilní kameru. Podrobnosti jsou v `HUDBA_2_3.md` a `TESTY_2_3.txt`.

Hotové HTML 2.3 bylo spuštěné v prohlížeči: menu, háj, start běhu, pauza a pokračování. Přechody použily nové nahrávky, hudební hlas zůstal jediný a nebyly hlášené chyby dekódování. Podrobnější mobilní a pohybové zkoušky předchozí verze jsou zachované v historii.

Prohlížeč v testovacím prostředí nemá WebGL, takže interaktivní zkoušky proběhly v úsporném Canvas rendereru. 3D výstup GPU a výkon na konkrétním hráčově zařízení nebyly tímto ověřené. Subjektivní poslech mixu zde nebyl dostupný. Hra používá Three.js tam, kde je WebGL 2 dostupné, a jinak automaticky kompatibilní vykreslování s 88 snímky původního texturovaného GLB modelu.

## Obsah balíčku

- `Dinos_2_Stezka_oziva.html` — kompletní hra 2.3.
- `historie/KRITIKA_A_OPRAVY_2_2.md` — příčiny chyb, opravy a meze kontroly.
- `historie/SUNO_PROMPTY.md` — původní náměty; dodané skladby už jsou integrované.
- `zdroje/` — upravitelná hra, testy a všechny potřebné assety.
- `puvodni_herni_zdroje/` — původní herní kód z Groku pro porovnání.
- `historie/` — zprávy z předchozích verzí, nikoli aktuální výsledky.
- `LICENCE_A_PUVOD.md`, `licence/` — původ a licence součástí.
- `SOUBORY_SHA256.json` — kontrolní součty souborů.

## Další vývoj

Ve složce `zdroje` s Node.js 22+ spusť:

```sh
npm ci
npm test
npm run build
node tools/validate-build.mjs
```

Výstup vznikne v `dist/Dinos_2_Stezka_oziva.html`. `npm run dev` slouží k vývoji. Hotové modely, atlas a hudba jsou přiložené; běžný build je nevyrábí znovu. Hudební stopy lze nahradit v `public/music/` podle souboru `HUDBA_2_3.md`.
