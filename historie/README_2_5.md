# Dinoš 2.5 — kroky v podřepu a pestřejší hudba

**Spuštění:** stáhni `Dinos_2_Stezka_oziva.html` a otevři jej v prohlížeči. Model, textury, české písmo, zvuky i osm dodaných skladeb ze Suno (téměř 18 minut) jsou uvnitř souboru. Ke hraní není potřeba instalace, server ani internet. Pouhý náhled přílohy nemusí spouštět JavaScript; otevři stažený soubor.

## Opravy 2.5

**Podřep už není zastavená póza.** Při držení šipky dolů nebo S Dinoš střídá nohy a cupitá. Kroky reagují na uběhnutou vzdálenost, pauza je zastaví. Oprava je ve 3D modelu i v nově přepočítaném atlasu pro úsporné vykreslování. Hlava a ocas zůstávají pod průchozí výškou klády. Tlumené kroky jsou slyšet i v podřepu.

**Hudba se náhodně obměňuje po 60–95 sekundách.** Kratší skladba může dohrát dříve. Menu vybírá ze čtyř nahrávek, běh a volný háj ze šesti; dohromady se používá všech osm dodaných skladeb. Dostupná sada se vystřídá před opakováním. Při dalším zařazení stejné skladby se může zvolit jiná část nahrávky. Předchozí hudba se nejprve ztiší a zastaví, takže nevzniká kánon.

**Další skladba:** tlačítko ⏭ vedle ovládání zvuku, klávesa **N**, případně stejné tlačítko v Nastavení (také na mobilu). Aktuální název zůstává na obrazovce.

Příčiny a ověření: `OPRAVY_2_5.md`. Přesné rozdělení skladeb: `HUDBA_2_5.md`.

## Zachované prostředí 2.4

- Pět nálad počasí: slunečno, teplý déšť, silná přeháňka, vítr s listím a prachem, dusné vedro. Přechody jsou pozvolné; mění se obloha, světlo, vlhkost povrchu a zvuk větru/deště.
- Stezka se stáčí na obě strany a vlní se přes vyvýšeniny a prohlubně. Cesta, překážky a kulisy sdílejí stejný profil. Zůstávají tři ovládané pruhy; zatáčení krajiny nevyžaduje samostatné řízení.
- Hustší kapradiny, širší koruny stromů, jehličnany, palmy, cykasy, jinany, přesličky a mech. Tůně, želvy, krokodýlovití plazi, ptáci, pterosauři a drobný hmyz.
- Od 450 m přibývají kořeny k přeskočení, od 900 m mělké brody a další kulisy, od 1500 m další vrstva zeleně. Brod bez skoku smyje kombo, běh neukončí.
- Den/noc standardně **1 : 100**, tedy jeden celý den za **14 minut 24 sekund aktivního času**. Volitelně 1 : 50. Čas běží také v háji; pauza, otevřený panel a skryté okno jej zastaví.
- V Nastavení lze zvolit konkrétní počasí a pevné ráno, den, soumrak nebo noc. V návodu je rozbalovací průvodce 14 pravěkými prvky.

Inspirací je konec křídy, zejména mokrá říční krajina Hell Creek. Jde o stylizaci, nikoli fotorealistickou paleontologickou rekonstrukci. Původní model Dinoše není nově vydáván za konkrétní místní druh. Podklady a meze: `PRAVEKY_SVET_2_4.md`.

## Zachovaná hudba ze Suno

Night Menu doprovází nabídku, Lazy Prehistoric Grove volné pobíhání a čtyři Agile Exploration běh. Pauza ztiší stávající skladbu, štít a zrychlení ji nepřerušují. Srovnaná hlasitost a krátké ustoupení hudby při výrazných efektech. Přehled, měření a pokyny pro obnovu: `HUDBA_2_5.md`.

## Zachované opravy 2.2

- Opraven směr textury země ve 3D i v úsporném režimu. Stezka se posouvá stejně jako překážky; pod menu zůstává stát.
- Hudební přehrávač připouští jedinou skladbu. Před další stopou nejprve ztiší a odpojí předchozí. Odstraněno průběžné restartování téže smyčky, náhodné vnitřní začátky a překryv při změně situace.
- V menu nové **Poběhat si v háji**. Dinosaurus se zlatým kruhem patří hráči; ostatní se dál toulají sami. Pohyb všemi směry, běh, skok, klávesnice i dotyková tlačítka.

