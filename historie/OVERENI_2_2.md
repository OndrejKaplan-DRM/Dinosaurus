# Ověření Dinoše 2.2

Datum: 1. listopadu 2026. Verze zdrojů a výsledného HTML: 2.2.0.

## Automatické kontroly

42 testů, 42 úspěšných, 0 neúspěšných. 19 testů herního jádra, 6 modelu/fyziky, 6 vykreslování včetně pohybu země a mobilní kamery, 5 volného pohybu/geometrické invariance, 6 hudebního přehrávače. Úplný výstup: `TESTY_2_2.txt`.

Hudební testy používají nezávisle počítané aktivní zdroje a simulované audio hodiny, nikoli pouhý počet v diagnostickém UI. Ověřeno: 4 000 rychlých změn cue, jediná stopa bez předčasného restartu, zpožděné dekódování, nepřesouvaný fade deadline, pozdní onended staré stopy a dlouhé pozastavení/tlumené snímkování. Maximum souběžně znějících hudebních zdrojů: 1.

Směr pohybu ověřen na skutečném `World.update` i transformacích Canvas patternu. Textura a překážka si při společném posunu zachovají souřadnice. Ve stavu menu je transformace půdy nezávislá na ubíhajícím herním čase.

## Skutečný prohlížeč

Výsledný samostatný HTML soubor byl vystaven bez injekce vývojových skriptů a spuštěn v cloudovém Chrome. Renderer: Canvas 2D, protože WebGL zde není dostupné.

- Háj: po vstupu zastavil ovládaný dinosaurus; ostatní pokračovali. Držení levé šipky změnilo X z 2,169 na 1,749. Shift + nahoru změnil Z z 0,415 na −0,405 a ukázal rychlost 4,1 m/s. Skok dosáhl při pozorování Y = 0,942; hra přitom zůstala v menu. Esc vrátil nabídku.
- Samostatný build: klidná výprava, přirozený náraz, zotavení, pauza. Po pokračování změna do pravého pruhu X = 2,35; skok Y = 1,279 při vzdálenosti 68,74 m.
- Hudba v menu, startu, běhu, nárazu a pauze: AudioContext běžící, 1 aktivní hudební hlas, 0 chyb dekódování. Menu přešlo na druhou variantu po dohrání první.
- Mobilní kontrola: tentýž výsledný HTML soubor v rámečku 390 × 844. Nabídka a háj zkontrolovány obrazem. Zapnutá dotyková tlačítka; držení vlevo změnilo X z 3,485 na 3,065, Skok Y = 0,942. Po uvolnění pohyb skončil. Kamera udržela postavu na obrazovce.
- V kontrolovaném konzolovém výstupu byly jen chyby metadat rozšíření Chrome; nebyla vidět chyba herního skriptu.
- Výsledný dokument: 0 externích skriptů a 0 externích stylopisů. Kontrola buildu parsovala oba vložené skripty a ověřila přesnou bajtovou shodu všech 36 binárních/datových souborů se zdroji; další 4 fonty jsou v CSS.

## Poctivé hranice

Nejde o ověření hardwarového WebGL obrazu, všech prohlížečů ani všech mobilů. Chrome zde omezuje animace přibližně na 1 snímek/s; nelze z toho posuzovat výkon na hráčově zařízení. Hudební časování je testované a zdroje v prohlížeči skutečně běžely, ale subjektivní zvukový poslech zde nebyl dostupný. Samostatný soubor byl spuštěn přes náhledový HTTP server; jeho přímé otevření přes `file:` v lokálním prohlížeči nebylo v cloudovém nástroji ověřeno. Absence externích závislostí a vložené assety umožňují tento režim stejně jako v předchozí verzi.
