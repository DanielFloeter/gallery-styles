# Plan: Upload-Reihenfolge als ID-Liste statt als Block-Snapshot

Ausgangslage: `innerBlockImagesDB` hält einen Snapshot ganzer Block-Objekte
(`src/hooks.js:160`), der Toggle dreht ihn mit `innerBlockImagesDB.reverse()`
in-place um (`src/hooks.js:400`), und `orderBy === 'db'` setzt den Snapshot
direkt als neue Inner-Blocks ein (`src/hooks.js:325`).

Daraus folgen drei Fehler:

1. Das `reverse()` läuft in **jedem** Sortiermodus und kippt den Snapshot auch
   dann, wenn gerade nach EXIF oder Titel sortiert wird. „As uploaded" hängt
   danach von der Klick-Historie ab.
2. `db` ist nicht idempotent: alle anderen Kriterien leiten die Reihenfolge aus
   `sortOrder` ab, `db` dreht pro Toggle-Klick einmal um. Ein reiner Wechsel von
   `orderBy` auf `db` ignoriert `sortOrder` komplett.
3. Der Snapshot veraltet. Ein Wechsel auf „As uploaded" spielt alte Captions,
   Alt-Texte und `sizeSlug` zurück, lässt seither hinzugefügte Bilder
   verschwinden und gelöschte wieder auftauchen.

Ziel: `db` wird ein Sortierkriterium wie jedes andere. Gespeichert wird nur noch
die Reihenfolge der Attachment-IDs, nie der Blockinhalt.

---

## Schritt 1 — Neues Attribut `uploadOrder` registrieren

In `src/index.js` neben `innerBlockImagesDB` ergänzen:

```js
uploadOrder: {
    type: 'array',
    default: []
}
```

`innerBlockImagesDB` **bleibt registriert**. Bestandsinhalte tragen das Attribut
im Block-Kommentar; wird es entfernt, laufen diese Galerien in einen
Block-Validierungsfehler. Es wird ab Schritt 2 nur noch gelesen.

*Fertig, wenn:* eine bestehende Galerie sich ohne Validierungswarnung öffnet.

## Schritt 2 — Snapshot auf IDs umstellen, inklusive Migration

Der Block in `src/hooks.js:157` schreibt künftig IDs statt Blöcke:

```js
uploadOrder: innerBlockImages.map((image) => image.attributes.id)
```

Die Bedingung bleibt wie in `e235847` etabliert (`.every(e => e?.attributes?.id)`,
nicht-leeres `innerBlockImages`), sie prüft nur `uploadOrder.length === 0`.

Dabei gleich mit erledigen: der Aufruf steht heute **im Render-Pfad**. In ein
`useEffect` mit `[uploadOrder.length, innerBlockImages]` verschieben — ein
`setAttributes()` während des Renderns ist ein Seiteneffekt am falschen Ort.

### Migration: gesetzt

Ist `uploadOrder` leer und `innerBlockImagesDB` gefüllt, wird einmalig
`innerBlockImagesDB.map((b) => b.attributes.id)` übernommen — **nicht** neu aus
den aktuellen Inner-Blocks geschnappschießt.

Begründet durch die Bestandsdaten in der lokalen DB (`wordpress-6-4`): Post 73
steht auf `orderBy: "date"`, der Snapshot hält `[74, 75, 76, 77]`, die Blöcke
liegen aber als `[75, 77, 76, 74]` im Content. Der Snapshot ist dort die einzige
verbliebene Spur der Upload-Reihenfolge. Neu schnappschießen würde
„As uploaded" für diese Galerie dauerhaft auf die Datums-Reihenfolge festlegen —
nicht wiederherstellbar und von außen nicht als Fehler erkennbar.

### Parity-Korrektur: bewusst verworfen

Der Snapshot wird **unverändert** übernommen, ohne Rücksicht auf `sortOrder`.

Überlegung dahinter: `innerBlockImagesDB.reverse()` mutiert das Array im Store,
das benachbarte `setAttributes({orderBy, sortOrder})` markiert den Post dirty,
also müsste die umgedrehte Reihenfolge mitgespeichert werden. Wäre das so,
stünde der Snapshot bei `sortOrder: true` verkehrt herum im Content und gehörte
beim Migrieren einmal zurückgedreht.

