# Dinoš 2.7 — Les ožil

Spuštění: otevři Dinos_2_Stezka_oziva.html v Chrome, Edge nebo Firefoxu. Soubor obsahuje všechny modely, textury, fonty, efekty i osm skladeb ze Suno. K hraní není potřeba server ani internet. Zvuk se aktivuje prvním kliknutím.

Šipky/A/D: pruhy; nahoru/W: skok; dolů/S: podlézání s kroky; mezerník: kousnutí; Esc/P: pauza. V menu „Poběhat si v háji“: šipky/WASD, Shift běh, mezerník skok. Klidná výprava je bez prohry.

Nově: 43 CC0 modelů Quaternius; 546 rozmístěných dekorací před filtrováním podle biomu a hustoty; 11 nových zvířat ze šesti modelů (7 velkých dinosaurů, žába, had, 2 létající zástupci hmyzu). Původní ovladatelný Dinoš a jeho skupina zůstávají. Stromy, podrost, keře, mechové kameny, dřevo, houby, květiny a vodní rostliny využívají skutečné dodané modely. 3D instancování sdílí geometrii, animovaná zvířata mají samostatné kostry. Úsporný renderer používá náhledy z těch samých modelů, včetně 288 snímků animací.

Vývojář (F3): katalog všech 43 modelů; přepnutí nové/původní krajiny, vypnutí fauny, hustota vegetace, počasí, denní doba, pět úseků, rychlost, překážky, ochrana a hudba. Úseky se mění po 900, 1800, 3000 a 4500 m. Hudební systém zachovává všech osm dodaných skladeb a náhodné střídání úryvků.

## Zdroje a opakované sestavení

- zdroje/src: herní kód; zdroje/public: vložená herní data.
- asset_sources: vybrané původní modely a jejich potřebné textury, včetně selection.json.
- licence/CC0: licence z osmi prohlédnutých archivů.
- suno_originaly: původní MP3; původní herní data a historické protokoly jsou zachované.
- TESTY_2_7.txt a BUILD_2_7.json: výsledky kontrol.

Pro úpravy nainstaluj Node.js, otevři terminál ve složce zdroje a spusť:

    npm ci
    npm test
    npm run build

Výsledkem je zdroje/dist/Dinos_2_Stezka_oziva.html. npm run dev spustí zdrojovou verzi. Stažení npm závislostí při vývoji potřebuje internet; hraní hotového HTML ne.

Volitelná regenerace modelů a úsporných atlasů (spouštět ze zdroje):

    node tools/prepare-nature.mjs
    node tools/bake-nature.mjs
    npm run build

Konverze používá přímo Three.js FBX/OBJ/glTF importéry; Blender nebyl při této úpravě použit. Atlasy jsou CPU rendery geometrie, nikoli generované náhradní kresby.

## Přesnost a omezení

Jde o stylizovaný park inspirovaný pozdní křídou. Parasaurolophus a T. rex nejsou současníci; jejich setkání je výslovná herní licence. Obecné stromy, květy, houby, žába, had a hmyz nejsou paleontologicky přesnými rekonstrukcemi určených druhů. Moderní hospodářská zvířata a plodiny byly vyřazeny. Přesličky a cykasy zůstávají procedurálními prvky původní hry, v dodaném výběru nebyl použit jejich přesný model.

80 automatických testů prošlo: herní pravidla, podlézání, kolize, hudební hlasy, obloha, import všech modelů, animace, nezávislé kostry, přepínače, pět biomů, volný průhled všemi třemi pruhy a úsporné vykreslování. Validátor ověřil shodu všech vložených dat se zdroji. Závěrečná vizuální kontrola prohlížeče je zaznamenána v SESSION_HANDOFF.md.

V prohlížeči byla ověřena zdrojová verze v režimu Canvas: menu, katalog 43 položek, přechod na 3200 m a pokračující běh přes 3300 m; diagnostika hlásila 11 nových zvířat, jediný hudební hlas a nulové chyby zvuku. Otevření 63,7MB samostatného HTML zde zastavila bezpečnostní politika testovacího prohlížeče. Jeho 83 vložených zdrojů bylo ověřeno proti originálům a přímo z HTML byly bez externích požadavků vykresleny čtyři scény. tools/render-nature-preview.mjs tento test opakuje. Obrázky ve složce ukazky jsou tyto rendery bez rozhraní, nikoli screenshoty WebGL. Výkon WebGL na fyzickém GPU nebyl v tomto prostředí změřen.
