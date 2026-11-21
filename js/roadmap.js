// Now / Next / Later roadmap builder with PNG export. Data is saved in this browser only.
(() => {
  'use strict';
  const { store, toast, download, esc } = window.ShipKit;
  const KEY = 'shipkit.roadmap.v1';

  const LANES = [
    { id: 'now', name: 'Now', hint: 'In progress or starting this quarter' },
    { id: 'next', name: 'Next', hint: 'Planned once Now is done' },
    { id: 'later', name: 'Later', hint: 'Ideas we believe in, not yet planned' },
  ];
  const THEMES = [
    { id: 'growth', name: 'Growth', color: '#3b5bdb' },
    { id: 'retention', name: 'Retention', color: '#1f8a5b' },
    { id: 'revenue', name: 'Revenue', color: '#d9480f' },
    { id: 'platform', name: 'Platform', color: '#7048e8' },
    { id: 'quality', name: 'Quality', color: '#c2255c' },
    { id: 'research', name: 'Research', color: '#868e96' },
  ];
  const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
  const uid = () => Math.random().toString(36).slice(2, 10);

  const sample = () => ({
    title: 'Product roadmap',
    lanes: {
      now: [
        { id: uid(), title: 'Self-serve onboarding checklist', theme: 'growth' },
        { id: uid(), title: 'Fix slow dashboard loading', theme: 'quality' },
      ],
      next: [
        { id: uid(), title: 'Annual billing plans', theme: 'revenue' },
        { id: uid(), title: 'Usage reminder emails', theme: 'retention' },
      ],
      later: [
        { id: uid(), title: 'Public API', theme: 'platform' },
        { id: uid(), title: 'Interview 10 churned customers', theme: 'research' },
      ],
    },
  });

  let state = store.get(KEY, null);
  if (!state || !state.lanes) state = sample();
  LANES.forEach((l) => { if (!Array.isArray(state.lanes[l.id])) state.lanes[l.id] = []; });
  const save = () => store.set(KEY, state);

  const board = document.getElementById('board');
  const titleEl = document.getElementById('roadmap-title');

  function render() {
    titleEl.textContent = state.title;
    board.innerHTML = LANES.map((lane, li) => {
      const items = state.lanes[lane.id];
      return `<section class="lane" data-lane="${lane.id}" aria-label="${lane.name}">
        <h2>${lane.name} <span class="count">${items.length}</span></h2>
        <p class="hint">${lane.hint}</p>
        <div class="items">${items.map((item, ii) => card(item, li, ii, items.length)).join('')}</div>
        <form class="lane-add" data-add="${lane.id}">
          <input type="text" name="title" placeholder="Add to ${lane.name}" aria-label="New item for ${lane.name}" maxlength="140">
          <button type="submit" class="btn btn-sm">Add</button>
        </form>
      </section>`;
    }).join('');
  }

  function card(item, li, ii, count) {
    const t = themeOf(item.theme);
    const opts = THEMES.map((x) => `<option value="${x.id}"${x.id === t.id ? ' selected' : ''}>${x.name}</option>`).join('');
    return `<article class="item" data-id="${item.id}" style="border-left-color:${t.color}">
      <div class="item-title" contenteditable="true" role="textbox" aria-label="Item title" spellcheck="true">${esc(item.title)}</div>
      <div class="item-meta">
        <select data-theme aria-label="Theme">${opts}</select>
        <div class="moves">
          <button type="button" data-move="left" aria-label="Move to ${li > 0 ? LANES[li - 1].name : ''}" ${li === 0 ? 'disabled' : ''}>←</button>
          <button type="button" data-move="up" aria-label="Move up" ${ii === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-move="down" aria-label="Move down" ${ii === count - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-move="right" aria-label="Move to ${li < 2 ? LANES[li + 1].name : ''}" ${li === 2 ? 'disabled' : ''}>→</button>
          <button type="button" class="del" data-move="delete" aria-label="Delete item">✕</button>
        </div>
      </div>
    </article>`;
  }

  function locate(id) {
    for (const lane of LANES) {
      const index = state.lanes[lane.id].findIndex((x) => x.id === id);
      if (index >= 0) return { lane: lane.id, index };
    }
    return null;
  }

  board.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-add]');
    if (!form) return;
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    state.lanes[form.dataset.add].push({ id: uid(), title, theme: 'growth' });
    save();
    render();
    board.querySelector(`[data-add="${form.dataset.add}"] input`).focus();
  });

  board.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-move]');
    if (!btn) return;
    const id = btn.closest('.item').dataset.id;
    const at = locate(id);
    if (!at) return;
    const list = state.lanes[at.lane];
    const laneIndex = LANES.findIndex((l) => l.id === at.lane);
    const move = btn.dataset.move;
    if (move === 'delete') {
      list.splice(at.index, 1);
    } else if (move === 'up' && at.index > 0) {
      [list[at.index - 1], list[at.index]] = [list[at.index], list[at.index - 1]];
    } else if (move === 'down' && at.index < list.length - 1) {
      [list[at.index + 1], list[at.index]] = [list[at.index], list[at.index + 1]];
    } else if (move === 'left' || move === 'right') {
      const target = LANES[laneIndex + (move === 'left' ? -1 : 1)];
      if (!target) return;
      const [item] = list.splice(at.index, 1);
      state.lanes[target.id].push(item);
    }
    save();
    render();
    const again = board.querySelector(`.item[data-id="${id}"] [data-move="${move}"]`);
    if (again && !again.disabled) again.focus();
  });

  board.addEventListener('change', (e) => {
    if (!e.target.matches('[data-theme]')) return;
    const at = locate(e.target.closest('.item').dataset.id);
    if (!at) return;
    state.lanes[at.lane][at.index].theme = e.target.value;
    e.target.closest('.item').style.borderLeftColor = themeOf(e.target.value).color;
    save();
  });

  // Inline title editing: Enter saves, paste stays plain text.
  function plainPaste(e) {
    if (!e.target.isContentEditable) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  }
  function enterBlurs(e) {
    if (e.target.isContentEditable && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  }
  [board, titleEl].forEach((el) => {
    el.addEventListener('paste', plainPaste);
    el.addEventListener('keydown', enterBlurs);
  });

  board.addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('item-title')) return;
    const at = locate(e.target.closest('.item').dataset.id);
    if (!at) return;
    const text = e.target.textContent.trim();
    if (!text) { e.target.textContent = state.lanes[at.lane][at.index].title; return; }
    state.lanes[at.lane][at.index].title = text;
    save();
  });

  titleEl.addEventListener('blur', () => {
    const text = titleEl.textContent.trim();
    state.title = text || 'Product roadmap';
    titleEl.textContent = state.title;
    save();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Replace your roadmap with the sample?')) return;
    state = sample();
    save();
    render();
    toast('Sample roadmap loaded');
  });

  document.getElementById('clear').addEventListener('click', () => {
    if (!confirm('Remove every item from the roadmap?')) return;
    LANES.forEach((l) => { state.lanes[l.id] = []; });
    save();
    render();
  });

  /* ---------------- PNG export (drawn by hand on a canvas) ---------------- */

  function wrap(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    // Break single words that are still too long.
    return lines.flatMap((l) => {
      if (ctx.measureText(l).width <= maxWidth) return [l];
      const parts = [];
      let cur = '';
      [...l].forEach((ch) => {
        if (ctx.measureText(cur + ch).width > maxWidth && cur) { parts.push(cur); cur = ch; } else cur += ch;
      });
      if (cur) parts.push(cur);
      return parts;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function exportPng() {
    const scale = 2;
    const W = 1500;
    const pad = 48;
    const gap = 24;
    const colW = (W - pad * 2 - gap * 2) / 3;
    const cardPad = 16;
    const lineH = 24;
    const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `600 17px ${font}`;
    const laid = LANES.map((lane) => state.lanes[lane.id].map((item) => {
      const lines = wrap(measure, item.title, colW - cardPad * 2 - 8);
      return { item, lines, h: cardPad * 2 + lines.length * lineH + 26 };
    }));
    const colHeights = laid.map((cards) => cards.reduce((s, c) => s + c.h + 12, 0));
    const headerH = 150;
    const laneHead = 70;
    const H = headerH + laneHead + Math.max(160, ...colHeights) + 40 + 60;

    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#f7f8fb';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#141a2b';
    ctx.font = `800 40px ${font}`;
    ctx.textBaseline = 'top';
    ctx.fillText(state.title, pad, pad, W - pad * 2);
    ctx.fillStyle = '#5a6478';
    ctx.font = `400 18px ${font}`;
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`Updated ${date}`, pad, pad + 56);

    LANES.forEach((lane, i) => {
      const x = pad + i * (colW + gap);
      const y = headerH;
      ctx.fillStyle = '#eef1f7';
      roundRect(ctx, x, y, colW, H - y - 60, 16);
      ctx.fill();
      ctx.fillStyle = '#141a2b';
      ctx.font = `800 24px ${font}`;
      ctx.fillText(lane.name, x + 20, y + 18);
      ctx.fillStyle = '#5a6478';
      ctx.font = `400 15px ${font}`;
      ctx.fillText(lane.hint, x + 20, y + 48, colW - 40);

      let cy = y + laneHead + 12;
      laid[i].forEach(({ item, lines, h }) => {
        const t = themeOf(item.theme);
        const cx = x + 14;
        const cw = colW - 28;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(20,26,43,0.08)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        roundRect(ctx, cx, cy, cw, h, 10);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = t.color;
        roundRect(ctx, cx, cy, 6, h, 3);
        ctx.fill();
        ctx.fillStyle = '#141a2b';
        ctx.font = `600 17px ${font}`;
        lines.forEach((l, li) => ctx.fillText(l, cx + cardPad + 6, cy + cardPad + li * lineH));
        ctx.fillStyle = t.color;
        ctx.font = `700 13px ${font}`;
        ctx.fillText(t.name.toUpperCase(), cx + cardPad + 6, cy + cardPad + lines.length * lineH + 6);
        cy += h + 12;
      });
    });

    ctx.fillStyle = '#9aa3b8';
    ctx.font = `400 14px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText('Made with ShipKit roadmap builder: shipkit.khurramiftikhar.com', W - pad, H - 40);

    canvas.toBlob((blob) => {
      if (!blob) { toast('Export failed. Try again.'); return; }
      const name = (state.title || 'roadmap').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'roadmap';
      download(`${name}.png`, blob);
      toast('Roadmap image downloaded');
    }, 'image/png');
  }

  document.getElementById('export-png').addEventListener('click', exportPng);
  render();
})();
