> HISTORICKÁ ZPRÁVA K VERZI 2.0. Aktuální opravy a ověření 2.1 popisují README, KRITIKA_A_OPRAVY_2_1 a OVERENI_2_1.

# Předání Dinoš 2.0

Datum: 31. 10. 2026. Zdroj: uživatelem dodaný export `pzgSEeCHeYTW8Z4n-grok-workspace.zip`.

## Zjištěný výchozí stav

Původní hra je trojpruhový endless runner v React Three Fiber, Three.js a React Three Rapier. Logika v `sim.ts` posouvá překážky proti hráči, R3F vykresluje model a reaguje na vstupy, zásahy pocházejí ze senzorových intersection-enter událostí Rapieru. Existují skok, skluz, kousnutí, jantar, štít, série a zrychlování. V exportu už byly některé požadavky částečně implementované — například hláška „Náraz“, tucking ocasu a první prostorové kameny. Nepovažovali jsme všechny uživatelovy starší poznámky automaticky za stále neopravené.

Dodané GLB má přibližně 102 702 neindexovaných vrcholů a 34 234 trojúhelníků, 27 kosterních uzlů, jednu barevnou PNG texturu a **jedinou sekundovou animační smyčku** s 81 kanály. Název přílohy „All Animations“ není dokladem více akcí. Výměna celého materiálu v původním kódu také odstraňovala část nastavení GLB; nebylo třeba vymýšlet novou barvu místo existující textury.

Původní pád byl převážně rotací skupiny kolem X do 1,25 radiánu. Audio obměňovalo především jednu nahrávku přes rychlost a filtr; osm cue stavů neznamenalo osm různých skladeb. CSS importovalo jen latin-ext Fredoku, proto české znaky a základní latinka mohly pocházet z různých fontů. Projekt navíc zahrnoval rozsáhlou serverovou/auth kostru, kterou tato hra nepotřebuje.

## Architektura nové verze

Nový samostatný klient v ES modulech používá Three.js 0.180.0, Rapier 0.19.3 a build přes esbuild 0.25.0. Z původního exportu přebírá model, skutečně potřebné textury a zvuky. Převod do menšího klienta umožnil offline HTML bez serveru a bez React/TanStack runtime; původní herní kód je přiložen pro porovnání.

- `src/core.mjs`: deterministický Runner, vstupní příkazy, generátor tratě, průběžné kolize, pravidla a události. Jednotky metry a sekundy, vpřed −Z, hráč zůstává poblíž Z=0. Pruhy X = −2,35 / 0 / +2,35. Hlavní smyčka používá krok 1/120 s, zpoždění omezuje na 12 kroků a neprovádí neomezené dohánění po přepnutí okna.
- `src/raptor.mjs`: klonování kostry, původní textura, blend běžecké smyčky se statickou referenční pózou pro skluz, procedurální skok, kousnutí, ocas a zavrávorání. Odhad kontaktu chodidel používá skutečné skinned vertices vybrané podle vah koncových kostí nohou.
- `src/world.mjs`: deformovaná geometrie země, nepravidelné skalní tvary s vertex barvami, prostorové kapradiny, prohnuté kmeny a kořeny, obloha a hloubkové vrstvy; viditelné objekty překážek jsou opakovaně použitelné.
- `src/physics.mjs`: skutečný Rapier world pro třísky a drobné úlomky. Primární herní kolize jsou samostatné deterministické průběžné testy těla, aby ocas a události senzorů nerozhodovaly nečekaně o prohře.
- `src/audio.mjs`: Web Audio, cache dekódování, osm hudebních souborů, procedurální šum listí a vzdálená volání, přechody, obměny, samostatné sběrnice hudba/efekty/příroda/master, kompresor a pozastavení na pozadí.
- `src/main.mjs`, `index.html`, `src/style.css`: propojení scény a UI, klávesnice, dotyk, gesto, pauza, úložiště voleb a rekordů.
- `tools/build.mjs`: přibalí všech 38 potřebných souborů do jediného HTML; nepotřebuje síť při hraní. Rapier compat obsahuje WASM přímo v JS balíčku.

## Důležitá rozhodnutí

