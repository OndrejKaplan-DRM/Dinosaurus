# Dinoš 2.7 – hodnocení nabídek a obrazovek (shellu)

Zpracováno 19. 11. 2026. „Shellem“ se tu myslí vše kolem samotného běhu: načítání, hlavní menu, nastavení, nápověda, pauza, výsledky, ukazatele ve hře, panel Vývojář, vstupy a ukládání voleb.

## Známka

**3,7 z 5.** Ve školních známkách dvojka s mínusem.

- Jako nabídky **téhle jedné hry** pro hráče na počítači nebo na telefonu drženém na výšku: **4 z 5**.
- Jako **základ, ze kterého by šla postavit nabídka další hry**: **2,5 z 5**. Nabídky jsou s hrou srostlé a nejdou vyjmout.

| Hledisko | Hvězdy | Proč |
|---|---|---|
| Rozsah nabídek | ★★★★☆ | tři režimy, nápověda, 11 voleb, pauza s pěti položkami, výsledky, Vývojář; chybí přemapování kláves, kvalita obrazu, obnovení výchozích hodnot, obrazovka O hře a licence |
| Zapojení prvků | ★★★★☆ | všech 11 voleb něco dělá; výjimky níže (V4–V6) |
| Tok obrazovek | ★★★★☆ | Esc vrací vždy o úroveň, pauza při ztrátě okna, odpočet na startu, u prohry rada; chybí potvrzení u „Začít znovu“ a „Do háje“ |
| Odolnost | ★★★★½ | časové limity načítání, „Zkusit znovu“, pád 3D → 2D, ověřování uložených hodnot |
| Ovládání a přístupnost | ★★½☆☆ | dotyk i gesta dobré, popisky pro čtečky ano; klávesnice v nabídkách je rozbitá (V2, V3), gamepad chybí |
| Rozložení na zařízeních | ★★★☆☆ | počítač a telefon na výšku výborné; telefon na šířku nepoužitelný (V1) |
| Vývojářská výbava | ★★★★½ | skok na úsek, vložení překážky, nezranitelnost, kolize, hudební režie, katalog modelů, diagnostika |
| Stavba a přenositelnost | ★★☆☆☆ | jedna volba se zapisuje na pěti místech, panel Vývojář je řetězec HTML v kódu |
| Vzhled a tón | ★★★★½ | vlastní hlas („Chvilka v kapradí“), jedno písmo, živé pozadí se čtyřmi dravci |

Průměr devíti hledisek je 3,67.

## Co obsahuje

| Obrazovka | Položky |
|---|---|
| Načítání | text průběhu, lišta, „Zkusit znovu“ |
| Hlavní menu | Vyrazit na stezku · Klidná výprava (bez prohry) · Poběhat si v háji · Jak hrát · Nastavení · Vývojář · rekord pro zvolené tempo · řádek s ovládáním · způsob vykreslení a verze |
| Lišta | zvuk, další skladba, celá obrazovka; popisek počasí, času a úseku; název skladby |
| Nastavení | hlasitost celková, hudba, zvuky, prales · tempo stezky (3) · počasí (6) · denní doba (5) · rychlost času (2) · otřesy kamery · podrobné stíny · dotyková tlačítka vždy · další skladba |
| Jak hrát | ovládání, průvodce 14 prvky krajiny, poznámky pro háj a telefon |
| Ve hře | režim, metry, rychlost, skóre, kombo, štít, tlačítko pauzy, kontextová rada, hlášky, odpočet |
| Pauza | Pokračovat · Nastavení · Do háje · Začít znovu · Vývojář |
| Výsledky | důvod konce s radou, vzdálenost, skóre, jantar, kousnutí · Ještě jeden běh · Zpátky do háje |
| Vývojář (F3) | pět úseků, vzdálenost, obloha a počasí (13 voleb), běh a překážky (8 voleb a 3 akce), hudební režie, katalog 43 modelů a 10 drobností, stavový řádek |

## Co je udělané dobře

