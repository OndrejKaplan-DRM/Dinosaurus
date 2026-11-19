# Dinoš 2.5 — příčiny a ověření oprav

## Podřep

Příčina byla konkrétní: 3D model při podřepu přecházel na zastavenou referenční animaci. Skript pro náhradní atlas navíc generoval šestkrát stejný okamžik. Země správně pokračovala vpřed, ale nohy stály.

Oprava zachovává stabilní nízký trup a přidává protifázový pohyb kyčlí, kolen a kotníků. Jeden cyklus odpovídá 4,2 m uběhnuté dráhy. Tentýž údaj vybírá jeden ze šesti nových snímků úsporného režimu. Nohy jsou přisazované k zemi a zvuk kroků zůstává aktivní i v podřepu. Při generování atlasu se před každou pózou resetuje transformace kořene; vizuální kontrola zachytila závislost prvního snímku na předchozím úhlu modelu a ta je také opravená.

Test skutečné kostry sleduje celý cyklus na 48 pozicích: obě nohy vykazují pohyb, model zůstává pod kládou (1,16 m), nohy se nezanořují a pauza zastaví pózu. Další test porovnává skutečné pixely všech šesti snímků atlasu, aby se nevrátilo opakování jediné pózy. Kontaktní přehled snímků byl vizuálně zkontrolován.

## Hudba

Nahrávky nebyly ztracené. Výběr byl příliš úzký a interval čekal na konec celé skladby. Nový přehrávač přidává interval 60–95 sekund, širší seznamy, ruční přeskočení a pozdější náhodný začátek uvnitř již dříve hrané skladby. Zdroj je plánovaně zastaven na konci vybraného úseku. Zachováno pravidlo jediného hudebního hlasu.

## Ověření

- 58 automatických testů: všechny prošly. Výpis TESTY_2_5.txt.
- Nové testy: desetiminutová obměna šesti dlouhých skladeb, všechny čtyři skladby menu před opakováním, ruční přeskočení včetně opakovaných kliknutí, celý cyklus kostry v podřepu a rozdílné snímky atlasu.
- Build a kontrola vložených dat: dva parsovatelné skripty, 36 binárních assetů a čtyři fonty; data odpovídají zdrojům.
- Zachované testy: kolize a ocas, skoky, podřep pod kládou, Rapier, směr cesty, počasí a den/noc, volný háj i předchozí ochrany proti překrývání hudby.

Interaktivní prohlížeč používá Canvas fallback, protože zde nemá WebGL. Oprava kostry je navíc ověřena výpočtem skutečných deformovaných vertexů; skutečný GPU obraz a subjektivní poslech zvuku zde ověřené nejsou.

## Interaktivní zkouška výsledného HTML

V prohlížeči byla spuštěna verze 2.5.0: klidná výprava, podřep držením šipky dolů a tlačítko Další skladba. Bez ručního zásahu se počet spuštění zvýšil z 1 na 3 (z původního Agile Exploration III až na Lazy Prehistoric Grove I). Následující kliknutí změnilo skladbu na Agile Exploration I, počet spuštění 4. Ve všech odečtech byl právě jeden hudební hlas a nula chyb dekódování. Vizuálně byl zkontrolován podřep a šest rozdílných snímků jeho cyklu. Testovací prohlížeč má přibližně 1 FPS, takže plynulost na běžném zařízení tímto nehodnotíme.
