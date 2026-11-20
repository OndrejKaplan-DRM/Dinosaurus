# Předání 2.7 — 8. listopadu 2026

Po dvou přerušeních nebyla pracovní kopie v dočasném prostředí zachována; v tomto běhu byla obnovená z uložené 2.6 a zaznamenaného kódu. Autoritativním stavem se stává tento archiv, ne starší pracovní adresáře.

Dokončený import 43 modelů, manifest se zapisuje až po úspěšném převodu všech modelů (dřívější chyba přerušení po třech stromech odstraněna). Polyfill ImageData je nutný pro export upravených textur. U FBX se před měřením přehraje idle a přepočítají skinned bounds, jinak se rozpadá měřítko Triceratopse. SkeletonUtils.clone zajišťuje samostatné animace. Původní zdroje a relativní cesty jsou přibaleny, skripty nepotřebují dřívější pracovní složky.

Změny: src/nature-layout.mjs, nature.mjs, nature-canvas.mjs; napojení v main/world/canvas-scene; katalog v developer; build vkládá všech 43 GLB a 4 soubory atlasů/manifestů. Hudební engine, osm OGG a původní Dinoš se neměnily. Předchozích 71 testů rozšířeno na 80, všechny prošly. Build 63,7 MB obsahuje 83 binárních zdrojů a 4 fonty.

Zbývající hranice: kulisy jsou dekorace, velcí dinosauři chodí/odpočívají vedle cesty; nejde o nové nepřátele, krmení ani ekosystémovou simulaci. Pět biomů mění skladbu vegetace, nejde o nový herní režim. Malé druhy jsou výtvarné motivy. Výkon WebGL na fyzických GPU zatím nebyl změřen, prohlížeč zde používá Canvas fallback.

Závěrečné UI ověření: zdrojová verze menu, katalog všech 43 položek, změna denní doby, skok na 3200 m a běh přes 3300 m. Browser diagnostika: Canvas, 43 modelů, 546 pozic, 11 zvířat, 1 hudební hlas, 30 dekódovaných zdrojů, 0 audio chyb. FPS cloudového testovacího prohlížeče byl omezený (1–4), naměřené kreslení kolem 49 ms; nelze z toho slibovat 60 FPS na cílovém zařízení. WebGL nebyl vizuálně testován na GPU, geometry/animation testy však skutečně parsují všech 43 finálních GLB do Three.js.

Otevření zabaleného HTML přes náhledový server skončilo timeoutem a následným zamítnutím bezpečnostní politiky prohlížeče. Nebyla zkoušena obcházení. Místo toho validátor porovnal všech 83 vložených zdrojů byte/hashově a Canvas renderer přímo z dat zabaleného HTML vykreslil 4 scény. Není vydáváno za manuální test doubleclick/file:// na Windows.

Po vizuální kontrole byly nízké široké rostliny odsunuty podle rozměrů jejich skutečné geometrie (okraj nejméně 3,6 m od středu). Rozmístění vynechává vysoké dekorace kolem skupinek dinosaurů, čímž vznikají viditelné průhledy. Zvířata i dekorace sdílejí 180m cyklus, takže průhledy drží při běhu. Obnovené původní procedurální detaily zachovávají dřívější fauna/biom prvky. Původní ginkgo s plochými korunami je v nové krajině vypnuté, dostupné zůstává s přepínačem původní krajiny.

Finální testy: 80/80. Build: 63,721,172 bytů. Modely GLB: 15,867,192 bytů. Žádná změna hudebního enginu: zachována původní režie 60–95s úryvků, náhodný výběr bez opakování celé dostupné skupiny a nejvýše jeden hlas. Všechny původní Suno nahrávky a OGG jsou v archivu.

Další realistické kroky: přímý WebGL performance profil na cílovém PC, podrobnější přirozené břehy a vzdálený horizont, jemnější chování zvířat. Stávající klidové klipy nejsou simulací spásání vegetace. Nezaměňovat výtvarnou stylizaci za přesnou paleo-rekonstrukci.

