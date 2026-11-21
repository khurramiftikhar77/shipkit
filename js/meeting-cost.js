// Meeting cost calculator with a live timer. Settings are saved in this browser only.
(() => {
  'use strict';
  const { store, copyText, num } = window.ShipKit;
  const KEY = 'shipkit.meeting.v1';
  const HOURS_PER_YEAR = 1800;  // working hours a year after holidays, used to convert salaries

  const defaults = { attendees: 6, rateType: 'hourly', rate: 60, currency: 'EUR', minutes: 60, weekly: true };
  const state = { ...defaults, ...store.get(KEY, {}) };
  const save = () => store.set(KEY, state);

  const form = document.getElementById('meeting-form');
  const out = {
    cost: document.getElementById('out-cost'),
    perMinute: document.getElementById('out-minute'),
    month: document.getElementById('out-month'),
    year: document.getElementById('out-year'),
    hourly: document.getElementById('out-hourly'),
    rateLabel: document.getElementById('rate-label'),
    live: document.getElementById('live-cost'),
    clock: document.getElementById('live-clock'),
  };

  const money = (n, digits = 0) => {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: state.currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n || 0);
    } catch {
      return `${(n || 0).toFixed(digits)} ${state.currency}`;
    }
  };

  // Cost per hour of the whole meeting (all attendees together).
  function hourlyEach() {
    const rate = Math.max(0, num(state.rate));
    return state.rateType === 'annual' ? rate / HOURS_PER_YEAR : rate;
  }
  const roomPerHour = () => Math.max(0, Math.round(num(state.attendees))) * hourlyEach();

  function fill() {
    Object.keys(defaults).forEach((k) => {
      const el = form.elements[k];
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!state[k];
      else if (el instanceof RadioNodeList) el.value = state[k];
      else el.value = state[k];
    });
  }

  function update() {
    const perHour = roomPerHour();
    const cost = perHour * Math.max(0, num(state.minutes)) / 60;
    out.cost.textContent = money(cost, 0);
    out.perMinute.textContent = money(perHour / 60, 2);
    out.hourly.textContent = money(hourlyEach(), 2);
    out.month.textContent = state.weekly ? money(cost * 52 / 12, 0) : 'n/a';
    out.year.textContent = state.weekly ? money(cost * 52, 0) : 'n/a';
    out.rateLabel.textContent = state.rateType === 'annual' ? 'Average annual salary' : 'Average hourly rate';
    tick();
  }

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.name) return;
    state[el.name] = el.type === 'checkbox' ? el.checked : (['currency', 'rateType'].includes(el.name) ? el.value : num(el.value));
    if (el.name === 'rateType') {
      // Switch to a sensible default when changing between hourly and salary.
      state.rate = el.value === 'annual' ? 90000 : 60;
      form.elements.rate.value = state.rate;
    }
    save();
    update();
  });

  /* Live timer */
  let elapsed = 0;   // ms banked from earlier runs
  let startedAt = 0; // timestamp of the current run, 0 when paused
  let timer = 0;
  const startBtn = document.getElementById('timer-start');
  const resetBtn = document.getElementById('timer-reset');

  const now = () => elapsed + (startedAt ? Date.now() - startedAt : 0);

  function tick() {
    const ms = now();
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    out.clock.textContent = `${hh}:${mm}:${ss}`;
    out.live.textContent = money(roomPerHour() * ms / 3600000, 2);
  }

  startBtn.addEventListener('click', () => {
    if (startedAt) {
      elapsed = now();
      startedAt = 0;
      clearInterval(timer);
      startBtn.textContent = 'Resume';
    } else {
      startedAt = Date.now();
      timer = setInterval(tick, 100);
      startBtn.textContent = 'Pause';
    }
    tick();
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timer);
    elapsed = 0;
    startedAt = 0;
    startBtn.textContent = 'Start meeting';
    tick();
  });

  document.getElementById('copy-cost').addEventListener('click', () => {
    const perHour = roomPerHour();
    const cost = perHour * num(state.minutes) / 60;
    let text = `This ${num(state.minutes)}-minute meeting with ${num(state.attendees)} people costs about ${money(cost)}.`;
    if (state.weekly) text += ` As a weekly meeting that is ${money(cost * 52)} a year.`;
    text += ' (Calculated with shipkit.khurramiftikhar.com/meeting-cost-calculator)';
    copyText(text, 'Copied. Paste it into Slack or the meeting invite.');
  });

  fill();
  update();
})();
