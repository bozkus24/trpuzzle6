/* ==========================================================================
   FoxiMax — Türkçe günlük kelime bulmacası
   Mekanik: harfleri tek tek tahmin et. Harf kelimede varsa açığa çıkar;
   yoksa ızgaraya yeni bir kelime eklenir ve bir can gider. 8 yanlışta oyun biter.
   ========================================================================== */

(function () {
  "use strict";

  // ---- Sabitler ----
  const MAX_WRONG = 8;
  const WORD_LEN = 5;
  const LAUNCH = new Date(2024, 0, 1); // #0 günü
  const KEY_ROWS = [
    ["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
    ["Z", "C", "V", "B", "N", "M", "Ö", "Ç"],
  ];
  const ALPHABET = new Set("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split(""));

  // ---- İkonlar (emoji yerine satır içi SVG) ----
  const ICONS = {
    moon:
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" fill="currentColor"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2" fill="currentColor"/>' +
      '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<line x1="12" y1="1.8" x2="12" y2="4.4"/><line x1="12" y1="19.6" x2="12" y2="22.2"/>' +
      '<line x1="1.8" y1="12" x2="4.4" y2="12"/><line x1="19.6" y1="12" x2="22.2" y2="12"/>' +
      '<line x1="4.6" y1="4.6" x2="6.4" y2="6.4"/><line x1="17.6" y1="17.6" x2="19.4" y2="19.4"/>' +
      '<line x1="4.6" y1="19.4" x2="6.4" y2="17.6"/><line x1="17.6" y1="6.4" x2="19.4" y2="4.6"/></g></svg>',
  };

  // ---- Yardımcılar ----
  const $ = (sel) => document.querySelector(sel);
  const trUpper = (ch) => ch.toLocaleUpperCase("tr-TR");
  const trLower = (ch) => ch.toLocaleLowerCase("tr-TR");

  // Deterministik PRNG (mulberry32)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledIndices(n, rng) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function localMidnight(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function puzzleNumber(d) {
    return Math.floor((localMidnight(d) - localMidnight(LAUNCH)) / 86400000);
  }

  // ---- Durum ----
  const state = {
    mode: "daily", // daily | practice
    order: [], // karışık kelime indeksleri
    ptr: 0, // order içinde sıradaki
    words: [], // ızgaradaki kelimeler
    guessed: new Set(), // tahmin edilen tüm harfler
    absent: new Set(), // kelimelerde olmayan (yanlış) harfler
    wrong: 0,
    status: "playing", // playing | won | lost
    puzzleNo: 0,
    seed: 0,
  };

  // ---- Kelime seçimi ----
  // Not: Yeni kelimeler önceden denenmiş (çıkmamış) harfleri içerebilir; bunlar
  // ızgarada doğrudan gri olarak gösterilir. Yalnızca yinelenen ya da tamamen
  // önceden tahmin edilmiş (eklenir eklenmez çözülmüş olacak) kelimeler atlanır.
  function pickNextWord() {
    const N = WORDS.length;
    for (let scanned = 0; scanned < N; scanned++) {
      const idx = state.order[state.ptr % N];
      state.ptr++;
      const w = WORDS[idx];
      if (state.words.includes(w)) continue;
      let allGuessed = true;
      for (const ch of w) {
        if (!state.guessed.has(ch)) { allGuessed = false; break; }
      }
      if (allGuessed) continue;
      return w;
    }
    return null; // teorik olarak ulaşılmaz
  }

  // ---- Kayıt/yükleme ----
  function dailyKey() { return "foximax-daily-" + state.puzzleNo; }
  function practiceKey() { return "foximax-practice-current"; }

  function saveGame() {
    const data = {
      order: state.order,
      ptr: state.ptr,
      words: state.words,
      guessed: [...state.guessed],
      absent: [...state.absent],
      wrong: state.wrong,
      status: state.status,
      seed: state.seed,
    };
    try {
      localStorage.setItem(
        state.mode === "daily" ? dailyKey() : practiceKey(),
        JSON.stringify(data)
      );
    } catch (e) {}
  }

  function loadSaved(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // ---- İstatistik (mod bazlı: günlük / antrenman ayrı) ----
  function statsKey(mode) {
    return mode === "daily" ? "foximax-stats" : "foximax-stats-practice";
  }
  function getStats(mode) {
    const def = { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWinNo: null, dist: {} };
    const s = Object.assign(def, loadSaved(statsKey(mode)) || {});
    if (!s.dist) s.dist = {};
    return s;
  }
  function saveStats(mode, s) {
    try { localStorage.setItem(statsKey(mode), JSON.stringify(s)); } catch (e) {}
  }
  function recordResult(mode, won, wordCount) {
    const s = getStats(mode);
    s.played += 1;
    if (won) {
      s.wins += 1;
      if (mode === "daily") {
        // seri: bir önceki gün kazanılmışsa uzat
        if (s.lastWinNo === state.puzzleNo - 1) s.currentStreak += 1;
        else s.currentStreak = 1;
        s.lastWinNo = state.puzzleNo;
      } else {
        s.currentStreak += 1;
      }
      if (s.currentStreak > s.maxStreak) s.maxStreak = s.currentStreak;
      s.dist[wordCount] = (s.dist[wordCount] || 0) + 1;
    } else {
      s.currentStreak = 0;
    }
    saveStats(mode, s);
  }

  // ---- Oyun kurulumu ----
  function startGame(mode, opts) {
    opts = opts || {};
    state.mode = mode;

    if (mode === "daily") {
      state.puzzleNo = puzzleNumber(new Date());
      const saved = loadSaved(dailyKey());
      if (saved && !opts.fresh) { restoreFrom(saved); return; }
      state.seed = 0x9e3779b1 ^ state.puzzleNo;
    } else {
      state.puzzleNo = 0;
      const saved = loadSaved(practiceKey());
      if (saved && !opts.fresh) { restoreFrom(saved); return; }
      // rastgele tohum
      state.seed = (Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }

    const rng = mulberry32(state.seed);
    state.order = shuffledIndices(WORDS.length, rng);
    state.ptr = 0;
    state.words = [];
    state.guessed = new Set();
    state.absent = new Set();
    state.wrong = 0;
    state.status = "playing";

    const first = pickNextWord();
    state.words.push(first);
    saveGame();
    render();
  }

  function restoreFrom(saved) {
    state.order = saved.order;
    state.ptr = saved.ptr;
    state.words = saved.words;
    state.guessed = new Set(saved.guessed);
    state.absent = new Set(saved.absent);
    state.wrong = saved.wrong;
    state.status = saved.status;
    state.seed = saved.seed;
    render();
    if (state.status !== "playing") {
      setTimeout(() => showEndModal(state.status === "won"), 300);
    }
  }

  // ---- Tahmin ----
  function isWordSolved(w) {
    for (const ch of w) if (!state.guessed.has(ch)) return false;
    return true;
  }
  function allSolved() {
    return state.words.every(isWordSolved);
  }

  function guess(letter) {
    if (state.status !== "playing") return;
    if (!ALPHABET.has(letter)) return;
    if (state.guessed.has(letter)) {
      if (state.absent.has(letter)) {
        flashMessage("'" + letter + "' harfi zaten denendi.");
      } else {
        flashMessage("'" + letter + "' harfi zaten bulunuyor.");
      }
      return;
    }

    state.guessed.add(letter);
    const present = state.words.some((w) => w.includes(letter));

    if (present) {
      render({ flip: letter });
      if (allSolved()) {
        state.status = "won";
        finishGame(true);
        return;
      }
      flashMessage("'" + letter + "' harfini buldun!");
    } else {
      state.absent.add(letter);
      state.wrong += 1;
      if (state.wrong >= MAX_WRONG) {
        state.status = "lost";
        render();
        finishGame(false);
        return;
      }
      // yeni kelime ekle (önceden denenmiş harfleri gri içerebilir)
      const w = pickNextWord();
      if (w) state.words.push(w);
      render({ dropLast: !!w });
      flashMessage("'" + letter + "' harfi bulunmuyor - yeni kelime eklendi.");
    }
    saveGame();
  }

  function finishGame(won) {
    render();
    saveGame();
    recordResult(state.mode, won, state.words.length);
    setTimeout(() => showEndModal(won), 650);
  }

  // ---- Render ----
  // opts.flip  : yeni açılan harf (o harfe ait tile'lara flip animasyonu)
  // opts.dropLast : true ise son (yeni eklenen) kelime satırı aşağı düşme animasyonuyla girer
  function render(opts) {
    opts = opts || {};
    const flip = opts.flip || null;

    // canlar
    const remaining = MAX_WRONG - state.wrong;
    let hearts = "";
    for (let i = 0; i < MAX_WRONG; i++) {
      hearts += i < remaining
        ? '<span style="color:var(--heart)">●</span>'
        : '<span style="color:var(--heart-lost)">○</span>';
    }
    $("#hearts").innerHTML = hearts;
    $("#wordcount").textContent = "Kelime: " + state.words.length;

    // tahta
    const board = $("#board");
    board.innerHTML = "";
    const lastIndex = state.words.length - 1;
    state.words.forEach((w, wi) => {
      const row = document.createElement("div");
      row.className = "word-row" + (opts.dropLast && wi === lastIndex ? " drop" : "");
      const solved = isWordSolved(w);
      for (const ch of w) {
        const tile = document.createElement("div");
        const shown = state.guessed.has(ch);
        let cls = "tile";
        if (shown) {
          const miss = state.absent.has(ch);
          cls += miss ? " miss" : " revealed";
          if (solved && !miss) cls += " solved-row";
          if (flip && ch === flip && !miss) cls += " flip";
          tile.textContent = ch;
        } else if (state.status === "lost") {
          cls += " miss";
          tile.textContent = ch;
        }
        tile.className = cls;
        row.appendChild(tile);
      }
      board.appendChild(row);
    });

    renderKeyboard();
  }

  function renderKeyboard() {
    const kb = $("#keyboard");
    kb.innerHTML = "";
    KEY_ROWS.forEach((rowLetters) => {
      const row = document.createElement("div");
      row.className = "kb-row";
      rowLetters.forEach((L) => {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.textContent = L;
        btn.dataset.letter = L;
        if (state.guessed.has(L)) {
          btn.disabled = true;
          btn.classList.add(state.absent.has(L) ? "absent" : "correct");
        }
        if (state.status !== "playing") btn.disabled = true;
        btn.addEventListener("click", () => guess(L));
        row.appendChild(btn);
      });
      kb.appendChild(row);
    });
  }

  // ---- Mesaj / toast ----
  let msgTimer;
  function flashMessage(txt) {
    const m = $("#message");
    m.textContent = txt;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { m.textContent = ""; }, 1400);
  }
  let toastTimer;
  function toast(txt) {
    const t = $("#toast");
    t.textContent = txt;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1600);
  }

  // ---- Modallar ----
  function openModal(id) { $(id).hidden = false; }
  function closeModal(el) { el.hidden = true; }

  function statsSummaryHTML(mode, s) {
    const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    const label = mode === "daily" ? "Günlük" : "Antrenman";
    return (
      '<div class="stats-lines">' +
      `<div class="stats-mode">${label} İstatistikleri</div>` +
      `<p>Oynanan: <b>${s.played}</b> oyun · Kazanma: <b>%${winPct}</b></p>` +
      `<p>Güncel seri: <b>${s.currentStreak}</b> · En iyi seri: <b>${s.maxStreak}</b></p>` +
      "</div>"
    );
  }

  // Galibiyet kaydı: kaç kelimeyle kazanıldığının dağılımı (1..8)
  function winRecordHTML(s, highlight) {
    const dist = s.dist || {};
    let max = 1;
    for (let k = 1; k <= MAX_WRONG; k++) max = Math.max(max, dist[k] || 0);
    let rows = "";
    for (let k = 1; k <= MAX_WRONG; k++) {
      const c = dist[k] || 0;
      const w = Math.max(9, Math.round((c / max) * 100));
      const cur = highlight === k ? " current" : "";
      rows +=
        `<div class="wr-row"><div class="wr-idx">${k}</div>` +
        `<div class="wr-bar-wrap"><div class="wr-bar${cur}" style="width:${w}%">${c}</div></div></div>`;
    }
    return (
      '<div class="win-record"><div class="wr-title">Galibiyet Kaydı — kelime sayısı</div>' +
      `<div class="wr-rows">${rows}</div></div>`
    );
  }

  function showStats() {
    const s = getStats(state.mode);
    $("#stats-body").innerHTML =
      statsSummaryHTML(state.mode, s) + winRecordHTML(s, null);
    openModal("#stats-modal");
  }

  function showEndModal(won) {
    const s = getStats(state.mode);
    $("#end-title").textContent = won ? "Kazandın!" : "Oyun bitti";
    $("#end-sub").textContent = won
      ? `Aferin! ${state.words.length} kelime ve ${state.guessed.size} harf kullandın.`
      : `Tüm canlar bitti. ${state.words.length} kelime açıldı.`;

    $("#end-stats").innerHTML =
      statsSummaryHTML(state.mode, s) +
      winRecordHTML(s, won ? state.words.length : null);

    if (state.mode === "daily") {
      $("#practice-again-btn").hidden = true;
      startCountdown();
    } else {
      $("#practice-again-btn").hidden = false;
      $("#countdown").textContent = "";
    }
    openModal("#end-modal");
  }

  // ---- Paylaşım ----
  function buildShareText() {
    const title = state.mode === "daily" ? `TilkiMaks #${state.puzzleNo}` : "TilkiMaks (Antrenman)";
    const result = state.status === "won" ? "çözüldü" : "kaybedildi";
    let bar = "";
    const remaining = MAX_WRONG - state.wrong;
    for (let i = 0; i < MAX_WRONG; i++) bar += i < remaining ? "■" : "□";
    return (
      `${title} — ${result}\n` +
      `${state.words.length} kelime · ${state.wrong}/${MAX_WRONG} yanlış\n` +
      `${bar}`
    );
  }

  async function share() {
    const text = buildShareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {}
    try {
      await navigator.clipboard.writeText(text);
      toast("Sonuç kopyalandı!");
    } catch (e) {
      // eski tarayıcı fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("Sonuç kopyalandı!"); }
      catch (e2) { toast("Kopyalanamadı"); }
      document.body.removeChild(ta);
    }
  }

  // ---- Geri sayım (bir sonraki günlük) ----
  let cdTimer;
  function startCountdown() {
    clearInterval(cdTimer);
    const el = $("#countdown");
    function tick() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      let diff = Math.max(0, next - now);
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const sec = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      el.textContent = `Sonraki bulmaca: ${h}:${m}:${sec}`;
    }
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  // ---- Tema ----
  function applyTheme(theme) {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    $("#theme-btn").innerHTML = theme === "dark" ? ICONS.sun : ICONS.moon;
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("foximax-theme", next); } catch (e) {}
    applyTheme(next);
  }

  // ---- Mod değiştir ----
  function setMode(mode) {
    if (state.mode === mode && state.status === "playing") {
      // aynı moda tekrar basmak bir şey yapmasın
    }
    document.querySelectorAll(".mode-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.mode === mode)
    );
    startGame(mode);
  }

  // ---- Olay bağlama ----
  function bindEvents() {
    $("#help-btn").addEventListener("click", () => openModal("#help-modal"));
    $("#stats-btn").addEventListener("click", showStats);
    $("#theme-btn").addEventListener("click", toggleTheme);
    $("#share-btn").addEventListener("click", share);
    $("#practice-again-btn").addEventListener("click", () => {
      closeModal($("#end-modal"));
      startGame("practice", { fresh: true });
    });

    document.querySelectorAll(".mode-tab").forEach((tab) =>
      tab.addEventListener("click", () => setMode(tab.dataset.mode))
    );

    document.querySelectorAll("[data-close]").forEach((btn) =>
      btn.addEventListener("click", () => closeModal(btn.closest(".modal-overlay")))
    );
    document.querySelectorAll(".modal-overlay").forEach((ov) =>
      ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(ov); })
    );

    // fiziksel klavye
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay:not([hidden])").forEach((ov) => closeModal(ov));
        return;
      }
      if (e.key.length !== 1) return;
      const L = trUpper(e.key);
      if (ALPHABET.has(L)) { guess(L); }
    });
  }

  // ---- Başlat ----
  function init() {
    const savedTheme = (function () {
      try { return localStorage.getItem("foximax-theme"); } catch (e) { return null; }
    })();
    applyTheme(savedTheme === "dark" ? "dark" : "light");

    bindEvents();

    // "Nasıl oynanır" penceresi: kullanıcı "bir daha gösterme" demediyse her açılışta gelir
    let hideHelp = false;
    try { hideHelp = localStorage.getItem("foximax-hide-help") === "1"; } catch (e) {}
    const dontShow = $("#dont-show-help");
    if (dontShow) {
      dontShow.checked = hideHelp;
      dontShow.addEventListener("change", () => {
        try {
          localStorage.setItem("foximax-hide-help", dontShow.checked ? "1" : "0");
        } catch (e) {}
      });
    }
    if (!hideHelp) openModal("#help-modal");

    startGame("daily");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