Nachweisen lässt sich das an den Bestandsdaten nicht: in **keiner** gespeicherten
Galerie steht `sortOrder` überhaupt drin. Gutenberg lässt Attribute weg, die auf
dem Default stehen, und der Default ist `false` — es hat also nie jemand den
Toggle umgelegt und gespeichert. Die Korrektur wäre damit eine Vermutung, die
nur Galerien beträfe, die es hier nicht gibt, und die bei falscher Vermutung
genau den Fehler einbaut, den sie verhindern soll. Der Schaden ist in beide
Richtungen ein Toggle-Klick.

Verifikation, falls es später doch jemanden trifft — siehe Testfall C unten.

*Fertig, wenn:* eine neue Galerie nach dem Upload eine ID-Liste im
Block-Kommentar stehen hat, und Post 73 beim ersten Öffnen
`uploadOrder: [74, 75, 76, 77]` bekommt.

## Schritt 3 — `db` in den Comparator ziehen

In `getSortValue()` (`src/hooks.js:266`) ergänzen:

```js
case 'db': {
    const index = uploadOrder.indexOf(image?.attributes?.id);
    return index === -1 ? undefined : index;
}
```

`undefined` für unbekannte IDs greift die bestehende Regel in `compareImages()`
auf: nicht lesbarer Wert → `0` → Position bleibt. `Array.prototype.sort` ist
seit ES2019 stabil, später hinzugefügte Bilder behalten also definiert ihre
relative Lage, statt an eine willkürliche Stelle zu rutschen.

*Fertig, wenn:* ein Bild, das nach dem Snapshot hinzugefügt wurde, beim Wechsel
auf „As uploaded" nicht springt und nichts verschwindet.

## Schritt 4 — Sonderweg in `updateImages` entfernen

`src/hooks.js:319` verliert die Fallunterscheidung:

```js
replaceInnerBlocks(
    clientId,
    [...(innerBlockImages ?? [])].sort((a, b) =>
        compareImages(a, b, orderBy, sortOrder)
    )
);
```

Damit bekommt `replaceInnerBlocks` immer die **aktuellen** Blöcke in neuer
Reihenfolge und nie einen Snapshot — Fehler 3 ist damit erledigt.

*Fertig, wenn:* eine Caption, die nach dem Upload getippt wurde, einen Wechsel
auf „As uploaded" und zurück übersteht.

## Schritt 5 — `reverse()` aus dem Toggle entfernen

`src/hooks.js:399` schrumpft auf:

```js
onChange={(sortOrder) => updateImages(sortOrder, orderBy)}
```

Fehler 1 und 2 fallen damit weg: `sortOrder` wirkt für `db` über denselben
`sortOrder ? 1 : -1`-Zweig wie für alle anderen Kriterien.

*Fertig, wenn:* der Toggle in „As uploaded" die Reihenfolge umdreht, und
dreimaliges Umlegen des Toggles in „EXIF created" die Reihenfolge von
„As uploaded" unverändert lässt.

## Schritt 6 — Attributtypen korrigieren

`src/index.js:54 ff.` deklariert Typen teils als JS-Konstruktoren statt als die
von der Block-API erwarteten Strings:

| Attribut | ist | soll |
| --- | --- | --- |
| `blendMode` | `String` | `'string'` |
| `disableCaption` | `Boolean` | `'boolean'` |
| `textBlendMode` | `Boolean` | `'boolean'` |
| `fontSize` | `String` | `'string'` |
| `sortOrder` | `Boolean` | `'boolean'` |
| `orderBy` | `String` | `'string'` |
| `innerBlockImagesDB` | `Object` | `'array'` |

`lineColor`, `foreground` und `background` sind bereits korrekt. Fällt heute
nicht auf, weil keines der Attribute eine `source` hat, ist aber stiller Ballast
bei der Attributvalidierung. Eigener Commit — inhaltlich unabhängig von
Schritt 1–5.

*Fertig, wenn:* `npm run build` durchläuft und eine Bestandsgalerie weiterhin
ohne Validierungswarnung lädt.

---

## Testfälle mit echten Bestandsdaten

Automatisierte Tests gibt es im Repo nicht. `getSortValue()` und
`compareImages()` stecken außerdem im Component-Body und sind von außen nicht
aufrufbar — wer sie unit-testen will, müsste sie auf Modulebene ziehen und
`media` bzw. `uploadOrder` als Parameter übergeben. Bis dahin: im Editor gegen
die vorhandenen Posts in `wordpress-6-4` prüfen.

