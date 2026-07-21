# GraphVisualizer iframe

Browserbasierter Graph Viewer als iframe-Application.

## Verhalten beim Start

Bei **jedem** Start wird:

1. `graph.dat.zst` neu heruntergeladen
2. `tokens.dat.zst` neu heruntergeladen
3. das Layout **neu berechnet**

Es wird **kein Cache** mehr verwendet.

## Feste Vorgaben

- Algorithmus: `drl`
- Filter-Limit: `500`

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
  src="http://127.0.0.1:8000/"
  width="1400"
  height="900"
  style="border:0"
></iframe>
```

## postMessage API

An iframe senden (`iframe.contentWindow.postMessage`):

```js
{ type: "graph:setToken", token: "hello" }
{ type: "graph:focusToken", token: "world" }
{ type: "graph:getState" }
```

Events vom iframe empfangen:

```js
window.addEventListener("message", (event) => {
  // event.data.type z. B. "graph:ready", "graph:state", "graph:selectionChanged"
});
```
