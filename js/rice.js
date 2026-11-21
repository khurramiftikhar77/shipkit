// RICE and ICE prioritization calculator. Data is saved in this browser only.
(() => {
  'use strict';
  const { store, toast, copyText, downloadCsv, esc, num, fmt } = window.ShipKit;
  const KEY = 'shipkit.rice.v1';

  const IMPACT = [
    { v: 3, label: '3 (massive)' },
    { v: 2, label: '2 (high)' },
    { v: 1, label: '1 (medium)' },
    { v: 0.5, label: '0.5 (low)' },
    { v: 0.25, label: '0.25 (minimal)' },
  ];
  const CONFIDENCE = [
    { v: 100, label: '100% (high)' },
    { v: 80, label: '80% (medium)' },
    { v: 50, label: '50% (low)' },
  ];

  const sample = () => ({
    mode: 'rice',
    rows: [
      { name: 'Onboarding checklist', reach: 2000, impact: 2, confidence: 80, effort: 2, i: 8, c: 7, e: 6 },
      { name: 'Dark mode', reach: 5000, impact: 0.5, confidence: 100, effort: 1, i: 4, c: 9, e: 8 },
      { name: 'Single sign-on (SSO)', reach: 300, impact: 3, confidence: 80, effort: 4, i: 9, c: 6, e: 3 },
      { name: 'CSV import', reach: 800, impact: 1, confidence: 50, effort: 1, i: 6, c: 5, e: 8 },
      { name: 'Slack integration', reach: 1200, impact: 1, confidence: 80, effort: 3, i: 6, c: 7, e: 5 },
    ],
  });
  const blankRow = () => ({ name: '', reach: 100, impact: 1, confidence: 80, effort: 1, i: 5, c: 5, e: 5 });

  let state = store.get(KEY, null);
  if (!state || !Array.isArray(state.rows)) state = sample();

  const body = document.getElementById('rice-body');
  const head = document.getElementById('rice-head');
  const ranking = document.getElementById('rice-ranking');
  const modeButtons = document.querySelectorAll('[data-mode]');
  const formulaEl = document.getElementById('active-formula');

  const clamp10 = (n) => Math.min(10, Math.max(1, n));
  function score(row) {
    if (state.mode === 'ice') return clamp10(num(row.i, 1)) * clamp10(num(row.c, 1)) * clamp10(num(row.e, 1));
    const effort = num(row.effort);
    if (effort <= 0) return 0;
    return (num(row.reach) * num(row.impact) * (num(row.confidence) / 100)) / effort;
  }

  function ranked() {
    return state.rows
      .map((row, index) => ({ row, index, score: score(row) }))
      .sort((a, b) => b.score - a.score);
  }

  const save = () => store.set(KEY, state);

  function options(list, value) {
    return list.map((o) => `<option value="${o.v}"${Number(value) === o.v ? ' selected' : ''}>${o.label}</option>`).join('');
  }

  function renderHead() {
    head.innerHTML = state.mode === 'ice'
      ? '<tr><th>Rank</th><th>Feature or idea</th><th>Impact (1-10)</th><th>Confidence (1-10)</th><th>Ease (1-10)</th><th>ICE score</th><th><span class="sr-only">Remove</span></th></tr>'
      : '<tr><th>Rank</th><th>Feature or idea</th><th>Reach <small>(users / quarter)</small></th><th>Impact</th><th>Confidence</th><th>Effort <small>(person-months)</small></th><th>RICE score</th><th><span class="sr-only">Remove</span></th></tr>';
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    formulaEl.textContent = state.mode === 'ice'
      ? 'ICE score = Impact × Confidence × Ease'
      : 'RICE score = (Reach × Impact × Confidence) ÷ Effort';
  }

  function renderBody() {
    body.innerHTML = state.rows.map((row, i) => {
      const name = `<td><input type="text" data-k="name" value="${esc(row.name)}" placeholder="Feature name" aria-label="Feature name"></td>`;
      const cells = state.mode === 'ice'
        ? `<td><input type="number" min="1" max="10" step="1" data-k="i" value="${esc(row.i)}" aria-label="Impact 1 to 10"></td>
           <td><input type="number" min="1" max="10" step="1" data-k="c" value="${esc(row.c)}" aria-label="Confidence 1 to 10"></td>
           <td><input type="number" min="1" max="10" step="1" data-k="e" value="${esc(row.e)}" aria-label="Ease 1 to 10"></td>`
        : `<td><input type="number" min="0" step="1" data-k="reach" value="${esc(row.reach)}" aria-label="Reach"></td>
           <td><select data-k="impact" aria-label="Impact">${options(IMPACT, row.impact)}</select></td>
           <td><select data-k="confidence" aria-label="Confidence">${options(CONFIDENCE, row.confidence)}</select></td>
           <td><input type="number" min="0.1" step="0.5" data-k="effort" value="${esc(row.effort)}" aria-label="Effort in person-months"></td>`;
      return `<tr data-i="${i}"><td><span class="rank" data-rank></span></td>${name}${cells}
        <td class="num"><span data-score></span><div class="bar"><i data-bar></i></div></td>
        <td><button type="button" class="btn btn-ghost btn-sm" data-remove aria-label="Remove row">✕</button></td></tr>`;
    }).join('');
    updateScores();
  }

  function updateScores() {
    const list = ranked();
    const max = Math.max(...list.map((r) => r.score), 0) || 1;
    list.forEach((item, position) => {
      const tr = body.querySelector(`tr[data-i="${item.index}"]`);
      if (!tr) return;
      tr.querySelector('[data-rank]').textContent = position + 1;
      tr.querySelector('[data-score]').textContent = fmt(item.score, 1);
      tr.querySelector('[data-bar]').style.width = `${(item.score / max) * 100}%`;
      tr.classList.toggle('top', position === 0 && item.score > 0);
    });
    ranking.innerHTML = list.length
      ? list.map((item, p) => `<li><strong>${esc(item.row.name || 'Untitled idea')}</strong> <span class="muted">(${fmt(item.score, 1)})</span>${p === 0 ? ' <span class="badge">Do first</span>' : ''}</li>`).join('')
      : '<li class="muted">Add an idea to see the ranking.</li>';
  }

  body.addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-i]');
    const key = e.target.dataset.k;
    if (!tr || !key) return;
    const row = state.rows[Number(tr.dataset.i)];
    row[key] = key === 'name' ? e.target.value : num(e.target.value);
    save();
    updateScores();
  });

  body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    state.rows.splice(Number(btn.closest('tr').dataset.i), 1);
    save();
    renderBody();
  });

  modeButtons.forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    save();
    renderHead();
    renderBody();
  }));

  document.getElementById('add-row').addEventListener('click', () => {
    state.rows.push(blankRow());
    save();
    renderBody();
    const inputs = body.querySelectorAll('input[data-k="name"]');
    inputs[inputs.length - 1].focus();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Replace your list with the sample ideas?')) return;
    const mode = state.mode;
    state = sample();
    state.mode = mode;
    save();
    renderBody();
    toast('Sample data loaded');
  });

  document.getElementById('clear').addEventListener('click', () => {
    if (!confirm('Remove all ideas from the list?')) return;
    state.rows = [blankRow()];
    save();
    renderBody();
  });

  function tableRows() {
    const list = ranked();
    if (state.mode === 'ice') {
      return [['Rank', 'Feature', 'Impact', 'Confidence', 'Ease', 'ICE score'],
        ...list.map((x, p) => [p + 1, x.row.name, x.row.i, x.row.c, x.row.e, fmt(x.score, 1)])];
    }
    return [['Rank', 'Feature', 'Reach', 'Impact', 'Confidence', 'Effort', 'RICE score'],
      ...list.map((x, p) => [p + 1, x.row.name, x.row.reach, x.row.impact, `${x.row.confidence}%`, x.row.effort, fmt(x.score, 1)])];
  }

  document.getElementById('export-csv').addEventListener('click', () => {
    downloadCsv(`${state.mode}-prioritization.csv`, tableRows());
  });

  document.getElementById('copy-md').addEventListener('click', () => {
    const rows = tableRows();
    const line = (r) => `| ${r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`;
    const md = [line(rows[0]), `|${rows[0].map(() => ' --- |').join('')}`, ...rows.slice(1).map(line)].join('\n');
    copyText(md, 'Table copied. Paste it into Notion, Jira or Confluence.');
  });

  renderHead();
  renderBody();
})();