1. **Tři vstupy do hry podle nálady.** Soutěžní běh, běh bez prohry a hřiště bez cíle. Klidný režim je v menu, ne schovaný v nastavení.
2. **Volba říká, kdy začne platit.** „Tempo platí od dalšího běhu.“
3. **Uložené hodnoty se ověřují po jedné.** Poškozený záznam v úložišti vrátí výchozí hodnoty (ověřeno zkouškou). Rekord ze starší verze se převezme.
4. **Výchozí otřesy kamery respektují systémové omezení pohybu.**
5. **Rekordy jsou čisté.** Klidný režim a vývojářské běhy je nezapisují a obrazovka to říká.
6. **Diagnostika pro stroj.** `window.dinosDiagnostics()` vrací stav hry, vykreslování, zvuku a počasí; hodí se pro automatické zkoušky.
7. **Rada místo výčitky.** Po nárazu hra napíše, jak se té překážce příště vyhnout, a prvních 230 m radí předem.

## Vady

Všechny jsou ověřené zkouškou v prohlížeči nebo čtením kódu; u každé je uvedeno čím.

| # | Vada | Závažnost | Důkaz |
|---|---|---|---|
| V1 | **Telefon na šířku: z menu se nedá dostat do Nastavení, Nápovědy, Vývojáře ani do háje.** Položky leží pod okrajem obrazovky a menu se neposouvá. Horní nápis se navíc kryje s podtitulem. | vysoká | emulace 844 × 390: „Poběhat si v háji“ začíná na 390 px, odkazy na 438 px, výška okna 390 px, `overflow: visible`; [snímek](snimky/07_menu_telefon_sirka_vada.jpg) |
| V2 | **Enter nebo mezerník na kterémkoli tlačítku menu spustí běh.** Kdo se tabulátorem dostane na „Nastavení“ a potvrdí, začne hrát. | střední | zkouška: po Enter na „Nastavení“ se panel neotevřel; `main.mjs` ř. 42 a 45 |
| V3 | **Po každém kliknutí se zruší fokus** (`document.activeElement.blur()`), po zavření panelu se nevrací. Šipkami se v nabídkách chodit nedá. | střední | zkouška: po Esc je aktivní `BODY`; `main.mjs` ř. 31 |
| V4 | **Počasí nastavené ve Vývojáři se uloží hráči natrvalo** (podle kódu i rychlost času), jakmile pak pohne libovolnou volbou. Dokumentace tvrdí opak. | nízká | zkouška: po změně hlasitosti je v úložišti `"weather":"rain"` a po novém načtení ho ukazuje i Nastavení |
| V5 | **„Podrobné stíny“ v náhradním 2D vykreslení nedělají nic**, volba se přesto ukazuje. | nízká | `canvas-scene.mjs` hodnotu nečte |
| V6 | **Mrtvý klíč `renderer: 'auto'`** se ukládá, ale nikde se nečte a nemá ovládací prvek. | drobná | hledání v `src/` |
| V7 | **Hlášky se kreslí přes kartu pauzy.** | drobná | [snímek](snimky/03_pauza_pc.jpg) |
| V8 | **„Začít znovu“ a „Do háje“ v pauze zahodí běh bez potvrzení.** | nízká | `main.mjs`, funkce `action` |
| V9 | **Vývojář je v menu pro každého hráče.** U hotové hry patří za přepínač. | věc vkusu | `index.html` |
| V10 | **Chybí obrazovka O hře.** Původ modelů, hudby a písma je jen v souborech repa. | nízká | `index.html` |

Emulace telefonu není skutečný telefon: V1 je spolehlivě změřená geometrie, ale výřez displeje a lišty prohlížeče můžou situaci ještě zhoršit.

## Proč je stavba za dvě hvězdy

Přidat jednu volbu znamená sáhnout na pět míst: výchozí hodnoty, ověření při načítání, zápis do prvků (`updatePrefs`), posluchače (`setupUI`) a HTML. Nic nehlídá, že se na některé nezapomnělo – tak vznikly V5 a V6. Stejně tak nic nehlídá, že se všechny položky vejdou na obrazovku (V1).

Lék je jedna deklarace na volbu (popisek, typ, výchozí hodnota, platnost, funkce „použij“ a funkce „ověř“), ze které se vygeneruje obrazovka, ukládání i zkouška. Tak je postavený Shell v repu `vibe-game-frameworks`; šablona nabídek odvozená z Dinoše je tam ve `frameworks/41_SABLONA_Menu_arkada.md`.
