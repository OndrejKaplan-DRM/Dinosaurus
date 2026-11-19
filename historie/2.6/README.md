# Dinoš 2.6 — obloha, živé úseky a Vývojář

Stáhni `Dinos_2_Stezka_oziva.html` a otevři jej v Chrome, Edge nebo Firefoxu. Všechny modely, textury, fonty, zvuky a osm dodaných skladeb jsou uvnitř. Nevyžaduje instalaci, server ani internet. Náhled přílohy nemusí spouštět JavaScript; otevři stažený soubor.

## Co přibylo

- Měsíc s texturou, krátery a kulovým terminátorem. Je součástí pozadí, takže ho stromy zakrývají. Hvězdy, slunce, mraky i vzdálení létající živočichové jsou také za krajinou.
- Mraky se pohybují rychlostí závislou na větru ve třech vrstvách. Oblačnost zeslabuje nebeská světla; noční obloha respektuje počasí.
- Mlha podle deště, vlhkosti a ranní hodiny. V 3D se míchá podle hloubky; úsporná verze tónuje vzdálené kulisy bez zprůhledňování stromů.
- Pět úseků od 0, 900, 1 800, 3 000 a 4 500 m. Poměr kapradin, listnáčů, jehličnanů a palem se mění v přechodovém pásmu 180 m. Nové předměty mají vlastní vzdálenosti odemčení.
- Kutálející se větev od 1 800 m a pohyblivý kámen od 3 000 m. Pohyb je omezen na vyhrazený pruh; generátor ponechává alespoň jeden pruh volný.
- Deset nových drobných motivů: savec, ještěrka, obojživelník, ryby, lastury, semena/šištice, listový opad, duté dřevo, stopy a říční náplav. Katalog v menu obsahuje náhledy a vzdálenosti odemčení.

## Vývojář

Otevři **Vývojář** v menu, v pauze nebo klávesou **F3**. Karty úseků spouštějí test 200 m za začátkem zvoleného úseku, kde je již dokončená proměna vegetace. Přesnou vzdálenost 0–20 000 m lze zadat ručně.

Ovládání zahrnuje počasí, denní dobu, fázi měsíce, hustotu zeleně, mraky, hvězdy, měsíc, mlhu, kapky, listí, drobnou faunu, rychlost běhu, generování a pohyb překážek, nezranitelnost, tělesnou kolizi, vložení konkrétní překážky do pruhu, vyčištění stezky a štít. Změny obrazu se projeví po **Použít a pokračovat**. Panel pozastaví běh a čas počasí. Hudbu lze vybírat i při otevřeném panelu.

Vývojářské běhy a klidná výprava nezapisují rekordy. Běžné **Vyrazit na stezku** vypne vývojářské zásahy; volba počasí z nastavení zůstává zachována. Testovací nastavení nejsou trvale ukládána.

## Hudba

Všech osm původních nahrávek zůstává vloženo. Menu střídá čtyři klidnější skladby; běh střídá čtyři Agile Exploration a obě Lazy Prehistoric Grove. Jednotlivé seznamy se neopakují, dokud se nevyčerpají dostupné skladby. Přechod hlasitosti nejprve ukončí starou stopu, poté spustí další: hudba se nevrství.

Úryvky trvají náhodně 60–95 sekund. První poslech je od začátku, další z různých míst. Klávesa **N** nebo tlačítko **⏭** přeskočí skladbu. Ve vývojáři lze vybrat libovolnou z osmi skladeb a testovat intervaly 30 nebo 120 sekund. Ruční výběr hraje jeden úryvek, potom se vrátí automatický výběr.

## Ovládání

- Šipky vlevo/vpravo nebo A/D: pruh.
- Nahoru/W: skok. Dolů/S: podřep s animovanými kroky.
- Mezerník: rozkousnutí suché větve nebo kořisti.
- Esc/P: pauza. F2: tělesná kolize. F3: Vývojář.
- V háji: šipky/WASD pohyb, Shift běh, mezerník skok.

## Ověření a meze

71 automatických testů ověřuje mimo jiné kolize, podřep, hudbu bez souběhu, nové pohyblivé překážky, odemykání, texturu/fázi měsíce, vrstvení pozadí, mlhu a existenci všech deseti nových motivů v obou vykresleních. Samostatný build obsahuje 36 binárních zdrojů a čtyři fonty; vložené soubory mají shodné kontrolní součty se zdroji.

Interaktivní kontrola proběhla v úsporném Canvas vykreslování. V tomto testovacím prohlížeči nebylo WebGL dostupné; skutečné GPU vykreslení a výkon na tvém zařízení proto nejsou změřené. Three.js scéna je kontrolována geometrickými testy a CPU rasterizací. Ta není náhradou screenshotu z GPU. Při nedostupnosti 3D se hra automaticky přepne do úsporného zobrazení.

Měsíc je procedurální výtvarná textura, nikoli mapa měsíčního povrchu před 66 miliony let. Hvězdy nejsou přesná dobová souhvězdí. Drobní živočichové jsou jednoduché stylizace. Vegetace mění zastoupení, nejde o rozsáhlé ručně modelované nové levely. Překážky používají deterministické herní kolize; Rapier simuluje drobné úlomky.

## Zdroje a sestavení

`zdroje/`: editovatelný projekt. S Node.js 22+ spusť `npm ci`, `npm test`, `npm run build`. Výstup je `zdroje/dist/Dinos_2_Stezka_oziva.html`. Vývojový režim: `npm run dev`.

`suno_originaly/`, `puvodni_herni_zdroje/`, `licence/` a `LICENCE_A_PUVOD.md` zachovávají původní podklady a licence. Historické zprávy jsou v `historie/`. Aktuální botanické a paleontologické poznámky: `PRAVEK_2_6.md`.
