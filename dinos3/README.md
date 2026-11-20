# Dinoš 3 — pravěký běh

Přestavba Dinoše 2.7 z 20. 11. 2026. Stejná hra a stejný dinosaurus, ale třetinová velikost, nové herní prvky, postup mezi běhy a nabídky postavené znovu. Verze 2.7 a 2.7.1 zůstávají v repu beze změny (složka `zdroje/` a soubory v kořeni).

**Spuštění:** otevři `Dinos_3.html` z kořene repa v Chrome, Edge nebo Firefoxu. Soubor má 20,1 MB, obsahuje všechna data a nepotřebuje server ani internet. Zvuk se zapne prvním kliknutím nebo stiskem klávesy.

## Co je nové proti 2.7

| Oblast | 2.7 | 3.0 |
|---|---|---|
| Velikost samostatného souboru | 63 721 172 B | 20 110 197 B (−68 %) |
| Model dinosaura | 11,4 MB | 0,5 MB (stejný model z Meshy, zjednodušená síť, textura 1024 px) |
| Krajina a zvířata (43 modelů) | 16,7 MB | 4,9 MB (komprese meshopt, textury WebP 512 px) |
| Hudba (8 skladeb ze Suno) | 15,8 MB | 8,5 MB (Opus 56 kb/s z původních MP3) |
| Fyzika úlomků | knihovna Rapier (2 MB) | 75 řádků vlastní balistiky |
| Textury půdy, kůry a skal | bez doloženého původu | kůra a skály z balíčků Quaternius (CC0), půda vlastní |
| Testy | 80 | 107 + 73 kontrol v prohlížeči |

### Herní prvky

- **Lovecký trans.** Jantar, kousnutí a těsné úhyby plní ukazatel. Plný ukazatel na 6 s zrychlí běh, zdvojnásobí body, přitáhne jantar ze sousedního pruhu a nechá prorazit větve, kořist, trní a kořeny. Kameny a kmeny platí dál.
- **Etapy.** Vstup do každého z pěti úseků krajiny dá prémii, oznámení a 60 m klidné cesty.
- **Další dny.** Za posledním úsekem (4 500 m) začíná každých 1 500 m nový den se zvednutým stropem rychlosti a vyšší prémií.
- **Noc a déšť mají váhu.** V noci jsou odměny 1,25× vyšší. Za deště jsou louže na trati od začátku a přeběhnutí mezi pruhy trvá déle.
- **Oživení.** Jednou za běh jde vstát za 25 jantarů ze zásoby. Běh po oživení se nepočítá do rekordů.
- **Denní výprava.** Trať daná datem, stejná pro každého, s vlastním rekordem dne.
- **Postup mezi běhy.** Zkušenosti, šest hodností, tři souběžné úkoly (10 druhů × 3 stupně), zásoba jantaru a šest zbarvení dinosaura odemykaných hodností.

### Nabídky

Všech deset vad z `docs/SHELL_HODNOCENI.md` je opravených a každou hlídá zkouška:

| Vada 2.7 | Stav ve 3.0 |
|---|---|
| V1 telefon na šířku: část menu nedosažitelná | každé okno se posouvá, menu má na šířku dva sloupce; měřeno na 5 velikostech |
| V2 Enter na „Nastavení“ spustil běh | Enter a mezerník patří prvku pod fokusem |
| V3 fokus se po kliknutí ztrácel | šipky chodí nabídkou, po zavření okna se fokus vrací, odkud přišel |
| V4 počasí z Vývojáře se uložilo hráči | panel Vývojář má vlastní stav, do nastavení nezapisuje |
| V5 stíny ve 2D nedělaly nic | volba se ve 2D nenabízí; každá volba má `apply` a `probe` |
| V6 mrtvý klíč `renderer` | je z něj volba „Vykreslování: Automaticky / Úsporné 2D“ |
| V7 hlášky přes kartu pauzy | v pauze a ve výsledcích se nekreslí |
| V8 „Začít znovu“ bez potvrzení | ničivé akce se ptají, fokus je na „Zpět“ |
| V9 Vývojář v menu pro každého | objeví se až po zapnutí v Nastavení → Data |
| V10 chybí O hře | okno O hře s autory, původem a licencemi |

Nově: Deník lovce (hodnost, úkoly, zbarvení, rekordy), nápověda generovaná z dat hry, obrazovka výsledků s rozpisem běhu, odpočet po pauze, ovladač (gamepad) ve hře i v nabídkách, převzetí rekordů a voleb z verze 2.

## Mapa složek