Ablesen lässt sich der Zustand in der Browser-Console des Editors:

```js
const g = wp.data
    .select('core/block-editor')
    .getBlocks()
    .find((b) => b.name === 'core/gallery');
console.log('uploadOrder', g.attributes.uploadOrder);
console.log('live       ', g.innerBlocks.map((b) => b.attributes.id));
```

### Testfall A — Post 73: Migration rettet die Upload-Reihenfolge

Der wichtigste Fall, er trägt die Entscheidung aus Schritt 2.

Ausgangszustand im Content: `orderBy: "date"`, Snapshot `[74, 75, 76, 77]`,
Blöcke `[75, 77, 76, 74]`.

| Schritt | Erwartung |
| --- | --- |
| Post öffnen | `uploadOrder` → `[74, 75, 76, 77]`, live bleibt `[75, 77, 76, 74]` |
| „Order by" → „As uploaded" | live wird `[74, 75, 76, 77]` |
| Toggle „Sort order" | live wird `[77, 76, 75, 74]` |
| zurück auf „WP date" | live wird wieder `[75, 77, 76, 74]` bzw. umgekehrt |

Fällt `uploadOrder` beim Öffnen auf `[75, 77, 76, 74]`, greift die Migration
nicht und es wurde neu geschnappschießt — das ist der Fehler, den Schritt 2
verhindern soll.

### Testfall B — Post 59: Bilder ohne Snapshot-Eintrag

Ausgangszustand: Snapshot `[61, 62]`, Blöcke `[61, 62, 63, 64]`. 63 und 64 kamen
nach dem Snapshot dazu und haben keinen Index.

| Schritt | Erwartung |
| --- | --- |
| Post öffnen | `uploadOrder` → `[61, 62]` |
| „Order by" → „As uploaded" | kein Console-Fehler, **kein** Bild verschwindet, live hat weiter vier Einträge |
| Position von 63 und 64 | unverändert relativ zueinander — `indexOf === -1` → `undefined` → `compareImages` gibt `0` zurück, `sort` ist stabil |

Der alte Code hätte hier den Snapshot als Inner-Blocks eingesetzt und 63 und 64
aus der Galerie geworfen.

### Testfall C — Parity: nur falls die Frage später akut wird

Klärt die in Schritt 2 offengelassene Frage, ob das alte `reverse()` persistiert.
Braucht eine Galerie mit `sortOrder: true`, die es in den Bestandsdaten nicht
gibt — also mit dem **alten** Build erzeugen:

1. Neue Galerie, vier Bilder hochladen, Reihenfolge notieren.
2. Toggle „Sort order" **genau einmal** umlegen.
3. Speichern, Post neu laden, `post_content` ansehen.

Steht `innerBlockImagesDB` dort umgekehrt zur notierten Upload-Reihenfolge, dann
persistiert die In-place-Mutation und die Migration braucht bei
`sortOrder: true` ein zusätzliches `.reverse()`. Steht sie in Upload-Reihenfolge,
bleibt es wie in Schritt 2 beschlossen.

### Neue Galerie — Durchlauf ohne Altlasten

1. Neue Galerie, vier Bilder über den Placeholder hochladen.
2. Jedes „Order by" einmal durchschalten — keine Console-Fehler, Reihenfolge
   plausibel.
3. Toggle in jedem Modus einmal umlegen — die Reihenfolge dreht sich um.
4. In „EXIF created" den Toggle dreimal umlegen, dann auf „As uploaded":
   Upload-Reihenfolge unverändert. (Genau das ging vorher kaputt.)
5. Caption an Bild 1 tippen, auf „WP Title" und zurück auf „As uploaded":
   Caption noch da.
6. Fünftes Bild hinzufügen, auf „As uploaded": nichts verschwindet.
7. Speichern, neu laden: Reihenfolge und `uploadOrder` erhalten, im
   Block-Kommentar steht eine ID-Liste statt eines Blockbaums.

## Commit-Aufteilung

- Schritt 1–2: `Store the upload order as image ids`
- Schritt 3–5: `Sort by upload order through the shared comparator`
- Schritt 6: `Use the block API's attribute type names`
