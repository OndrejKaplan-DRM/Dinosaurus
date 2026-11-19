# Aktualizace 2.3

Hudební OGG v public/music nyní pocházejí z osmi uživatelem dodaných výstupů Suno. Dřívější zmínky o procedurálním soundtracku níže popisují původní verzi, nikoli novou hudbu. Viz HUDBA_2_3.md.

# Licence a původ součástí

## Dodaný model a textury

`public/models/raptor.glb` je nezměněný 3D model převzatý z uživatelova exportu (v původní příloze také `Meshy_AI_raptor_dinosaurus_All_Animations.glb`). Obsahuje vlastní barevnou texturu. Její používání a práva k modelu se řídí podmínkami, s nimiž byl model získán; k modelu zde nebyla vymyšlena nová licence.

`textures/ground.jpg`, `rock.jpg` a `wood.jpg` pocházejí rovněž z dodaného exportu. Kód je upravuje jen při zobrazení prostřednictvím materiálů, UV opakování a vertex barev; obrazové soubory zůstaly zachované. Původní export neobsahoval úplnou samostatnou licenci těchto tří souborů.

## Převzaté zvuky

Původní `public/audio/CREDITS.txt` uvádí:

- krátké herní zvuky Kenney — Impact Sounds, Interface Sounds, RPG Audio, Music Jingles, CC0 1.0: https://www.kenney.nl/ ; https://creativecommons.org/publicdomain/zero/1.0/
- zvuky hmyzu fvcalderan, CC0: https://opengameart.org/content/insect-sounds

Tyto údaje jsou zachované z dodaného projektu; pro jednotlivé převedené krátké soubory původní export neposkytuje podrobnější manifest původu.

Původní `grove.ogg` byl odvozen ze skladby **Jungle2 — Alex McCulloch / Pro Sensory**. Stránka autora https://opengameart.org/content/jungle-0 uvádí CC0 a žádost o uvedení jména. Byla přečtena při převzetí projektu. Jde o hudbu, nikoliv samostatnou nahrávku pralesa. Nová hra tento soubor nepoužívá, aby nedocházelo k současnému přehrávání dvou nesouvisejících skladeb. V zachovaných původních zdrojích zůstává původní kredit.

## Nové součásti

Osm procedurálních instrumentálních skladeb v `public/music/*.ogg` vzniklo při tomto zpracování pomocí skriptu `tools/compose.py`, NumPy a FFmpeg. Žádná z nich nebyla vytvořena v Suno. Nově vytvořené hudební soubory jsou poskytnuté pod CC0 1.0 v rozsahu práv, která lze k tomuto výstupu poskytnout. Nejde o změnu licence převzatých součástí.

Nové kulisy, kapradiny, deformace skal, pózy a herní pravidla vznikají kódem. Nový kód je poskytnutý uživateli k dalším úpravám bez dodatečných omezení ze strany tohoto zpracování; vložené knihovny si zachovávají vlastní licence.

## Knihovny a font

- Three.js 0.180.0 — MIT, přiložen text licence.
- Rapier 0.19.3 (`@dimforge/rapier3d-compat`) — Apache 2.0; text licence je převzat z instalovaného balíčku, je-li obsažen, případně z oficiální licence Apache 2.0. https://github.com/dimforge/rapier.js
- Fredoka, Ben Nathan a spoluautoři — SIL Open Font License 1.1. Přiložen původní licenční soubor z balíčku `@fontsource/fredoka`. Zahrnuta základní latinka i latin-ext pro češtinu.
- Vite a esbuild jsou pouze nástroje pro další vývoj a sestavení; ke hraní samostatného HTML se neinstalují.

Seznam a přesné verze vývojových závislostí jsou v `zdroje/package-lock.json`. Originální herní soubory od Groka jsou přiložené pro dohledatelnost změn.

## Kompatibilní vykreslování 2.1

`fallback/raptor-atlas.webp` je render 88 snímků z původního dodaného texturovaného GLB, pořízený skriptem `tools/bake-sprites.mjs`. Nejde o nový model ani imagegen obrázek. Původ a licenční podmínky modelu platí také pro tyto odvozené snímky. Nový renderer Canvas používá stejné herní moduly a přiložené zdroje.

## Doplnění 2.4

Nové procedurální kulisy, počasí, časový cyklus a terén jsou součástí zde vytvořeného herního kódu. Nebyly převzaty nové cizí modely ani nahrávky. Paleontologické podklady a hranice stylizace uvádí PRAVEKY_SVET_2_4.md.
