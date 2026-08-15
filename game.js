/* ==========================================================================
   Tilkile — Türkçe günlük kelime bulmacası
   Mekanik: harfleri tek tek tahmin et. Harf kelimede varsa açığa çıkar;
   yoksa ızgaraya yeni bir kelime eklenir ve bir can gider. 8 yanlışta oyun biter.
   ========================================================================== */

(function () {
  "use strict";

  // ---- Sabitler ----
  const MAX_WRONG = 8;
  const WORD_LEN = 5;
  const LAUNCH = new Date(2026, 7, 1); // 1 Ağustos 2026 = #1 günü
  const KEY_ROWS = [
    ["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
    ["Z", "C", "V", "B", "N", "M", "Ö", "Ç"],
  ];
  const ALPHABET = new Set("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split(""));

  const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  // ---- İkonlar (mod butonu için satır içi SVG) ----
  const ICONS = {
    calendar:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="3" y="4.5" width="18" height="17"/><line x1="3" y1="9.5" x2="21" y2="9.5"/>' +
      '<line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/></svg>',
    archive:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="2" y="4" width="20" height="5"/><path d="M4 9v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>' +
      '<line x1="9.5" y1="13" x2="14.5" y2="13"/></svg>',
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
    return Math.floor((localMidnight(d) - localMidnight(LAUNCH)) / 86400000) + 1;
  }

  // ---- Durum ----
  const state = {
    mode: "daily", // daily | archive
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
  // Her bulmaca (bugünkü günlük veya arşivden bir gün) numarasına göre saklanır.
  function puzzleKey(pno) { return "foximax-daily-" + pno; }

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
      localStorage.setItem(puzzleKey(state.puzzleNo), JSON.stringify(data));
    } catch (e) {}
  }

  function loadSaved(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // ---- İstatistik (yalnızca günlük; arşiv oynayışları seriyi etkilemez) ----
  function getStats() {
    const def = { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWinNo: null, dist: {} };
    const s = Object.assign(def, loadSaved("foximax-stats") || {});
    if (!s.dist) s.dist = {};
    return s;
  }
  function saveStats(s) {
    try { localStorage.setItem("foximax-stats", JSON.stringify(s)); } catch (e) {}
  }
  function recordResult(won, wordCount) {
    const s = getStats();
    s.played += 1;
    if (won) {
      s.wins += 1;
      // seri: bir önceki gün kazanılmışsa uzat
      if (s.lastWinNo === state.puzzleNo - 1) s.currentStreak += 1;
      else s.currentStreak = 1;
      s.lastWinNo = state.puzzleNo;
      if (s.currentStreak > s.maxStreak) s.maxStreak = s.currentStreak;
      s.dist[wordCount] = (s.dist[wordCount] || 0) + 1;
    } else {
      s.currentStreak = 0;
    }
    saveStats(s);
  }

  // ---- Oyun kurulumu ----
  // puzzleNo verilmezse bugünün günlük bulmacası oynanır. Geçmiş bir numara
  // verilirse "arşiv" modunda o gün oynanır. Her ikisi de aynı deterministik
  // tohumu ve numaraya göre kayıt anahtarını kullanır.
  function startGame(puzzleNo, opts) {
    opts = opts || {};
    const todayNo = puzzleNumber(new Date());
    if (puzzleNo == null) puzzleNo = todayNo;
    state.puzzleNo = puzzleNo;
    state.mode = puzzleNo === todayNo ? "daily" : "archive";

    const saved = loadSaved(puzzleKey(puzzleNo));
    if (saved && !opts.fresh) { restoreFrom(saved); return; }

    state.seed = 0x9e3779b1 ^ puzzleNo;
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
    // Yalnızca bugünün günlük bulmacası istatistikleri/seriyi etkiler.
    if (state.mode === "daily") recordResult(won, state.words.length);
    setTimeout(() => showEndModal(won), 650);
  }

  // ---- Render ----
  // opts.flip  : yeni açılan harf (o harfe ait tile'lara flip animasyonu)
  // opts.dropLast : true ise son (yeni eklenen) kelime satırı aşağı düşme animasyonuyla girer
  function render(opts) {
    opts = opts || {};
    const flip = opts.flip || null;

    // canlar (Unicode glif yerine CSS nokta — her platformda aynı boyut)
    const remaining = MAX_WRONG - state.wrong;
    let hearts = "";
    for (let i = 0; i < MAX_WRONG; i++) {
      hearts += '<span class="heart-dot ' + (i < remaining ? "on" : "off") + '"></span>';
    }
    $("#hearts").innerHTML = hearts;

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
        const face = document.createElement("div");
        const shown = state.guessed.has(ch);
        let cls = "tile";
        let faceCls = "tile-face";
        if (shown) {
          const miss = state.absent.has(ch);
          cls += miss ? " miss" : " revealed";
          if (solved && !miss) cls += " solved-row";
          if (flip && ch === flip && !miss) faceCls += " flip";
          face.textContent = ch;
        } else if (state.status === "lost") {
          cls += " answer";  // kaybedince cevabı kırmızıyla göster
          face.textContent = ch;
        }
        tile.className = cls;
        face.className = faceCls;
        tile.appendChild(face);
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

  // Yardım penceresi: "Bir daha gösterme" yalnızca otomatik açılışta görünür
  function openHelp(withDontShow) {
    const ds = document.querySelector(".dont-show");
    if (ds) ds.style.display = withDontShow ? "" : "none";
    openModal("#help-modal");
  }

  function statsSummaryHTML(s) {
    const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    return (
      '<div class="stats-lines">' +
      '<div class="stats-mode">GENEL İSTATİSTİKLER</div>' +
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
      '<div class="win-record"><div class="wr-title">GALİBİYET KAYDI — KELİME SAYISI</div>' +
      `<div class="wr-rows">${rows}</div></div>`
    );
  }

  function showStats() {
    const pno = puzzleNumber(new Date());
    const daily = loadSaved(puzzleKey(pno));
    const s = getStats();

    // Bugünkü (günlük) sonuç
    let today = '<div class="today-result"><div class="stats-mode">BUGÜNKÜ SONUÇ</div>';
    if (daily && daily.status === "won") {
      today += `<div class="today-line">Bulmaca #${pno} · <b class="win">Kazandın</b></div>`;
      today += `<div class="today-sub muted">${daily.words.length} kelime · ${daily.wrong} yanlış</div>`;
    } else if (daily && daily.status === "lost") {
      today += `<div class="today-line">Bulmaca #${pno} · <b class="lose">Kaybettin</b></div>`;
      today += `<div class="today-sub muted">${daily.words.length} kelime açıldı</div>`;
    } else if (daily && daily.status === "playing") {
      today += `<div class="today-line">Bulmaca #${pno} · Devam ediyor</div>`;
      today += `<div class="today-sub muted">${daily.words.length} kelime · ${daily.wrong} yanlış</div>`;
    } else {
      today += `<div class="today-line">Bulmaca #${pno}</div>`;
      today += `<div class="today-sub muted">Bugün henüz oynamadın.</div>`;
    }
    today += "</div>";

    $("#stats-body").innerHTML = today + statsSummaryHTML(s) + winRecordHTML(s, null);

    // Paylaş butonu — bugünkü günlük bittiyse
    const shareArea = $("#stats-share-area");
    if (daily && daily.status !== "playing") {
      shareArea.innerHTML = '<button class="primary-btn" id="stats-share-btn">Sonucu Paylaş</button>';
      $("#stats-share-btn").onclick = () =>
        share(buildShareTextFrom(`Tilkile #${pno}`, daily.status, daily.words.length, daily.wrong));
    } else {
      shareArea.innerHTML = "";
    }

    openModal("#stats-modal");
  }

  function showEndModal(won) {
    const s = getStats();
    $("#end-title").textContent = won ? "Kazandın!" : "Oyun bitti";
    $("#end-sub").textContent = won
      ? `Aferin! ${state.words.length} kelime ve ${state.guessed.size} harf kullandın.`
      : `Tüm canlar bitti. ${state.words.length} kelime açıldı.`;

    // İstatistik/dağılım yalnızca bugünkü günlükte değişir; vurgu da yalnızca onda.
    $("#end-stats").innerHTML =
      statsSummaryHTML(s) +
      winRecordHTML(s, won && state.mode === "daily" ? state.words.length : null);

    if (state.mode === "daily") {
      $("#archive-back-btn").hidden = true;
      startCountdown();
    } else {
      $("#archive-back-btn").hidden = false;
      $("#countdown").textContent = "";
    }
    openModal("#end-modal");
  }

  // ---- Paylaşım ----
  function buildShareTextFrom(title, status, wordCount, wrong) {
    const result = status === "won" ? "çözüldü" : "kaybedildi";
    let bar = "";
    const remaining = MAX_WRONG - wrong;
    for (let i = 0; i < MAX_WRONG; i++) bar += i < remaining ? "■" : "□";
    return `${title} — ${result}\n${wordCount} kelime · ${wrong}/${MAX_WRONG} yanlış\n${bar}`;
  }
  function buildShareText() {
    return buildShareTextFrom(`Tilkile #${state.puzzleNo}`, state.status, state.words.length, state.wrong);
  }

  async function share(customText) {
    const text = customText || buildShareText();
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

  // ---- Tema (Ayarlar panelinden) ----
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyTheme(theme) {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    updateThemeUI(theme);
  }
  function setTheme(theme) {
    try { localStorage.setItem("foximax-theme", theme); } catch (e) {}
    applyTheme(theme);
  }
  function updateThemeUI(theme) {
    const sel = $("#theme-select");
    if (sel) sel.value = theme;
  }

  // ---- Ekran klavyesi görünürlüğü ----
  function applyKeyboard(show) {
    document.body.classList.toggle("kb-hidden", !show);
    const sw = $("#keyboard-switch");
    if (sw) sw.checked = show;
  }
  function keyboardShown() {
    return !document.body.classList.contains("kb-hidden");
  }

  // ---- Mod (üstteki "Oyun modu" panelinden) ----
  function updateModeUI() {
    document.querySelectorAll(".mode-opt").forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === state.mode)
    );
  }
  function updateModeButton() {
    const b = $("#mode-btn");
    if (b) b.innerHTML = state.mode === "daily" ? ICONS.calendar : ICONS.archive;
  }
  // Bir bulmaca numarasının takvim tarihi (1 Ağustos 2026 = #1)
  function dateForPuzzle(pno) {
    return new Date(LAUNCH.getFullYear(), LAUNCH.getMonth(), LAUNCH.getDate() + (pno - 1));
  }
  function updateInfoLine() {
    const el = $("#puzzle-info");
    if (!el) return;
    const d = dateForPuzzle(state.puzzleNo);
    const label = state.mode === "daily" ? "Günün Oyunu" : "Arşiv";
    el.textContent = `${label} · ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function syncModeUI() {
    updateModeUI();
    updateModeButton();
    updateInfoLine();
  }
  function setMode() {
    startGame(); // bugünün günlük bulmacası
    syncModeUI();
  }

  // ---- Arşiv (geçmiş günlük bulmacalar) ----
  function showArchive() {
    const todayNo = puzzleNumber(new Date());
    const grid = $("#archive-grid");
    let html = "";
    for (let n = todayNo; n >= 1; n--) {
      const saved = loadSaved(puzzleKey(n));
      let cls = "archive-item";
      if (saved && saved.status === "won") cls += " solved";
      else if (saved && saved.status === "lost") cls += " lost";
      if (n === todayNo) cls += " today";
      const d = dateForPuzzle(n);
      html +=
        `<button class="${cls}" data-pno="${n}">` +
        `<span class="ar-no">#${n}</span>` +
        `<span class="ar-date">${d.getDate()} ${TR_MONTHS[d.getMonth()].slice(0, 3)}</span></button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll(".archive-item").forEach((b) =>
      b.addEventListener("click", () => {
        startGame(parseInt(b.dataset.pno, 10));
        syncModeUI();
        closeModal($("#archive-modal"));
        closeModal($("#mode-modal"));
      })
    );
    openModal("#archive-modal");
  }

  // ---- Olay bağlama ----
  function bindEvents() {
    $("#help-btn").addEventListener("click", () => openHelp(false));
    $("#stats-btn").addEventListener("click", showStats);
    $("#settings-btn").addEventListener("click", () => {
      updateThemeUI(currentTheme());
      const kb = $("#keyboard-switch");
      if (kb) kb.checked = keyboardShown();
      openModal("#settings-modal");
    });
    $("#mode-btn").addEventListener("click", () => {
      updateModeUI();
      openModal("#mode-modal");
    });
    $("#share-btn").addEventListener("click", () => share());
    $("#archive-back-btn").addEventListener("click", () => {
      closeModal($("#end-modal"));
      showArchive();
    });

    $("#theme-select").addEventListener("change", (e) => setTheme(e.target.value));
    $("#keyboard-switch").addEventListener("change", (e) => {
      const show = e.target.checked;
      try { localStorage.setItem("foximax-keyboard", show ? "1" : "0"); } catch (err) {}
      applyKeyboard(show);
    });
    document.querySelectorAll(".mode-opt").forEach((t) =>
      t.addEventListener("click", () => {
        if (t.dataset.action === "archive") {
          closeModal($("#mode-modal"));
          showArchive();
        } else {
          setMode();
          closeModal($("#mode-modal"));
        }
      })
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

    let kbPref = null;
    try { kbPref = localStorage.getItem("foximax-keyboard"); } catch (e) {}
    applyKeyboard(kbPref !== "0"); // varsayılan: açık

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
    if (!hideHelp) openHelp(true);

    startGame(); // bugünün günlük bulmacası
    syncModeUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