## Dodatek 19. 11. 2026 — verze 2.7.1 (Claude, sešna „herní frameworky“)

- Projekt je nově v gitu: https://github.com/OndrejKaplan-DRM/Dinosaurus (větev `main`). Archiv 2.7 byl vložen beze změny souborů, potom přibyla tato verze.
- Jediná věcná změna 2.7.1: tři textury `public/textures/*.jpg` nahrazeny vlastními ze skriptu `tools/make-textures.py` (CC0). Kód hry se nezměnil, jen číslo verze v `package.json`, `src/main.mjs`, `tools/build.mjs` a `tools/validate-build.mjs`.
- Ověřeno: 80/80 testů (`TESTY_2_7_1.txt`), sestavení 63 730 424 B a kontrola vložených dat (`BUILD_2_7_1.json`), spuštění v Chrome se softwarovým WebGL 2 (3D větev, bez chyb v konzoli). Fyzická GPU stále neměřena.
- Sestavení 2.7.0 bylo ověřeno jako opakovatelné: nový build ze zdrojů měl stejný otisk jako odevzdaný soubor.
- Rozbor hry a hodnocení nabídek s deseti doloženými vadami: `docs/ANALYZA.md`, `docs/SHELL_HODNOCENI.md`. Vady nabídek zatím opravené nejsou.
- `SOUBORY_SHA256.json` je přepočítaný pro stav 2.7.1.


## Dodatek 20. 11. 2026 — verze 3.0.0 (Claude, sešna „herní frameworky“)

- Nová hra je ve složce `dinos3/` na větvi `v3`, sestavený soubor `Dinos_3.html` v kořeni. Verze 2.7 a 2.7.1 (`zdroje/`, `Dinos_2_Stezka_oziva.html`) zůstaly beze změny; nic se nemazalo a historie se nepřepisovala.
- Popis, mapa složek, postup sestavení a zkoušek, původ a licence: `dinos3/README.md`. Výsledky: `TESTY_3_0_0.txt`, `BUILD_3_0_0.json`.
- Velikost 63 721 172 B → 20 110 197 B: model dinosaura zjednodušen na 20 % trojúhelníků s texturou 1024 px, krajina s kompresí meshopt a texturami WebP 512 px, hudba Opus 56 kb/s z původních MP3 v `suno_originaly/`, knihovna Rapier nahrazena vlastní balistikou úlomků.
- Nové herní prvky: lovecký trans, etapy s prémií, další dny, noční bonus, déšť s účinkem, oživení, denní výprava, postup mezi běhy (hodnosti, úkoly, zásoba jantaru, zbarvení).
- Nabídky jsou postavené znovu z deklarací; deset vad z `docs/SHELL_HODNOCENI.md` je opraveno a každou hlídá zkouška.
- Dvě vady nalezené až zkouškami v prohlížeči a opravené: prázdná horní vrstva nabídek zakrývala celé menu, takže myší nešlo kliknout na nic (klávesnice fungovala); tabulka v okně O hře přetékala na telefonu na výšku.
- Pasti pro další práci: kvantované atributy modelů je před `applyMatrix4` nutné převést na Float32 (`toFloatAttributes` v `src/render/nature.mjs`); `GLTFLoader` potřebuje `setMeshoptDecoder`; po zeštíhlení dat se musí přepsat velikosti v `public/nature/manifest.json` (dělá to `tools/optimize-assets.sh`); `page.click` Playwrightu při softwarovém vykreslování vyprší, zkoušky proto klikají přes vlastní funkci s kontrolou zásahu.
- Hranice: skutečná grafická karta, zvuk poslechem, skutečný telefon, skutečný ovladač a Safari ověřeny nebyly. Vyvážení herních čísel je odhad; testy hlídají logiku, ne zábavnost.
- Uložená data: verze 3 používá klíče `dinos3:*` a záznamy verze 2 (`dinos-best-*`, `drap-best`, `dinos-settings-v2`) jen čte, nemění je.