1. Ocas je vizuální pružná část; zásah ocasu neukončí běh. Nerozšiřovat primární kolider na celou bounding box dlouhého modelu.
2. Uvolnění klávesy podřepu neskončí průlez dřív, než projede i zadní část. Krátký minimální čas funguje i při mobilním gestu.
3. Podřep blenduje do vhodné referenční pózy. Pouhé snížení celé běžecké smyčky nestačilo: v některých fázích se hlava stále dostávala do kmene.
4. **Procedurální rotace se nesmějí kumulovat.** Three AnimationMixer umí přeskočit opětovné zapsání konstantní hodnoty. Proto se před každou evaluací obnovuje čistá póza z minula a po evaluaci se uloží nová čistá póza, teprve pak se přičítají procedurální zásahy. Pouhé „mixer se každým snímkem postará“ v tomto případě neplatilo. Regresní test to ověřuje.
5. Pád není ragdoll: je to záměrně krátká, 720ms animovaná reakce s náklonem do strany a nohama dole. V klidném režimu po ní hra pokračuje, soutěžní režim zobrazí výsledek.
6. Hudba není ze Suno. Jde o osm skutečně odlišných procedurálně zkomponovaných instrumentálních skladeb. Soubor se zadáními pro Suno je námět na případnou další produkci, nikoliv tvrzení, že už proběhla.
7. Blender zde nebyl dostupný a nebyl použit. Původní kostra GLB zůstala zachována; změny póz jsou v Three.js.
8. Původní `grove.ogg` není zvuková nahrávka přírody: odkazovaný originál Jungle2 je hudební skladba. Proto se v nové verzi nepřimíchává jako „prales“ k další hudbě. Přírodní podkres tvoří hmyz, jemný procedurální vítr a vzdálená syntetická volání.
9. Nebylo provedeno veřejné publikování. Uživatel požadoval verzi ke stažení.

## Ověření

`npm test`: 23/23 prošlo. Součástí jsou mimo jiné 300 seedů tratě, 10minutový simulační běh, směr ovládání, kousnutí před kontaktem, setrvání v podřepu, vysoká rychlost, dvě kolize za štítem, pauza, práce se skutečným GLB, výška těla při podřepu a Rapier kontakt s podlahou.

Softwarové vykreslení skutečné geometrie bylo použito pro interní prohlédnutí 4 stavů: běh, podřep, zavrávorání a menu. Je to pomocná kontrola v samostatném CPU rasterizéru, nikoli WebGL screenshot. Pro rozložení UI byl vytvořen dočasný statický testovací list bez herní logiky; kontrolováno desktopové menu a nastavení, mobilní menu a návod při 390 × 844. Testovací listy nejsou součástí vydané hry.

Cloudový Chrome zde hlásil `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` a nedokázal vytvořit WebGL context ani pro originál. Proto zůstává neověřeno: celé interaktivní hraní v reálném prohlížeči, GPU shaderový výstup, skutečný výkon, mobilní hardware a zvuk poslechem. Zpráva o chybějícím WebGL byla v hotovém HTML zkontrolována.

Všech 8 hudebních OGG prošlo dekódováním FFmpeg do PCM a měřením délky, RMS a peak; přesná čísla jsou v `audio-analysis.json`. Výsledky testů jsou v `TESTY.txt`. Rapier 0.19.3 při inicializaci vypisuje upozornění na deprecated init parametr uvnitř své compat distribuce; fyzika přesto inicializuje a integrační test prochází. Upozornění nebylo skryto.

## Další vývoj

Nejvyšší hodnotu má následný skutečný herní test na zařízení s WebGL 2. Ověřit pocit z rychlosti, čitelnost jednotlivých překážek zpoza dinosaura, shaderové barvy a skutečnou hlasitost jednotlivých stop. Nezaměňovat průchod testy za výsledný herní dojem.

Pro profesionální rozšíření je vhodné v Blenderu přidat samostatné klipy jump/land/crouch/stumble/idle a animaci čelistí. Aktuální procedurální pózy vycházejí z jediného dostupného klipu. Další přirozený krok: několik profilovaných biomů, ručně komponované obtížnostní sekvence a cílená optimalizace podle naměřeného GPU výkonu. Není účelné předem měnit engine jen kvůli počtu assetů.

## Reprodukce

Ve složce `zdroje` stačí Node.js 22+:

```sh
npm ci
npm test
npm run build
```

Výstup: `dist/Dinos_2_Stezka_oziva.html`. Pro vývoj `npm run dev`; ke hraní dodaného HTML není Node.js potřeba. Volitelné znovuvytvoření hudby: `python tools/compose.py` (NumPy a FFmpeg). Již hotové OGG jsou přiložené, takže build tyto programy nevyžaduje.

Build také samostatně parsuje oba vložené JavaScript bloky výsledného HTML. Do vloženého kódu se nesmějí neúmyslně promítnout substituce `$&` z náhradních řetězců JavaScript String.replace; builder používá funkční replacer. Tato chyba byla při kontrole hotového HTML zachycena a opravena.

Původní archiv uživatele zůstal beze změn.
