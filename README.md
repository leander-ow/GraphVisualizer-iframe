# GraphVisualizer iframe

Browserbasierter Graph Viewer mit identischem Funktionsumfang zum ursprünglichen Desktop-Viewer.

## Features

- Token-Graph-Visualisierung mit Canvas
- Auswahl von Knoten per Klick
- Suche nach Token
- Sidebar mit Kontextlisten:
  - Als Ziel-Token: `(a, b) -> c`
  - Als erstes Kontext-Token: `(a, b) -> c`
  - Als zweites Kontext-Token: `(a, b) -> c`
- Ein-/Ausblenden der Kanten je Kategorie
- Hervorhebung ausgewählter Knoten/Kanten
- Gefilterte Token-Liste (basierend auf Verbindungs-Limit)
- Layout neu berechnen (Algorithmen wie im Original)
- Info-Panel mit Metriken
- Cache für Layout + Metadaten
- iframe-ready mit URL-Parametern und postMessage-API

## Start

```bash
python main.py
```

Server startet standardmäßig auf `http://127.0.0.1:8000`.

## Umgebungsvariablen

Siehe `.env.example`.

## iframe Nutzung

```html
<iframe
  src="http://127.0.0.1:8000/?algorithm=drl&filter_limit=-1"
  width="1400"
  height="900"
  style="border:0"
></iframe>
```

## URL-Parameter

- `algorithm`: `drl|fr|kk|graphopt|lgl|mds|circle|grid|random`
- `filter_limit`: Integer (`-1` deaktiviert Filter)
- `token`: initial auszuwählendes Token

## postMessage API

An iframe senden (`iframe.contentWindow.postMessage`):

```js
{ type: "graph:setToken", token: "hello" }
{ type: "graph:focusToken", token: "world" }
{ type: "graph:recomputeLayout", algorithm: "fr", filter_limit: 100 }
{ type: "graph:getState" }
```

Events vom iframe empfangen:

```js
window.addEventListener("message", (event) => {
  // event.data.type z. B. "graph:ready", "graph:state", "graph:selectionChanged"
});
```
