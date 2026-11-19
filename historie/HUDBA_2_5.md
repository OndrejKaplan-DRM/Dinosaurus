# Dinoš 2.5 — hudební režie

Všech osm dodaných nahrávek zůstává vloženo v HTML. Původní MP3 jsou v suno_originaly, normalizované herní OGG v zdroje/public/music. Nahrávky nebyly nově převáděny ani zkracovány na disku; zkrácené úseky volí přehrávač.

| Skladby | Počet | Menu | Volný háj a běh |
| --- | ---: | --- | --- |
| Night Menu I, II | 2 | Ano | Ne |
| Lazy Prehistoric Grove I, II | 2 | Ano | Ano |
| Agile Exploration I–IV | 4 | Ne | Ano |

Celkem 17 minut 51 sekund původního materiálu. Předchozí verze už obsahovala všech osm nahrávek; menu mělo pouze dvě a běh čtyři. Přehrávač čekal na konec celé nahrávky. Přesnou uživatelem popsanou desetiminutovou repetici jediné stopy se nepodařilo technicky reprodukovat; nepovažujeme ji tím za vyvrácenou.

Nově trvá jedno zařazení nejvýše náhodných 60–95 sekund, případně do konce kratší skladby. Výběr používá historii dostupných skladeb: před opakováním projde příslušnou sadu. Stejná skladba nenavazuje bezprostředně sama na sebe, pokud je načtená alternativa. První zařazení začíná od začátku, při dalších lze náhodně začít uvnitř nahrávky tak, aby zbývalo dost materiálu.

Přechod mezi skladbami je postupné ztišení a následné zesílení; souběžný hudební hlas zůstává vždy nejvýše jeden. Ruční přeskočení: ⏭ nebo N, také tlačítko v Nastavení. Opakované klikání neposouvá dokončení přechodu. Pokud alternativa ještě není dekódovaná, požadavek počká.

Pauza ztiší aktuální podkres. Hudební obměna se řídí hodinami zvukového systému, nikoli rychlostí simulace nebo počasím. Přepnutí okna zvukový systém pozastaví. Start, rychlost a štít nespouštějí další překrývající se nahrávku.

Součástí testů je simulace desetiminutového běhu se čtyřminutovými vstupními skladbami: všech šest příslušných stop se vystřídá a nejsou slyšitelné dva hudební zdroje zároveň. Testovací prohlížeč umožňuje ověřit spuštění, změny názvů a počet hlasů; subjektivní poslech mixu v tomto prostředí ověřen není.

Podrobnosti původní normalizace a mapování jmen MP3/OGG jsou v historie/HUDBA_2_3.md a SUNO_AUDIO_ANALYZA.json. Pro reprodukci převodu použij `python3 tools/prepare-music.py ../suno_originaly` ze složky zdroje, pak běžný build podle README.
