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

