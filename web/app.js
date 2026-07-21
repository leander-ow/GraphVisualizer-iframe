(() => {
  const BASE_EDGE_WIDTH = 3.0;
  const BOLD_EDGE_WIDTH = 10.0;
  const NODE_SIZE_MULTIPLIER = 1.0;

  const edgeCategories = {
    c: { directColor: '#ff8c00', transitiveColor: '#ffd700', enabled: false },
    a: { directColor: '#20a040', transitiveColor: '#90d090', enabled: false },
    b: { directColor: '#2070e0', transitiveColor: '#90c0f0', enabled: false },
  };

  const state = {
    tokens: [], pos: [], degree: [], originalGraph: {}, filtered: [],
    layout_duration: 0, layout_algorithm: 'drl', filter_limit: -1,
    context_count: 0, token_count: 0, graph_file_date: 'Unbekannt',
    sidebar_list_limit: 500, visible_limit: 300,
    selectedIndex: null, selectedEdge: null, selectedEdgeCategory: null,
    zoom: 1, offsetX: 0, offsetY: 0, dragging: false, lastMouseX: 0, lastMouseY: 0,
  };

  const el = {
    canvas: document.getElementById('graphCanvas'),
    ctx: document.getElementById('graphCanvas').getContext('2d'),
    info: document.getElementById('infoPanel'),
    search: document.getElementById('search'),
    selectedLabel: document.getElementById('selectedLabel'),
    listC: document.getElementById('list-c'),
    listA: document.getElementById('list-a'),
    listB: document.getElementById('list-b'),
    listFiltered: document.getElementById('list-filtered'),
    filteredHeading: document.getElementById('filteredHeading'),
    toggleC: document.getElementById('toggle-c'),
    toggleA: document.getElementById('toggle-a'),
    toggleB: document.getElementById('toggle-b'),
    relayoutBtn: document.getElementById('relayoutBtn'),
    relayoutDialog: document.getElementById('relayoutDialog'),
    algorithmSelect: document.getElementById('algorithmSelect'),
    filterLimitInput: document.getElementById('filterLimitInput'),
    dialogOk: document.getElementById('dialogOk'),
    busyOverlay: document.getElementById('busyOverlay'),
  };

  function resizeCanvas() {
    const r = el.canvas.getBoundingClientRect();
    el.canvas.width = Math.max(1, Math.floor(r.width * devicePixelRatio));
    el.canvas.height = Math.max(1, Math.floor(r.height * devicePixelRatio));
    el.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    draw();
  }

  function worldToScreen([x, y]) {
    const w = el.canvas.getBoundingClientRect().width;
    const h = el.canvas.getBoundingClientRect().height;
    return [x * state.zoom + state.offsetX + w / 2, y * state.zoom + state.offsetY + h / 2];
  }

  function screenToWorld(x, y) {
    const w = el.canvas.getBoundingClientRect().width;
    const h = el.canvas.getBoundingClientRect().height;
    return [(x - w / 2 - state.offsetX) / state.zoom, (y - h / 2 - state.offsetY) / state.zoom];
  }

  function distance2(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  function visibleIndices() {
    const r = el.canvas.getBoundingClientRect();
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(r.width, r.height);
    const minX = Math.min(topLeft[0], bottomRight[0]);
    const maxX = Math.max(topLeft[0], bottomRight[0]);
    const minY = Math.min(topLeft[1], bottomRight[1]);
    const maxY = Math.max(topLeft[1], bottomRight[1]);

    const out = [];
    for (let i = 0; i < state.pos.length; i++) {
      const p = state.pos[i];
      if (p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY) out.push(i);
    }
    return out;
  }

  function drawEdge(i, j, color, weight, bold) {
    const [x1, y1] = worldToScreen(state.pos[i]);
    const [x2, y2] = worldToScreen(state.pos[j]);
    el.ctx.strokeStyle = color;
    el.ctx.lineWidth = bold ? BOLD_EDGE_WIDTH : BASE_EDGE_WIDTH;
    el.ctx.beginPath();
    el.ctx.moveTo(x1, y1);
    el.ctx.lineTo(x2, y2);
    el.ctx.stroke();

    el.ctx.fillStyle = color;
    el.ctx.font = '12px monospace';
    el.ctx.textAlign = 'center';
    el.ctx.fillText(String(Math.round(weight * 100) / 100), (x1 + x2) / 2, (y1 + y2) / 2);
  }

  function getNodeContexts(index) {
    const cEntries = [], aEntries = [], bEntries = [];
    for (const key in state.originalGraph) {
      const [a, b] = key.split(',').map(Number);
      const values = state.originalGraph[key];
      if (a === index) for (const [c, f] of values) aEntries.push([b, c, f]);
      if (b === index) for (const [c, f] of values) bEntries.push([a, c, f]);
      for (const [c, f] of values) if (c === index) cEntries.push([a, b, f]);
    }
    return { cEntries, aEntries, bEntries };
  }

  function populateList(listEl, entries, textFn, dataFn) {
    listEl.innerHTML = '';
    const max = Math.min(entries.length, state.sidebar_list_limit);
    for (let i = 0; i < max; i++) {
      const entry = entries[i];
      const li = document.createElement('li');
      li.textContent = textFn(entry);
      li.dataset.edge = JSON.stringify(dataFn(entry));
      li.onclick = () => {
        const value = JSON.parse(li.dataset.edge);
        const same = state.selectedEdge && JSON.stringify(state.selectedEdge) === JSON.stringify(value);
        state.selectedEdge = same ? null : value;
        draw();
        renderLists();
      };
      if (state.selectedEdge && JSON.stringify(state.selectedEdge) === li.dataset.edge) li.classList.add('active');
      listEl.appendChild(li);
    }
    if (entries.length > state.sidebar_list_limit) {
      const li = document.createElement('li');
      li.textContent = `... (${entries.length - state.sidebar_list_limit} weitere)`;
      listEl.appendChild(li);
    }
  }

  function renderLists() {
    if (state.selectedIndex == null) {
      el.selectedLabel.textContent = 'Kein Knoten ausgewählt';
      el.listC.innerHTML = ''; el.listA.innerHTML = ''; el.listB.innerHTML = '';
      return;
    }

    const idx = state.selectedIndex;
    el.selectedLabel.textContent = `Ausgewählt: ${state.tokens[idx]}`;
    const { cEntries, aEntries, bEntries } = getNodeContexts(idx);

    populateList(
      el.listC,
      cEntries,
      (e) => `(${state.tokens[e[0]]}, ${state.tokens[e[1]]}) → ${state.tokens[idx]}   Gew: ${e[2]}`,
      (e) => [e[0], e[1], idx]
    );
    populateList(
      el.listA,
      aEntries,
      (e) => `(${state.tokens[idx]}, ${state.tokens[e[0]]}) → ${state.tokens[e[1]]}   Gew: ${e[2]}`,
      (e) => [idx, e[0], e[1]]
    );
    populateList(
      el.listB,
      bEntries,
      (e) => `(${state.tokens[e[0]]}, ${state.tokens[idx]}) → ${state.tokens[e[1]]}   Gew: ${e[2]}`,
      (e) => [e[0], idx, e[1]]
    );
  }

  function draw() {
    const r = el.canvas.getBoundingClientRect();
    el.ctx.clearRect(0, 0, r.width, r.height);

    if (!state.pos.length) return;

    if (state.selectedIndex != null) {
      const idx = state.selectedIndex;
      const { cEntries, aEntries, bEntries } = getNodeContexts(idx);
      for (const [cat, entries] of [['c', cEntries], ['a', aEntries], ['b', bEntries]]) {
        const conf = edgeCategories[cat];
        if (!conf.enabled) continue;

        const direct = new Map();
        const trans = new Map();

        for (const entry of entries) {
          let a, b, c, f;
          if (cat === 'c') { [a, b, f] = entry; c = idx; }
          else if (cat === 'a') { [b, c, f] = entry; a = idx; }
          else { [a, c, f] = entry; b = idx; }

          const w = f + 1;
          const k1 = [Math.min(b, c), Math.max(b, c)].join(',');
          const k2 = [Math.min(a, b), Math.max(a, b)].join(',');
          direct.set(k1, (direct.get(k1) || 0) + w);
          trans.set(k2, (trans.get(k2) || 0) + w * 0.5);
        }

        for (const [k, w] of direct.entries()) {
          const [x, y] = k.split(',').map(Number);
          const bold = state.selectedEdge &&
            JSON.stringify([Math.min(state.selectedEdge[1], state.selectedEdge[2]), Math.max(state.selectedEdge[1], state.selectedEdge[2])]) === JSON.stringify([x, y]);
          drawEdge(x, y, conf.directColor, w, bold);
        }

        for (const [k, w] of trans.entries()) {
          const [x, y] = k.split(',').map(Number);
          const bold = state.selectedEdge &&
            JSON.stringify([Math.min(state.selectedEdge[0], state.selectedEdge[1]), Math.max(state.selectedEdge[0], state.selectedEdge[1])]) === JSON.stringify([x, y]);
          drawEdge(x, y, conf.transitiveColor, w, bold);
        }
      }
    }

    for (let i = 0; i < state.pos.length; i++) {
      const [x, y] = worldToScreen(state.pos[i]);
      const size = NODE_SIZE_MULTIPLIER * (Math.sqrt(state.degree[i]) + 2.0);
      el.ctx.beginPath();
      el.ctx.arc(x, y, size, 0, Math.PI * 2);
      el.ctx.fillStyle = i === state.selectedIndex ? '#ff0000' : 'rgba(80,180,255,0.75)';
      el.ctx.fill();
    }

    const vis = visibleIndices();
    if (vis.length <= state.visible_limit) {
      el.ctx.font = '12px Arial';
      for (const i of vis) {
        const [x, y] = worldToScreen(state.pos[i]);
        el.ctx.fillStyle = i === state.selectedIndex ? '#ff0000' : '#cccccc';
        el.ctx.fillText(state.tokens[i], x + 4, y - 6);
      }
    }

    el.info.textContent =
      `Token: ${vis.length}/${state.token_count}\n` +
      `Kontexte: ${state.context_count}\n` +
      `Layout Algorithmus: ${state.layout_algorithm}\n` +
      `Berechnungszeit: ${state.layout_duration.toFixed(2)}s\n` +
      `Aktualität: ${state.graph_file_date}`;
  }

  function selectNode(index) {
    if (state.selectedIndex !== index) {
      state.selectedEdge = null;
      state.selectedEdgeCategory = null;
    }
    state.selectedIndex = index;
    renderLists();
    draw();
    emit({ type: 'graph:selectionChanged', selectedIndex: index, selectedToken: index == null ? null : state.tokens[index] });
  }

  function focusNode(index) {
    if (index == null) return;
    const target = state.pos[index];
    state.offsetX = -target[0] * state.zoom;
    state.offsetY = -target[1] * state.zoom;
    draw();
  }

  function findNodeAt(clientX, clientY) {
    const rect = el.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let found = null;
    let best = Infinity;
    for (let i = 0; i < state.pos.length; i++) {
      const p = worldToScreen(state.pos[i]);
      const size = NODE_SIZE_MULTIPLIER * (Math.sqrt(state.degree[i]) + 2.0);
      const d2 = distance2([x, y], p);
      if (d2 <= size * size && d2 < best) {
        best = d2;
        found = i;
      }
    }
    return found;
  }

  async function fetchStateFromServer() {
    const params = new URLSearchParams(location.search);
    const q = new URLSearchParams();
    for (const key of ['token', 'algorithm', 'filter_limit']) {
      if (params.has(key)) q.set(key, params.get(key));
    }
    const res = await fetch(`/api/state?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load state');
    const data = await res.json();

    state.tokens = data.tokens;
    state.pos = data.pos;
    state.degree = data.degree;
    state.originalGraph = data.original_graph;
    state.filtered = data.filtered;
    state.layout_duration = data.layout_duration;
    state.layout_algorithm = data.layout_algorithm;
    state.filter_limit = data.filter_limit;
    state.context_count = data.context_count;
    state.token_count = data.token_count;
    state.graph_file_date = data.graph_file_date;
    state.sidebar_list_limit = data.sidebar_list_limit;
    state.visible_limit = data.visible_limit;

    edgeCategories.c.enabled = el.toggleC.checked;
    edgeCategories.a.enabled = el.toggleA.checked;
    edgeCategories.b.enabled = el.toggleB.checked;

    el.algorithmSelect.value = state.layout_algorithm;
    el.filterLimitInput.value = String(state.filter_limit);

    renderFilteredList();

    if (typeof data.selected_index === 'number') {
      selectNode(data.selected_index);
      focusNode(data.selected_index);
    } else {
      selectNode(null);
    }

    autoFit();
    draw();
    emit({ type: 'graph:ready' });
  }

  function renderFilteredList() {
    el.listFiltered.innerHTML = '';
    const filteredIndices = [];
    for (let i = 0; i < state.filtered.length; i++) if (state.filtered[i]) filteredIndices.push(i);

    if (state.filter_limit === -1) {
      el.filteredHeading.textContent = 'Filter deaktiviert';
      el.listFiltered.style.display = 'none';
    } else {
      el.filteredHeading.textContent = `Gefilterte Token: ${filteredIndices.length} (Limit ${state.filter_limit} Verbindungen)`;
      el.listFiltered.style.display = 'block';
    }

    for (const i of filteredIndices) {
      const li = document.createElement('li');
      li.textContent = state.tokens[i];
      li.onclick = () => {
        selectNode(i);
        focusNode(i);
      };
      el.listFiltered.appendChild(li);
    }
  }

  function autoFit() {
    if (!state.pos.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of state.pos) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const w = el.canvas.getBoundingClientRect().width;
    const h = el.canvas.getBoundingClientRect().height;
    const spanX = Math.max(1e-6, maxX - minX);
    const spanY = Math.max(1e-6, maxY - minY);
    state.zoom = Math.min(w / spanX, h / spanY) * 0.85;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    state.offsetX = -cx * state.zoom;
    state.offsetY = -cy * state.zoom;
  }

  function showBusy() { el.busyOverlay.hidden = false; }
  function hideBusy() { el.busyOverlay.hidden = true; }

  async function recomputeLayout(algorithm, filter_limit) {
    showBusy();
    try {
      const res = await fetch('/api/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, filter_limit }),
      });
      if (!res.ok) throw new Error('Recompute failed');
      const data = await res.json();

      state.tokens = data.tokens;
      state.pos = data.pos;
      state.degree = data.degree;
      state.originalGraph = data.original_graph;
      state.filtered = data.filtered;
      state.layout_duration = data.layout_duration;
      state.layout_algorithm = data.layout_algorithm;
      state.filter_limit = data.filter_limit;
      state.context_count = data.context_count;
      state.token_count = data.token_count;
      state.graph_file_date = data.graph_file_date;

      renderFilteredList();
      selectNode(null);
      autoFit();
      draw();
      emit({ type: 'graph:layoutRecomputed', algorithm: state.layout_algorithm, filter_limit: state.filter_limit });
    } finally {
      hideBusy();
    }
  }

  function emit(payload) {
    window.parent?.postMessage(payload, '*');
  }

  window.addEventListener('message', async (event) => {
    const msg = event.data || {};
    if (!msg.type) return;

    if (msg.type === 'graph:setToken' || msg.type === 'graph:focusToken') {
      if (typeof msg.token === 'string') {
        const idx = state.tokens.indexOf(msg.token);
        if (idx >= 0) {
          selectNode(idx);
          focusNode(idx);
        }
      }
    } else if (msg.type === 'graph:recomputeLayout') {
      const algorithm = msg.algorithm || state.layout_algorithm;
      const filterLimit = Number.isFinite(msg.filter_limit) ? msg.filter_limit : state.filter_limit;
      await recomputeLayout(algorithm, filterLimit);
    } else if (msg.type === 'graph:getState') {
      emit({
        type: 'graph:state',
        selectedIndex: state.selectedIndex,
        selectedToken: state.selectedIndex == null ? null : state.tokens[state.selectedIndex],
        layout_algorithm: state.layout_algorithm,
        filter_limit: state.filter_limit,
        token_count: state.token_count,
        context_count: state.context_count,
      });
    }
  });

  function bindUI() {
    window.addEventListener('resize', resizeCanvas);

    el.toggleC.onchange = () => { edgeCategories.c.enabled = el.toggleC.checked; draw(); };
    el.toggleA.onchange = () => { edgeCategories.a.enabled = el.toggleA.checked; draw(); };
    el.toggleB.onchange = () => { edgeCategories.b.enabled = el.toggleB.checked; draw(); };

    el.search.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const i = state.tokens.indexOf(el.search.value);
      if (i >= 0) { selectNode(i); focusNode(i); }
    });

    el.relayoutBtn.onclick = () => {
      el.algorithmSelect.value = state.layout_algorithm;
      el.filterLimitInput.value = String(state.filter_limit);
      el.relayoutDialog.showModal();
    };

    el.dialogOk.onclick = async (e) => {
      e.preventDefault();
      el.relayoutDialog.close();
      await recomputeLayout(el.algorithmSelect.value, parseInt(el.filterLimitInput.value, 10));
    };

    el.canvas.addEventListener('click', (e) => {
      const idx = findNodeAt(e.clientX, e.clientY);
      if (idx == null) selectNode(null);
      else selectNode(state.selectedIndex === idx ? null : idx);
    });

    el.canvas.addEventListener('mousedown', (e) => {
      state.dragging = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => { state.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.offsetX += dx;
      state.offsetY += dy;
      draw();
    });

    el.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = el.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const before = screenToWorld(mx, my);
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      state.zoom = Math.max(0.01, Math.min(1e6, state.zoom * factor));
      const after = screenToWorld(mx, my);

      state.offsetX += (after[0] - before[0]) * state.zoom;
      state.offsetY += (after[1] - before[1]) * state.zoom;
      draw();
    }, { passive: false });
  }

  bindUI();
  resizeCanvas();
  fetchStateFromServer().catch((err) => {
    console.error(err);
    el.info.textContent = 'Fehler beim Laden des Graphen.';
  });
})();
