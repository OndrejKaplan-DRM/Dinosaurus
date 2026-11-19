# Dinoš — pokračování projektu

Začni README.md a SESSION_HANDOFF.md. Tento archiv 2.7 je autoritativní. Neupravuj starší pracovní kopii 2.6. Neobnovuj modely znovu, pokud jejich data nejsou měněna; všechny potřebné GLB, atlasy i vybrané originály jsou součástí balíčku. Před významnou další změnou ulož checkpoint v trvalém úložišti; dočasné pracovní prostředí se již opakovaně vracelo ke starší kopii.

Pracuj ve zdroje/. npm ci, npm test, npm run build; node tools/validate-build.mjs. Při změně přírody spusť node tools/render-nature-preview.mjs a prohlédni výsledky, především čitelnost překážek ve všech pruzích a viditelnost dinosaurů. Při změně GLB zkontroluj animované bounds po přehrání idle. Manifest zapisuj až po kompletním úspěšném převodu. Převodní skripty používají ../asset_sources/selection.json s relativními cestami.

Každý výstup musí zahrnout samostatné HTML i úplný archiv s hudbou, kódem, licencemi a aktualizovaným předáním. Zachovej totožnost existujících uložených souborů. Neslibuj test na fyzickém GPU, dokud neproběhl. Konkrétní věcná omezení zapiš do předání.