```
dinos3/
  index.html            jen kostra stránky
  src/
    app.mjs             propojení: stav → pohled, zvuk, nabídky
    config.mjs          verze
    input.mjs           klávesnice, dotyk, gesta, ovladač
    save.mjs            profil a nastavení v localStorage, převod z verze 2
    game/               pravidla bez DOM: core (běh), meta (postup), progression, grove, environment, guide
    render/             view3d a view2d se shodným rozhraním, svět, dinosaurus, obloha, úlomky
    audio/              zvuky a hudební režie
    ui/                 shell (obrazovky a okna), hud, nastavení z deklarací, panel Vývojář
  public/               data vkládaná do výsledného souboru
  tests/                node --test (pravidla, postup, vstupy, ukládání, nastavení, data)
  tools/
    build.mjs, validate-build.mjs
    optimize-assets.sh  zeštíhlení modelů a hudby z originálů
    make-textures.py    textury
    qa/                 zkoušky v prohlížeči (smoke.cjs, check.cjs)
```

Pravidlo vrstev: `game/` neví o prohlížeči, `render/` a `ui/` nevědí o sobě navzájem, všechno spojuje `app.mjs`.

## Sestavení a zkoušky

```
npm ci
npm test                      # 107 testů
npm run build                 # dist/Dinos_3.html
node tools/validate-build.mjs # vložená data se shodují se zdroji
```

Zkoušky v prohlížeči (Playwright a Chrome; bez grafické karty stačí `--disable-gpu`):

```
npx vite --host 127.0.0.1 --port 8792 &
PW=/cesta/k/playwright MODE=funkce node tools/qa/check.cjs   # 33 kontrol chování
PW=/cesta/k/playwright MODE=layout node tools/qa/check.cjs   # 40 kontrol dosažitelnosti na 5 velikostech
PW=/cesta/k/playwright OUT=/tmp/snimky node tools/qa/smoke.cjs
```

Zeštíhlení dat z originálů (potřebuje `@gltf-transform/cli` a FFmpeg):

```
GT=/cesta/k/gltf-transform bash tools/optimize-assets.sh
python3 tools/make-textures.py
```

## Ověřeno a neověřeno

Ověřeno 20. 11. 2026:

- 107 jednotkových testů.
- 33 funkčních kontrol v Chrome se softwarovým WebGL 2: klávesnice a fokus, účinek každé z 18 voleb, únik z Vývojáře, pauza a potvrzení, odpočet, trans, výsledky, oživení, trvalost po novém načtení, 2D režim, poškozené záznamy.
- 40 kontrol rozložení: 1280×720, 390×844, 844×390, 667×375, 820×1180.
- Sestavený soubor otevřený z disku (`file://`) na třech velikostech, bez chyb v konzoli.

Neověřeno:

- **Skutečná grafická karta.** Vše běželo softwarově při 1–4 snímcích za sekundu. Plynulost a vzhled na skutečném zařízení zná až hráč.
- **Zvuk poslechem.** Hudba je překódovaná z původních MP3 na Opus 56 kb/s; hraní a přepínání skladeb hlídají testy, kvalitu poslechu ne.
- **Skutečný telefon.** Dotyk a rozložení jsou ověřené emulací, ne na zařízení.
- **Ovladač.** Čtení tlačítek hlídají testy, skutečný ovladač připojený nebyl.
- **Safari.** Hudbu v Ogg přehraje Safari až od verze 18.4 (macOS 15.4, iOS 18.4); ve starší hra poběží bez hudby. Stejné omezení měla i verze 2.7, která měla hudbu také v Ogg.
- **Vyvážení.** Čísla transu, prémií a úkolů jsou nastavená odhadem a testy hlídají jen jejich logiku. Jestli je hra zábavná, se pozná hraním.

## Původ a licence

| Součást | Původ | Licence |
|---|---|---|
| Model dinosaura | Meshy, účet autora hry | podmínky Meshy pro placený účet |
| Krajina a zvířata (43 modelů), kůra, skály | Quaternius | CC0 1.0 |
| Půda | `tools/make-textures.py` | CC0 1.0 |
| Zvuky | Kenney, fvcalderan | CC0 1.0 |
| Hudba (8 skladeb) | Suno, účet autora hry | podmínky Suno pro placený účet |
| Písmo Fredoka | Ben Nathan a spoluautoři | SIL Open Font License 1.1 |
| Three.js 0.180.0 | three.js | MIT |

Texty licencí jsou ve složce `licence/` v kořeni repa. Knihovna Rapier ve verzi 3 není.
