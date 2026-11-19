# Záznam ověření Dinoš 2.1

Datum: 1. 11. 2026.

## Automatické kontroly

- `npm test`: **28 testů prošlo, 0 selhalo**. Přesný výstup je v `TESTY_2_1.txt`.
- `npm run build`: vytvořil samostatné HTML s 40 přibalenými assety.
- `node tools/validate-build.mjs`: oba klasické JS bloky lze parsovat; všech 36 položek datové mapy se bajtově shoduje se zdrojovým souborem. Čtyři fonty jsou vložené v CSS. Hra nemá externí script nebo stylesheet nutný ke spuštění.
- Canvas testy používají skutečná data atlasu z dodaného GLB a skutečný renderer, ne prázdný obrázek. Zkouší menu, běh, skok, podřep, zavrávorání, smrt, překážky a změnu velikosti na 390 × 844.

## Skutečná aplikace v prohlížeči

Byla otevřena aplikace ze zdrojů a následně přímo sestavený soubor `Dinos_2_Stezka_oziva.html`. Výsledek se neodvozuje jen z dostupnosti webové adresy.

| Akce | Pozorovaný výsledek |
| --- | --- |
| Načtení bez WebGL | Automaticky se zobrazila skutečná animovaná krajina a nabídka v Canvas 2D |
| Klidná výprava | Stav přešel přes přípravu do běhu; měnila se vzdálenost i skóre |
| Pravá šipka | Skutečná poloha hráče X = +2,35 m |
| Šipka nahoru | Výška hráče po vstupu Y = 0,765 m; obraz i simulace pokračovaly |
| Esc během skoku | Pauza zachovala vzdálenost 62,35 m, X = 2,35 m a Y = 0,765 m i při pozdější kontrole |
| Nastavení z pauzy | Otevřelo se nad zastavenou hrou; ovládací prvky byly dostupné |
| Start soutěžního běhu v sestaveném HTML | Běh proběhl a přirozeně skončil nárazem do kamene |
| Výsledek soutěžního běhu | Stav `dead`, vzdálenost 69,49 m, skóre 377, jeden jantar; zobrazila se skutečná výsledková nabídka |
| Zvuk během hry | `AudioContext = running`, dekódováno postupně 25–30 klipů včetně skladeb, počet chyb načítání = 0 |

Tyto hodnoty jsou odečtené ze stavového výstupu skutečné aplikace a souhlasily s její nabídkou. Nejsou přednastavené v testovacím HTML.

## Limity

Skutečný GPU výstup varianty WebGL a výkon na uživatelově zařízení nejsou ověřené. Kompatibilní hratelný režim je ověřený přímo v prohlížeči. Ovládání myší/klávesnicí bylo skutečně provedeno; mobilní rozložení se kontroluje v ploše 390 × 844, nikoli na fyzickém telefonu. Poslech zvuku nebyl možný, jeho spuštění a dekódování ověřené jsou.

## Doplněná kontrola mobilní plochy

Skutečné finální HTML bylo spuštěné v ploše 390 × 844. Bylo otevřeno nastavení, zapnuta dotyková tlačítka a spuštěna Klidná výprava. Stisk tlačítka Doprava změnil X na +2,35 m; stisk a držení Podřepu vedl k hodnotě podřepu 0,992. Hra pokračovala až za 109 m. Tato zkouška byla ovládání skutečné aplikace, nikoliv statické rozložení.

V přímo servírovaném finálním HTML bylo odečteno 0 externích skriptů a 0 externích stylesheetů. Konzole zachytila chyby doplňku prohlížeče; v kontrolovaném výpisu se neobjevila chyba herní aplikace.
