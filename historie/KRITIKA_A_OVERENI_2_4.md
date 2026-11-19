# Dinoš 2.4 — změny, kritika a ověření

## Co jsem opravila a doplnila

Předchozí scéna byla příliš písčitá, stezka přímá a svět se měnil hlavně rychlostí běhu. Nová scéna používá společný prostorový profil pro terén, překážky a kulisy, hustší podrost a více typů rostlin. Ubrala jsem část skal a posunula vzdálené masivy, aby nezakrývaly výhled na stezku. Ve fallbacku jsem odstranila pruhování cesty a nahradila je nepravidelnými okraji a drobnými částicemi půdy pohybujícími se správným směrem.

Přibyl nezávislý stav počasí a času, pět pozvolna přecházejících režimů, obloha, noční světlo, hvězdy/měsíc, vítr, déšť, listí, prach a jemný teplý závoj. Zvuk deště a větru má vlastní průběžnou hlasitost v kanálu přírody. Hudba ze Suno používá zachovaný přehrávač s jediným hudebním hlasem.

Kořeny se odemykají po 450 m, mělké brody po 900 m. Test zachytil chybu, kdy brod kombo vymazal a vzápětí je obnovila odměna „Hop“; opraveno. Změna rychlosti času 1:100 / 1:50 již nepřepočítává zpětně celou herní historii, takže hodiny neskáčou. U nových výběrových polí jsou explicitní přístupné názvy.

## Co bylo skutečně ověřeno

- `npm test`: 53 testů, 53 prošlo, 0 selhalo. Výpis je v `TESTY_2_4.txt`.
- `npm run build` a `node tools/validate-build.mjs`: oba skripty parsovatelné; 36 binárních assetů a 4 fonty jsou uvnitř HTML, vložená data souhlasí se zdroji.
- Kontrola výsledného HTML v prohlížeči: nabídka, start klidné výpravy, pauza, návrat, nastavení noci a přeháňky, návrat k automatickému počasí/času, volný háj.
- Při nočním běhu diagnostika naměřila déšť 0,73, denní světlo 0, jeden hudební hlas, 0 chyb dekódování. Kontrolovány byly screenshoty nabídky, běhu a deště v noci.
- Procedurální geometrie Three.js byla vykreslena pomocným CPU rasterizérem. Ten ověřuje rozmístění a proporce, nikoliv skutečné shadery WebGL.
- Samostatné nové testy ověřují 14,4minutový cyklus, pozastavení, změnu rychlosti času, více náhodných počasí, hladké zatáčení na obě strany a kopce, reakci brodu a kořenů, jejich odemykání, vykreslení všech počasí ve dne/noci, 3D terén a přibývání zeleně.

## Meze a otevřená kritika

Testovací prohlížeč nepodporuje WebGL a běží přibližně jedním snímkem za sekundu. Interaktivní ověření proto pokrývá Canvas fallback; nejde o výkonový benchmark ani důkaz rychlosti 3D na běžném počítači. Skutečný WebGL obraz a subjektivní poslech mixu v tomto prostředí ověřené nejsou.

Vegetace a menší zvířata jsou procedurální stylizované tvary. Kvalita detailu nedosahuje hlavního dodaného modelu dinosaura. Náhradní Canvas režim používá plošné kreslené kulisy a atlas skutečného modelu; plnohodnotná 3D geometrie se používá tam, kde je WebGL 2.

Zatáčky jsou deformací třípruhé běžecké scény: kamera a ovládání zůstávají relativní ke stezce. Není to otevřený svět s ručně řízenými zatáčkami. Kopečky a prohlubně jsou výškový profil krajiny, mělké brody mají hladinu a zvýrazněný okraj; nejde o simulaci tekutin ani plavání. Hluboké smrtící jámy nebyly přidány.

Pterosauři a ptáci jsou malé pohybující se siluety, želvy a krokodýlovití plazi jsou dekorativní. Počasí mění vzhled a zvuk, nikoli náhodně tření nebo skokový dosah. Tím zůstává ovládání předvídatelné i při postupném zrychlování. Pozdější úseky přidávají dva nové druhy překážek a další vegetaci; nejde o pět samostatných rozsáhlých biomů.

Osm původních skladeb ze Suno, původní MP3, GLB model a archiv původních herních zdrojů zůstaly v balíčku zachované.