## Hraní

**Vyrazit na stezku** je běh o rekord. **Klidná výprava** je pomalejší běh bez prohry. **Poběhat si v háji** je volný pohyb v prostředí menu bez skóre a překážkového závodu.

| Ovládání | Na stezce | V háji |
| --- | --- | --- |
| ← / A, → / D | Změna pruhu | Pohyb vlevo/vpravo |
| ↑ / W | Skok | Pohyb dopředu |
| ↓ / S | Podřep; lze držet | Pohyb dozadu |
| Mezerník | Kousnutí | Skok |
| Shift | — | Rychlejší běh; lze držet |
| Esc | Pauza, zavření panelu | Zpět do menu |
| P | Pauza / pokračování | — |
| Enter | Start / pokračování / nový běh | Start závodu |

Na mobilu se v háji zobrazí směrový kříž a tlačítka Běh/Skok. Drž směr a případně druhým prstem Běh. Na počítači lze dotyková tlačítka zapnout v nastavení. Na stezce fungují také tahy prstem a klepnutí pro kousnutí.

Kameny přeskoč, kmeny podlez, větve a drobnou zelenou kořist rozkousej nebo oběhni. Trní oběhni. Jantar zvyšuje skóre, tyrkysový štít pohltí náraz. Ocas nezpůsobuje prohru a podřep se pod kmenem bezpečně podrží. Rekordy a volby jsou uložené jen v daném prohlížeči.

Zvuk začne po prvním kliknutí nebo stisku klávesy. Hudbu, efekty a přírodu lze ztišit samostatně. Přepnutí okna pozastaví běh a uvolní držené vstupy.

## Ověření verze 2.5

**58 automatických testů prošlo.** Nové testy ověřují délku dne a pauzu, přepínání rychlosti bez skoku hodin, náhodné počasí, zatáčení a výškový profil, kořeny a brody, všech pět počasí ve dne i v noci v Canvasu a společnou deformaci 3D terénu a kulis. Zachované testy ověřují kolize, kostru modelu, Rapier, směr pohybu země, jediný hudební hlas a volný pohyb.

Hotové HTML bylo spuštěné v prohlížeči. Ověřené jsou menu, běh, pauza/pokračování, nastavení noci a přeháňky i volný háj. Diagnostika během běhu ukázala jedinou hudební stopu a žádné chyby dekódování. Veřejné knihovny ani assety se při hraní nestahují.

Testovací prohlížeč nemá WebGL, proto interaktivní zkoušky proběhly v úsporném Canvas režimu. Geometrie Three.js byla navíc ověřena CPU renderem a testy; skutečný GPU výstup a výkon na tvém zařízení tím ověřeny nejsou. Subjektivní poslech zvukového mixu zde nebyl dostupný. Podrobnosti: `OPRAVY_2_5.md`, `TESTY_2_5.txt`, `BUILD_2_5.json`.

## Obsah balíčku

- `Dinos_2_Stezka_oziva.html` — kompletní hra 2.5.
- `historie/KRITIKA_A_OPRAVY_2_2.md` — příčiny chyb, opravy a meze kontroly.
- `historie/SUNO_PROMPTY.md` — původní náměty; dodané skladby už jsou integrované.
- `zdroje/` — upravitelná hra, testy a všechny potřebné assety.
- `puvodni_herni_zdroje/` — původní herní kód z Groku pro porovnání.
- `historie/` — zprávy z předchozích verzí, nikoli aktuální výsledky.
- `LICENCE_A_PUVOD.md`, `licence/` — původ a licence součástí.
- `SOUBORY_SHA256.json` — kontrolní součty souborů.

## Další vývoj

Ve složce `zdroje` s Node.js 22+ spusť:

```sh
npm ci
npm test
npm run build
node tools/validate-build.mjs
```

Výstup vznikne v `dist/Dinos_2_Stezka_oziva.html`. `npm run dev` slouží k vývoji. Hotové modely, atlas a hudba jsou přiložené; běžný build je nevyrábí znovu. Hudební stopy lze nahradit v `public/music/` podle souboru `HUDBA_2_5.md`.
