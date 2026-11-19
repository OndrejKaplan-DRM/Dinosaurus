# Dinoš 2.2 — opravy po další zkoušce

## Co jsem předtím nedotáhla

Testy 2.1 ověřovaly spuštění, kolize a načtení zvuku, ale nezkoumaly směr textury a souběh hudebních zdrojů při přechodech. To byla skutečná mezera v kontrole. Funkční AudioContext není důkaz správného hudebního mixu.

## Opravené chyby

**Pohyb země.** Překážky i kulisy cestují směrem +Z k hráči. Posun UV v Three.js měl opačné znaménko. Ve 2D projekci se podobně používalo `z + world` místo `z - world`. Obě větve teď zachovávají shodné souřadnice textury pro bod, který se posune stejně jako svět. Půda pod menu je stacionární; dříve se ve 2D posouvala i při stojících kulisách.

**Hudba.** Starý přehrávač záměrně míchal dva zdroje při crossfade, používal smyčky a spouštěl skladbu znovu po 23–41 s i v situaci s jedinou stopou. To vytvářelo časově posunutý překryv a zbytečné restartování. Nahrazeno jedním vlastníkem hudebního zdroje. Nejdřív dokončí ztišení, zastaví a odpojí starý zdroj a teprve pak zapojí nový. Rychlé změny situace neprodlužují starý fade a neřadí pozdní skladby do fronty. Starý callback nesmí smazat nový hlas. Stopy hrají od začátku bez náhodných vnitřních offsetů; v jedné situaci dohrávají do konce. Samostatný hudební jingle při startu už se nepřimíchává.

## Nové volné pobíhání

Tlačítko **Poběhat si v háji** předá ovládání největšího dinosaura, označeného zlatým kruhem. Šipky/WASD vedou všemi směry, Shift je běh a mezerník skok. Ostatní tři dinosauři se dál toulají autonomně. Esc nebo tlačítko vrací nabídku. Na mobilu je směrový kříž, Běh a Skok. Kamera při volném pohybu sleduje postavu, zejména na úzké obrazovce. Pohyb má omezený prostor bez skóre a nebezpečí; nejde o novou velkou otevřenou mapu.

Oba renderery používají stejný stav zvířat a stejný ovladač. Diagonály nejsou rychlejší, po uvolnění vstupu dinosaurus zastaví, skok nelze obnovovat ve vzduchu, ztráta fokusu maže držené vstupy.

## Meze a zbylé možnosti

Osm stávajících instrumentálních OGG zůstává v balíčku. Jejich skladatelskou kvalitu tato oprava nepředstírá jako novou produkci. Soubor `SUNO_PROMPTY.md` obsahuje osm zadání, požadované názvy a formát pro následnou výměnu.

Cloudový prohlížeč neposkytuje WebGL. Interaktivní zkoušky proto proběhly přes skutečný úsporný renderer a samostatný HTML soubor. Konstrukce Three.js scény, směr jejího UV a kostra modelu jsou ověřené automaticky, hardwarový obraz 3D nikoli. Zvuk má testované časování a prohlížečový AudioContext; subjektivní poslech výsledného mixu zde nebyl dostupný.
