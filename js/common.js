// Shared helpers for every ShipKit page: footer year, AdSense slots, storage, toast, copy, CSV.
(() => {
  'use strict';

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Storage can be blocked (private mode, disabled site data), so every call is guarded.
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not saved, page still works */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
  };

  let toastTimer;
  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function copyText(text, message = 'Copied') {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      try { document.execCommand('copy'); } catch { toast('Copy failed. Select and copy by hand.'); area.remove(); return; }
      area.remove();
    }
    toast(message);
  }

  function download(filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    download(filename, `﻿${csv}`, 'text/csv;charset=utf-8');
  }

  function esc(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function num(value, fallback = 0) {
    const n = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }

  function fmt(n, digits = 1) {
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }

  window.ShipKit = { store, toast, copyText, download, downloadCsv, esc, num, fmt };

  // Ad slots are filled only once the Worker has set window.SITE_ADS with a unit ID.
  const config = window.SITE_ADS;
  if (!config || !config.client) return;
  document.querySelectorAll('.ad-slot[data-ad]').forEach((slot) => {
    const id = config.slots && config.slots[slot.dataset.ad];
    if (!id) return;
    const label = document.createElement('span');
    label.className = 'ad-label';
    label.textContent = 'Advertisement';
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = config.client;
    ins.dataset.adSlot = id;
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';
    slot.append(label, ins);
    slot.hidden = false;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense could not fill a slot', err);
    }
  });
})();
