/* Cyber Sleuth deck logic — LIVE edition.
   Presenter deck is the source of truth: it publishes the current phase/question
   to Firebase; phones follow. Deck subscribes to players + answers for the live
   counter, tally bars, and the real leaderboard. No simulation.
*/
(function () {
  'use strict';

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "quizBase": "https://lebstein.github.io/Cyberslueth/quiz.html",
    "timerSeconds": 30
  }/*EDITMODE-END*/;
  window.CYBER_TWEAKS = { ...TWEAK_DEFAULTS };

  const live = window.SleuthLive;
  // Presenter-popup thumbnail instances (?_snthumb=...#N) render the deck at
  // other slides — they must NEVER publish state or run timers.
  const IS_THUMB = /[?&]_snthumb=/.test(location.search);

  // ---- Session code (persists across presenter reloads) ----
  function newCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }
  let SESSION = null;
  try { SESSION = localStorage.getItem('sleuth-session'); } catch (e) {}
  if (!SESSION) {
    SESSION = newCode();
    try { localStorage.setItem('sleuth-session', SESSION); } catch (e) {}
  }
  window.SLEUTH_SESSION = SESSION;

  // ---- Live state ----
  let players = {};   // pid -> {name, joined}
  let answers = {};   // 'q1'.. -> pid -> {letter, ms}
  let CORRECT = {};   // qNum -> letter

  function getSlideSections() {
    const stage = document.querySelector('deck-stage');
    return stage ? Array.from(stage.children).filter(c => c.tagName === 'SECTION') : [];
  }

  // ---- QR codes ----
  function quizUrl() {
    const base = (window.CYBER_TWEAKS.quizBase || '').trim() || window.location.href.replace(/[^/]*(\?.*)?$/, '') + 'quiz.html';
    return base + (base.includes('?') ? '&' : '?') + 's=' + SESSION;
  }

  function qrImg(text, size) {
    const img = document.createElement('img');
    img.alt = 'QR code';
    img.width = size; img.height = size;
    img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;display:block;';
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&margin=8&data=' + encodeURIComponent(text);
    img.onerror = () => {
      img.replaceWith(Object.assign(document.createElement('div'), {
        textContent: text,
        style: 'font-family:var(--font-body);color:#6b6760;font-size:14px;padding:12px;text-align:center;word-break:break-all;'
      }));
    };
    return img;
  }

  function renderQRCodes() {
    const jobs = [
      { id: 'join-qr', url: quizUrl(), size: 320 },
      { id: 'cheat-qr', url: 'https://pact-one.com/becoming-a-cyber-sleuth/', size: 240 },
      { id: 'review-qr', url: 'https://pact-one.com/feedback', size: 260 },
      { id: 'refer-qr', url: 'https://pact-one.com/referral', size: 260 }
    ];
    for (const j of jobs) {
      const el = document.getElementById(j.id);
      if (!el) continue;
      el.innerHTML = '';
      el.appendChild(qrImg(j.url, j.size));
    }
    const joinUrlEl = document.getElementById('join-url');
    if (joinUrlEl) joinUrlEl.textContent = quizUrl();
    document.querySelectorAll('[data-session-code]').forEach(el => { el.textContent = SESSION; });
  }

  // ---- Publish presenter state ----
  function publish(state) {
    if (!live.configured || IS_THUMB) return;
    live.ref(SESSION, 'state').set(state);
  }

  // ---- Timers (presenter display) ----
  let timerInterval = null;
  function setRingProgress(ring, remaining, total) {
    const fill = ring.querySelector('.fill');
    const digit = ring.querySelector('.digit');
    if (!fill || !digit) return;
    const circumference = 2 * Math.PI * 80;
    fill.setAttribute('stroke-dasharray', circumference.toFixed(2));
    fill.setAttribute('stroke-dashoffset', (circumference * (1 - remaining / total)).toFixed(2));
    digit.textContent = Math.max(0, Math.ceil(remaining)).toString();
    const warn = remaining <= 5;
    fill.style.stroke = warn ? '#c2362d' : '';
    digit.style.color = warn ? '#c2362d' : '';
  }
  function startSlideTimer(section) {
    stopTimer();
    if (IS_THUMB) return;
    const rings = section.querySelectorAll('.timer-ring[data-timer]');
    if (!rings.length) return;
    const total = section.hasAttribute('data-quiz')
      ? (window.CYBER_TWEAKS.timerSeconds || 30)
      : (Number(rings[0].getAttribute('data-timer')) || 30);
    let remaining = total;
    rings.forEach(r => setRingProgress(r, remaining, total));
    timerInterval = setInterval(() => {
      remaining -= 1;
      rings.forEach(r => setRingProgress(r, Math.max(0, remaining), total));
      if (remaining <= 0) stopTimer();
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // ---- Live renderers ----
  function playerCount() { return Object.keys(players).length; }

  function renderPlayerCount() {
    document.querySelectorAll('[data-player-count]').forEach(el => { el.textContent = String(playerCount()); });
  }

  function countsFor(q) {
    const c = { A: 0, B: 0, C: 0, D: 0 };
    const set = answers['q' + q] || {};
    for (const pid in set) {
      const l = set[pid] && set[pid].letter;
      if (c[l] != null) c[l] += 1;
    }
    return c;
  }

  function renderTally(q) {
    const tallies = document.querySelectorAll('[data-tally="' + q + '"]');
    if (!tallies.length) return;
    const counts = countsFor(q);
    const max = Math.max(counts.A, counts.B, counts.C, counts.D, 1);
    tallies.forEach(tally => {
      tally.querySelectorAll('.tally-row').forEach(row => {
        const letter = row.getAttribute('data-letter');
        const fill = row.querySelector('.tfill');
        const count = row.querySelector('.tcount');
        if (fill) fill.style.width = ((counts[letter] / max) * 100) + '%';
        if (count) count.textContent = String(counts[letter]);
      });
    });
  }

  function renderAnsweredCounter(section, q) {
    const label = section.querySelector('.timer-ring') && section.querySelector('.timer-ring').parentElement.querySelector('.small-text');
    if (!label) return;
    const counts = countsFor(q);
    const n = counts.A + counts.B + counts.C + counts.D;
    label.textContent = n + ' of ' + playerCount() + ' answered';
  }

  // ---- Leaderboard from real answers ----
  // Kahoot-style speed scoring: a correct answer earns 500–1000 points,
  // scaled linearly by how much of the timer was left when it was entered.
  function pointsFor(ans, duration) {
    const dur = (duration || 30) * 1000;
    const frac = Math.min(Math.max((ans.ms || 0) / dur, 0), 1);
    return Math.round(1000 - 500 * frac);
  }
  function computeScores() {
    const dur = window.CYBER_TWEAKS.timerSeconds || 30;
    const scores = {}; // pid -> {name, pts, correct}
    for (const pid in players) scores[pid] = { name: players[pid].name || 'Sleuth', pts: 0, correct: 0 };
    for (let q = 1; q <= 6; q++) {
      const set = answers['q' + q] || {};
      for (const pid in set) {
        if (!scores[pid]) scores[pid] = { name: 'Sleuth', pts: 0, correct: 0 };
        if (set[pid].letter === CORRECT[q]) {
          scores[pid].correct += 1;
          scores[pid].pts += pointsFor(set[pid], dur);
        }
      }
    }
    return Object.values(scores).sort((a, b) => b.pts - a.pts || b.correct - a.correct);
  }

  function renderLeaderboard() {
    const slides = getSlideSections();
    const slide = slides.find(s => (s.getAttribute('data-label') || '').includes('Final scoreboard'));
    if (!slide) return;
    const ranked = computeScores();
    const steps = { 1: slide.querySelector('.step[data-rank="1"]'), 2: slide.querySelector('.step[data-rank="2"]'), 3: slide.querySelector('.step[data-rank="3"]') };
    for (let r = 1; r <= 3; r++) {
      const p = ranked[r - 1];
      if (!steps[r]) continue;
      steps[r].querySelector('[data-name]').textContent = p ? p.name : '—';
      steps[r].querySelector('[data-pts]').textContent = (p ? p.pts.toLocaleString() : 0) + ' pts';
    }
    let totalCorrect = 0, answered = 0;
    for (let q = 1; q <= 6; q++) {
      const set = answers['q' + q] || {};
      for (const pid in set) { answered += 1; if (set[pid].letter === CORRECT[q]) totalCorrect += 1; }
    }
    const avg = answered ? Math.round((totalCorrect / answered) * 100) : 0;
    const avgEl = slide.querySelector('[data-room-avg]');
    if (avgEl) avgEl.textContent = avg + '%';
    const lineEl = slide.querySelector('[data-room-line]');
    if (lineEl) lineEl.textContent = 'Correct answers across ' + playerCount() + ' participants';
    return { ranked, avg };
  }

  function publishResults() {
    if (!live.configured) return;
    const out = renderLeaderboard();
    if (!out) return;
    live.ref(SESSION, 'results').set({
      podium: out.ranked.slice(0, 3).map(p => ({ name: p.name, pts: p.pts, correct: p.correct })),
      avg: out.avg,
      players: playerCount()
    });
  }

  // ---- Click-to-reveal steps ----
  // deck-stage's tapzones/keyboard sit above the slide, so section clicks never
  // land. Instead we intercept the stage's forward-advance: while the current
  // slide has unrevealed steps, forward (click/tap/→/space) reveals the next
  // step; only after all are shown does it change slides. Back always navigates.
  function setupReveal(section) {
    if (!section || !section.hasAttribute('data-click-reveal')) return;
    section.querySelectorAll('.reveal-step').forEach(s => s.classList.remove('shown'));
  }
  function hookRevealAdvance() {
    const stage = document.querySelector('deck-stage');
    if (!stage || IS_THUMB || stage._revealHooked) return;
    stage._revealHooked = true;
    const orig = stage._advance.bind(stage);
    stage._advance = function (dir, reason) {
      if (dir === 1 && currentSection && currentSection.hasAttribute('data-click-reveal')) {
        const next = currentSection.querySelector('.reveal-step:not(.shown)');
        if (next) { next.classList.add('shown'); return; }
      }
      orig(dir, reason);
    };
  }

  // ---- Slide-change hook ----
  let currentSection = null;
  function onSlideChange(idx) {
    stopTimer();
    const section = getSlideSections()[idx];
    if (!section) return;
    currentSection = section;
    setupReveal(section);
    const label = section.getAttribute('data-label') || '';
    const qNum = section.getAttribute('data-quiz');
    const rNum = section.getAttribute('data-reveal');

    if (section.querySelector('#join-qr')) {
      publish({ phase: 'lobby' });
      startSlideTimer(section);
    } else if (qNum) {
      publish({ phase: 'question', q: Number(qNum), startedAt: live.configured ? live.TS() : Date.now(), duration: window.CYBER_TWEAKS.timerSeconds || 30 });
      startSlideTimer(section);
      renderAnsweredCounter(section, Number(qNum));
    } else if (rNum) {
      publish({ phase: 'reveal', q: Number(rNum) });
      renderTally(Number(rNum));
    } else if (label.includes('Final scoreboard')) {
      publish({ phase: 'final' });
      publishResults();
    }
  }

  // ---- Live subscriptions ----
  function subscribe() {
    if (!live.configured) return;
    live.ref(SESSION, 'players').on('value', s => {
      players = s.val() || {};
      renderPlayerCount();
      if (currentSection && (currentSection.getAttribute('data-label') || '').includes('Final scoreboard')) publishResults();
    });
    live.ref(SESSION, 'answers').on('value', s => {
      answers = s.val() || {};
      if (!currentSection) return;
      const qNum = currentSection.getAttribute('data-quiz');
      const rNum = currentSection.getAttribute('data-reveal');
      if (qNum) renderAnsweredCounter(currentSection, Number(qNum));
      if (rNum) renderTally(Number(rNum));
      if ((currentSection.getAttribute('data-label') || '').includes('Final scoreboard')) publishResults();
    });
  }

  function unsubscribe() {
    if (!live.configured) return;
    live.ref(SESSION, 'players').off();
    live.ref(SESSION, 'answers').off();
  }

  // ---- Offline badge ----
  function offlineBadge() {
    if (live.configured || IS_THUMB) return;
    const b = document.createElement('div');
    b.textContent = '⚠ LIVE DATA OFFLINE — paste your Firebase config into firebase-config.js (see README)';
    b.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;background:#c2362d;color:#fff;font:600 13px Poppins,sans-serif;padding:8px 16px;border-radius:999px;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(0,0,0,0.35);';
    document.body.appendChild(b);
  }

  // ---- Init ----
  function init() {
    getSlideSections().forEach(s => {
      const q = s.getAttribute('data-quiz');
      if (q) CORRECT[Number(q)] = s.getAttribute('data-correct') || 'C';
    });
    renderQRCodes();
    offlineBadge();
    hookRevealAdvance();
    if (!IS_THUMB) subscribe();
    renderPlayerCount();
    const stage = document.querySelector('deck-stage');
    onSlideChange((stage && stage.currentIndex) || 0);
  }

  window.addEventListener('message', e => {
    if (e.data && typeof e.data.slideIndexChanged === 'number') onSlideChange(e.data.slideIndexChanged);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ---- Tweaks API ----
  window.applyCyberTweaks = function (next) {
    window.CYBER_TWEAKS = { ...window.CYBER_TWEAKS, ...next };
    renderQRCodes();
  };
  window.sleuthNewSession = function () {
    unsubscribe();
    SESSION = newCode();
    window.SLEUTH_SESSION = SESSION;
    try { localStorage.setItem('sleuth-session', SESSION); } catch (e) {}
    players = {}; answers = {};
    if (live.configured) live.ref(SESSION, 'state').set({ phase: 'lobby' });
    subscribe();
    renderQRCodes();
    renderPlayerCount();
    return SESSION;
  };
})();
