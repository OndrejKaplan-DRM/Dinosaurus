# Kritika předchozího odevzdání a opravy

Datum: 1. 11. 2026. Navazuje na Dinoš 2.0, opravené vydání 2.1.

**Předchozí verzi jsem odevzdala předčasně.** Bylo sice uvedeno, že zde nelze spustit WebGL, ale prošlé testy simulace a samostatný statický test rozložení nenahradily kontrolu celé spuštěné hry. Označení práce za dokončenou bylo vůči požadavku na validní spustitelnou hru příliš silné. Tentokrát jsem spustila skutečnou hru včetně distribuovaného HTML, nikoliv její maketu.

| Nedostatek | Dopad | Oprava v 2.1 | Důkaz / kontrola |
| --- | --- | --- | --- |
| Bez WebGL aplikace skončila jen hláškou | Na některých strojích se nedalo hrát vůbec | Automatické Canvas 2D vykreslování se stejným Runnerem a 88 snímky původního GLB | Skutečný start a běh konečného HTML v prohlížeči bez WebGL |
| Sekundární Rapier/WASM byl podmínkou dokončení startu 3D scény | Chyba úlomků mohla zablokovat celou hru | Chyba sekundární fyziky se zachytí; pravidla běhu ji nepotřebují | Pravidla i kompatibilní hra běží bez Rapier world; integrační test Rapier nadále prochází |
| Následující snímek se plánoval ještě před vykreslením aktuálního | Výjimka mohla neustále opakovat chybný snímek a nechat UI zdánlivě zamrzlé | Řízené zachycení chyby, přechod z 3D na Canvas a jasná chyba s opakováním, pokud selže i Canvas | Kontrola spouštěcí a obnovovací větve; žádná nekonečná smyčka výjimek v provedeném běhu |
| Při umístění řady se přesouvaly jen objekty s přesným Z = −100 | Druhý a třetí jantar mohly zůstat mnohem dál než první | Umístění celé řady se předává jako společný parametr, jednotlivé posuny se zachovají | Regresní test přesných dvoumetrových rozestupů |
| Boční kolize se zkoušela jen v jednom odhadnutém okamžiku | Šlo minout překryv při současném pohybu dopředu a do strany | Společný průběžný interval překryvu v osách X, Y a Z | Regresní test změny pruhu v závěru překryvu překážky |
| Odmítnutí AudioContext mohlo vytvořit nezachycenou promise | Chybové hlášení nebo komplikace na prohlížeči s blokovaným zvukem | Zachycení chyby, evidence selhání; hraní je na zvuku nezávislé | Běžící AudioContext a nula chyb při provedené zkoušce |
| Hned se dekódovalo všech osm dlouhých skladeb | Zbytečná paměťová zátěž, zvlášť na mobilu | Skladby se dekódují podle aktuální situace; nepotřebné cache se uvolňují | Kontrola cache a přechodů ve spuštěné hře |
| Tlačítko zvuku mohlo mít zastaralý popisek | Nebylo zřejmé, zda má zvuk zapnout, nebo vypnout | Popisek se synchronizuje se skutečným stavem; zapnutí po nulové hlasitosti ji obnoví | Kontrola skutečného nastavení a stavu zvuku |
| Rekord z localStorage se nekontroloval na nekonečné či záporné hodnoty | Poškozená hodnota mohla vytvořit nesmyslné skóre | Přijímají se jen konečná nezáporná čísla | Kontrola načítacího kódu |
| Testy nezkoušely skutečné kompatibilní vykreslování | Souhrn testů vypadal silnější než jeho reálné pokrytí | Přidány testy načtení atlasu, vykreslení menu a všech herních stavů a mobilního plátna | Celkem 28 prošlých automatických testů; doplněno ruční ovládání skutečné aplikace |

## Zachované vlastnosti

3D varianta v Three.js, původní barevný model i fyzika úlomků Rapier zůstaly zachované. Kompatibilní režim není testovací podvod ani fotografie vydávaná za hru: překážky, postava, skóre, vstupy a kolize se v něm skutečně mění podle stejné simulace. Graficky je jednodušší, což je výslovně uvedeno v nabídce i návodu.

Ocas stále nemůže způsobit prohru, podřep se nepřeruší pod kmenem, štít ochrání před navazujícími zásahy a krátké zavrávorání nepřevrátí dinosaura na záda. Klidný režim dál umožňuje pokračovat po nárazu.

## Co zůstává neověřené

Při kontrole byl WebGL v cloudovém prohlížeči nedostupný. Nemám proto poctivý podklad pro tvrzení, že byl vizuálně a interaktivně odzkoušen GPU výstup 3D varianty. Ověřená hratelná cesta je tentokrát kompatibilní režim. Subjektivní poslech mixu nebyl dostupný; ověřené je jeho spuštění a dekódování, nikoliv hudební vkus nebo vyvážení na konkrétních reproduktorech.

Prohlížeč v tomto prostředí omezoval volání requestAnimationFrame přibližně na jeden snímek za sekundu. Samotné kreslení plátna v odečtených stavech trvalo přibližně 23–35 ms. Toto měření není údaj o FPS na uživatelově počítači a nesmí být prezentováno jako 60 FPS. Při velmi nízkém FPS simulace záměrně zpomalí místo přeskočení dlouhého úseku bez možnosti reakce.
