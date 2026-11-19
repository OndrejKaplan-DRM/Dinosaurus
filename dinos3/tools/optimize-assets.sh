#!/usr/bin/env bash
# Zeštíhlení dat hry. Čte původní soubory ze ../zdroje/public a ../suno_originaly, zapisuje do public/.
# Potřebuje: gltf-transform (npm i @gltf-transform/cli@4; cesta v proměnné GT) a ffmpeg s libopus.
#   GT=/cesta/k/node_modules/.bin/gltf-transform bash tools/optimize-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
GT="${GT:-npx --yes @gltf-transform/cli@4}"
SRC=../zdroje/public
COMMON="--join false --flatten false --palette false --instance false --prune true --weld true --texture-compress webp"

# Raptor: 178 tisíc trojúhelníků je na postavu 1,7 m zbytečně mnoho. Zjednodušení na pětinu,
# komprese meshopt a textura 1024 px ve WebP.
$GT optimize $SRC/models/raptor.glb public/models/raptor.glb $COMMON \
  --compress meshopt --texture-size 1024 --simplify true --simplify-ratio 0.2 --simplify-error 0.002

# Krajina a zvířata: tvar beze změny, sloučené vrcholy, komprese meshopt a textury nejvýš 512 px ve WebP.
for f in $SRC/nature/*.glb; do
  $GT optimize "$f" "public/nature/$(basename "$f")" $COMMON --compress meshopt --texture-size 512 --simplify false
done

# Hudba: z původních MP3 ze Suna do Opus 56 kb/s (kontejner Ogg), celá délka skladeb.
i=0
declare -A NAME=( ["Night Menu.mp3"]=menu_a ["Night Menu (1).mp3"]=menu_b ["Lazy Prehistoric Grove.mp3"]=grove_a ["Lazy Prehistoric Grove (1).mp3"]=grove_b ["Agile Exploration.mp3"]=run_a ["Agile Exploration (1).mp3"]=run_b ["Agile Exploration (2).mp3"]=run_c ["Agile Exploration (3).mp3"]=run_d )
for f in "${!NAME[@]}"; do
  ffmpeg -hide_banner -loglevel error -y -i "../suno_originaly/$f" -c:a libopus -b:a 56k -vbr on -application audio "public/music/${NAME[$f]}.ogg"
done
# Velikosti souborů do seznamu modelů (hlídá je test).
node -e "const fs=require('fs');const p='public/nature/manifest.json';const m=JSON.parse(fs.readFileSync(p));for(const x of m)x.bytes=fs.statSync('public/nature/'+x.id+'.glb').size;fs.writeFileSync(p,JSON.stringify(m,null,1));"
du -sh public/models public/nature public/music
