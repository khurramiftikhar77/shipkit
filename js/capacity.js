// Sprint capacity calculator. Data is saved in this browser only.
(() => {
  'use strict';
  const { store, toast, copyText, esc, num, fmt } = window.ShipKit;
  const KEY = 'shipkit.capacity.v1';

  const sample = () => ({
    sprintDays: 10,
    hoursPerDay: 8,
    focus: 70,
    pastVelocity: 40,
    pastPersonDays: 45,
    team: [
      { name: 'Alex', availability: 100, daysOff: 0 },
      { name: 'Sam', availability: 100, daysOff: 2 },
      { name: 'Priya', availability: 80, daysOff: 0 },
      { name: 'Jonas', availability: 50, daysOff: 1 },
      { name: 'Mia', availability: 100, daysOff: 0 },
    ],
  });

  let state = store.get(KEY, null);
  if (!state || !Array.isArray(state.team)) state = sample();
  const save = () => store.set(KEY, state);

  const settings = document.getElementById('cap-settings');
  const body = document.getElementById('team-body');
  const out = {
    days: document.getElementById('out-days'),
    hours: document.getElementById('out-hours'),
    focus: document.getElementById('out-focus'),
    points: document.getElementById('out-points'),
    pointsNote: document.getElementById('out-points-note'),
  };

  function fillSettings() {
    settings.querySelectorAll('[data-s]').forEach((input) => {
      const v = state[input.dataset.s];
      input.value = v === null || v === undefined ? '' : v;
    });
  }

  function member(m) {
    const days = Math.max(0, num(state.sprintDays) - num(m.daysOff)) * Math.min(100, Math.max(0, num(m.availability))) / 100;
    const hours = days * num(state.hoursPerDay);
    const focus = hours * Math.min(100, Math.max(0, num(state.focus))) / 100;
    return { days, hours, focus };
  }

  function totals() {
    return state.team.reduce((t, m) => {
      const r = member(m);
      t.days += r.days; t.hours += r.hours; t.focus += r.focus;
      return t;
    }, { days: 0, hours: 0, focus: 0 });
  }

  function forecast(t) {
    const v = num(state.pastVelocity);
    const d = num(state.pastPersonDays);
    if (v > 0 && d > 0) return (v * t.days) / d;
    return null;
  }

  function renderBody() {
    body.innerHTML = state.team.map((m, i) => `<tr data-i="${i}">
      <td><input type="text" data-k="name" value="${esc(m.name)}" placeholder="Name" aria-label="Team member name"></td>
      <td><input type="number" min="0" max="100" step="5" data-k="availability" value="${esc(m.availability)}" aria-label="Availability percent"></td>
      <td><input type="number" min="0" step="0.5" data-k="daysOff" value="${esc(m.daysOff)}" aria-label="Days off"></td>
      <td class="num" data-days></td><td class="num" data-focus></td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-remove aria-label="Remove team member">✕</button></td>
    </tr>`).join('');
    update();
  }

  function update() {
    body.querySelectorAll('tr[data-i]').forEach((tr) => {
      const r = member(state.team[Number(tr.dataset.i)]);
      tr.querySelector('[data-days]').textContent = fmt(r.days, 1);
      tr.querySelector('[data-focus]').textContent = `${fmt(r.focus, 1)} h`;
    });
    const t = totals();
    out.days.textContent = fmt(t.days, 1);
    out.hours.textContent = fmt(t.hours, 0);
    out.focus.textContent = fmt(t.focus, 0);
    const f = forecast(t);
    out.points.textContent = f === null ? 'n/a' : fmt(f, 0);
    out.pointsNote.textContent = f === null
      ? 'Add past velocity and past person-days to forecast'
      : 'Forecast story points this sprint';
  }

  settings.addEventListener('input', (e) => {
    const k = e.target.dataset.s;
    if (!k) return;
    state[k] = e.target.value === '' ? null : num(e.target.value);
    save();
    update();
  });

  body.addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-i]');
    const k = e.target.dataset.k;
    if (!tr || !k) return;
    state.team[Number(tr.dataset.i)][k] = k === 'name' ? e.target.value : num(e.target.value);
    save();
    update();
  });

  body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    state.team.splice(Number(btn.closest('tr').dataset.i), 1);
    save();
    renderBody();
  });

  document.getElementById('add-member').addEventListener('click', () => {
    state.team.push({ name: '', availability: 100, daysOff: 0 });
    save();
    renderBody();
    const inputs = body.querySelectorAll('input[data-k="name"]');
    inputs[inputs.length - 1].focus();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Replace your team with the sample data?')) return;
    state = sample();
    save();
    fillSettings();
    renderBody();
    toast('Sample data loaded');
  });

  document.getElementById('copy-summary').addEventListener('click', () => {
    const t = totals();
    const f = forecast(t);
    const lines = [
      `Sprint capacity (${fmt(num(state.sprintDays), 1)} working days, ${fmt(num(state.focus), 0)}% focus factor)`,
      ...state.team.map((m) => {
        const r = member(m);
        return `- ${m.name || 'Unnamed'}: ${fmt(r.days, 1)} days, ${fmt(r.focus, 1)} focus hours`;
      }),
      `Total: ${fmt(t.days, 1)} person-days, ${fmt(t.hours, 0)} hours, ${fmt(t.focus, 0)} focus hours`,
    ];
    if (f !== null) lines.push(`Forecast: about ${fmt(f, 0)} story points`);
    copyText(lines.join('\n'), 'Summary copied. Paste it into your sprint planning notes.');
  });

  fillSettings();
  renderBody();
})();
