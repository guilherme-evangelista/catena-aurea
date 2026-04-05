/**
 * app.js
 * Main application controller for the Catena Áurea reader.
 *
 * Responsibilities:
 *  - Lazy-load book data (JSON) on demand
 *  - Render the welcome screen book-card gallery
 *  - Render chapter text with verse rows
 *  - Open/close the commentary side panel
 *  - Apply per-book colour themes
 *  - Drag-to-resize the commentary panel
 *
 * Depends on: symbols.js, themes.js, commentary.js (loaded before this file)
 */

/* global SYMBOLS, BOOK_THEMES, BOOK_META, applyTheme, formatCommentary, escHtml */

'use strict';

// ── State ─────────────────────────────────────────────────────────────
/** Currently active book key ('mateus' | 'marcos' | 'lucas' | 'joao') or null */
let curBook    = null;
/** Currently visible chapter number string (e.g. '5') or null */
let curChapter = null;
/** Cache of loaded book data objects, keyed by book key */
const bookCache = {};

// ── DOM refs ──────────────────────────────────────────────────────────
const elApp        = document.getElementById('app');
const elMain       = document.getElementById('main');
const elWelcome    = document.getElementById('welcome');
const elChView     = document.getElementById('chapter-view');
const elLoading    = document.getElementById('loading-indicator');
const elChList     = document.getElementById('chapter-list');
const elSideLabel  = document.getElementById('sidebar-label');
const elCommPanel  = document.getElementById('comm-panel');
const elCommBody   = document.getElementById('comm-body');
const elCommRef    = document.getElementById('comm-ref');
const elCommLabel  = document.getElementById('comm-book-label');
const elCommPreview= document.getElementById('comm-verse-preview');
const elCommHeader = document.getElementById('comm-header');
const elBookCards  = document.getElementById('book-cards');
const elLogoBtn    = document.getElementById('logo-btn');
const elFavicon    = document.getElementById('favicon');

// ── Initialisation ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  injectTabSymbols();
  buildBookCards();
  updateFavicon('mateus');
  bindEvents();
});

/** Inject SVG symbols into header tab buttons */
function injectTabSymbols() {
  Object.keys(SYMBOLS).forEach(key => {
    const el = document.getElementById(`sym-${key}`);
    if (el) el.innerHTML = SYMBOLS[key];
  });
}

// ── Book gallery ──────────────────────────────────────────────────────

/** Build the welcome-screen book card grid */
function buildBookCards() {
  const keys = ['mateus', 'marcos', 'lucas', 'joao'];
  elBookCards.innerHTML = keys.map((key, i) => {
    const m   = BOOK_META[key];
    const t   = BOOK_THEMES[key];
    const sym = SYMBOLS[key];
    const delay = i * 80;
    const imgPath = `assets/images/cover-${key}.jpg`;

    return `
      <div class="book-card fade-up"
           style="animation-delay:${delay}ms"
           role="listitem"
           data-book="${key}"
           tabindex="0"
           aria-label="Abrir ${m.name}">
        <div class="book-card-bg"
             style="background-image:url('${imgPath}');background-color:${t.bg1}"></div>
        <div class="book-card-overlay"
             style="background:linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,.1) 100%)"></div>
        <div class="book-card-body">
          <div class="book-card-symbol" style="color:${t.gold}">${sym}</div>
          <div class="book-card-vol"    style="color:${t.gold};opacity:.7">${m.vol}</div>
          <div class="book-card-name">${m.name}</div>
          <div class="book-card-cta">Ler comentários →</div>
        </div>
      </div>`;
  }).join('');
}

/**
 * Update favicon with a circle and diamond symbol.
 * Colour changes based on the active book.
 * @param {string} bookKey - Book identifier or 'default' for home
 */
function updateFavicon(bookKey) {
  const theme = BOOK_THEMES[bookKey] || BOOK_THEMES.mateus;
  const accentColor = theme.accent;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#0d0d0f"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="${accentColor}" stroke-width="2"/>
    <g transform="translate(32, 32)">
      <path d="M 0,-12 L 12,0 L 0,12 L -12,0 Z" fill="${accentColor}"/>
    </g>
  </svg>`;
  
  const encodedSvg = encodeURIComponent(svg);
  elFavicon.href = `data:image/svg+xml,${encodedSvg}`;
}

// ── Navigation ────────────────────────────────────────────────────────

/** Return to the welcome screen */
function goHome() {
  curBook    = null;
  curChapter = null;
  document.querySelectorAll('.book-tab').forEach(b => b.classList.remove('active'));
  document.body.classList.remove('book-active');
  showPanel('welcome');
  closeCommentary();
  updateFavicon('mateus');
  elMain.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load and display a Gospel.
 * @param {string} bookKey
 */
async function selectBook(bookKey) {
  curBook    = bookKey;
  curChapter = null;
  applyTheme(bookKey);
  updateFavicon(bookKey);
  document.body.classList.add('book-active');

  document.querySelectorAll('.book-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${bookKey}`).classList.add('active');

  // Load data (cached after first fetch)
  const book = await loadBook(bookKey);

  renderChapterList(book);
  const firstCh = Object.keys(book.gospel)[0];
  selectChapter(firstCh);
}

/**
 * Display a specific chapter.
 * @param {string} ch - Chapter number string
 */
function selectChapter(ch) {
  curChapter = ch;
  document.querySelectorAll('.ch-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`ch-btn-${ch}`);
  if (btn) {
    btn.classList.add('active');
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  closeCommentary();
  renderChapter(ch);
  elMain.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Data loading ──────────────────────────────────────────────────────

/**
 * Load a book's data, caching the result.
 *
 * Strategy: inject a <script> tag pointing to `data/{key}.js`, which assigns
 * `window.CATENA_DATA[key]` when executed. This approach works both on
 * http:// (GitHub Pages, local server) and on the file:// protocol when
 * the user opens index.html directly — unlike fetch(), which is blocked by
 * CORS on file://.
 *
 * @param {string} bookKey
 * @returns {Promise<object>}
 */
function loadBook(bookKey) {
  // Return cached data immediately
  if (bookCache[bookKey]) return Promise.resolve(bookCache[bookKey]);

  showPanel('loading');

  return new Promise((resolve, reject) => {
    // If the global was already populated (e.g. script loaded earlier), use it
    if (window.CATENA_DATA && window.CATENA_DATA[bookKey]) {
      const data = window.CATENA_DATA[bookKey];
      bookCache[bookKey] = data;
      return resolve(data);
    }

    const script = document.createElement('script');
    script.src   = `data/${bookKey}.js`;
    script.async = true;

    script.onload = () => {
      const data = window.CATENA_DATA && window.CATENA_DATA[bookKey];
      if (data) {
        bookCache[bookKey] = data;
        resolve(data);
      } else {
        const err = new Error(`Data for "${bookKey}" not found after script load.`);
        onError(err);
        reject(err);
      }
    };

    script.onerror = () => {
      const err = new Error(`Failed to load data/${bookKey}.js`);
      onError(err);
      reject(err);
    };

    document.head.appendChild(script);
  });
}

function onError(err) {
  console.error('[Catena Áurea] Data load error:', err);
  elChView.innerHTML = `
    <div style="padding:48px 52px;max-width:620px">
      <p style="font-family:'Cinzel',serif;font-size:1rem;color:var(--book-accent);margin-bottom:12px">
        Erro ao carregar os dados
      </p>
      <p style="color:var(--text-dim);line-height:1.7;margin-bottom:16px">
        Os arquivos de dados não puderam ser carregados. Se estiver abrindo o site
        directamente pelo explorador de ficheiros (protocolo <code>file://</code>),
        use um servidor local:
      </p>
      <pre style="background:rgba(255,255,255,.06);padding:12px 16px;border-radius:6px;font-size:.85rem;color:var(--text);">python3 -m http.server 8000</pre>
      <p style="color:var(--text-faint);font-size:.85rem;margin-top:12px">
        Depois acesse <strong>http://localhost:8000</strong> no seu browser.
      </p>
    </div>`;
  showPanel('chapter');
}

// ── Rendering ─────────────────────────────────────────────────────────

/** Show one of: 'welcome' | 'chapter' | 'loading' */
function showPanel(which) {
  const panels = { welcome: elWelcome, chapter: elChView, loading: elLoading };
  Object.entries(panels).forEach(([name, el]) => {
    el.classList.toggle('is-hidden', name !== which);
  });
}

/**
 * Populate the sidebar chapter list.
 * @param {object} book
 */
function renderChapterList(book) {
  const m        = BOOK_META[curBook];
  const chapters = Object.keys(book.gospel).sort((a, b) => +a - +b);
  const comm     = book.commentary;

  elSideLabel.textContent = m.name;
  elChList.innerHTML = chapters.map(ch => {
    const hasc = comm[ch] && Object.keys(comm[ch]).length > 0;
    return `<button class="ch-btn" id="ch-btn-${ch}" data-ch="${ch}">
      <span>Capítulo ${ch}</span>
      ${hasc ? '<span class="ch-dot" aria-hidden="true"></span>' : ''}
    </button>`;
  }).join('');
}

/**
 * Render all verses for a chapter.
 * @param {string} ch
 */
function renderChapter(ch) {
  try {
    const book   = bookCache[curBook];
    const m      = BOOK_META[curBook];
    const verses = book.gospel[ch];
    const comm   = book.commentary[ch] || {};
    const vkeys  = Object.keys(verses).sort((a, b) => +a - +b);
    const sym    = SYMBOLS[curBook];

    const commMap = buildCommMap(comm);

    let firstVerse = true;
    const rows = vkeys.map(vs => {
      const txt  = verses[vs];
      const cKey = commMap[vs];
      const hasc = !!cKey;

      let disp = escHtml(txt);
      if (firstVerse && txt.length > 0) {
        disp = `<span class="illuminated">${escHtml(txt[0])}</span>${escHtml(txt.slice(1))}`;
        firstVerse = false;
      }

      const pip  = hasc ? '<span class="comm-pip" aria-hidden="true"></span>' : '';
      const cls  = hasc ? 'verse-row has-commentary' : 'verse-row';
      const data = hasc ? ` data-vskey="${escHtml(cKey)}"` : '';

      return `<div class="${cls}"${data} role="${hasc ? 'button' : 'text'}" ${hasc ? 'tabindex="0"' : ''}>
        <span class="v-num" aria-label="Versículo ${vs}">${vs}</span>
        <span class="v-text">${disp}${pip}</span>
      </div>`;
    }).join('');

    elChView.innerHTML = `
      <div class="chapter-header fade-up">
        <div class="chapter-header-icon scale-in" aria-hidden="true">${sym}</div>
        <div class="chapter-header-text">
          <div class="book-name">${m.name} · ${m.vol}</div>
          <div class="chapter-label">Capítulo ${ch}</div>
        </div>
      </div>
      <div class="fade-up">${rows}</div>
      <div class="chapter-ornament fade-up" aria-hidden="true">· · ✦ · ·</div>`;

    showPanel('chapter');

  } catch (err) {
    console.error('[Catena Áurea] renderChapter error:', err);
    elChView.innerHTML = `<p style="padding:40px;color:var(--text-faint)">
      Erro ao renderizar o capítulo: ${escHtml(err.message)}</p>`;
    showPanel('chapter');
  }
}

/**
 * Build a verse-number → commentary-block-key lookup map.
 * Handles multi-verse ranges (e.g. range "5:1–3" → keys 1, 2, 3 all map to '1').
 * @param {object} comm - Commentary object for one chapter
 * @returns {object}
 */
function buildCommMap(comm) {
  const map = {};
  for (const [vsKey, block] of Object.entries(comm)) {
    const match = block.range.match(/\d+:(\d+)(?:[–\-](\d+))?/);
    if (!match) continue;
    const start = +match[1];
    const end   = match[2] ? +match[2] : start;
    for (let v = start; v <= end; v++) map[String(v)] = vsKey;
  }
  return map;
}

// ── Commentary panel ──────────────────────────────────────────────────

/**
 * Open the commentary panel for a given verse key.
 * @param {string} vsKey
 */
function showCommentary(vsKey) {
  const book  = bookCache[curBook];
  const m     = BOOK_META[curBook];
  const t     = BOOK_THEMES[curBook];
  const block = book.commentary[curChapter]?.[vsKey];
  if (!block) return;

  // Highlight the verse range in the text
  highlightVerses(block.range);

  elCommLabel.textContent  = `${m.name} — Catena Áurea`;
  elCommRef.textContent    = block.range;
  const previewText        = book.gospel[curChapter]?.[vsKey] || '';
  elCommPreview.textContent = previewText.length > 180
    ? previewText.slice(0, 177) + '…'
    : previewText;
  elCommHeader.style.background =
    `color-mix(in srgb, ${t.bg1} 70%, transparent)`;
  elCommBody.innerHTML = formatCommentary(block.text);
  elCommBody.scrollTop = 0;

  elCommPanel.classList.add('open');
  elCommPanel.setAttribute('aria-hidden', 'false');
}

/** Close the commentary side panel */
function closeCommentary() {
  elCommPanel.classList.remove('open');
  elCommPanel.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.verse-row.highlighted')
    .forEach(r => r.classList.remove('highlighted'));
}

/**
 * Highlight verse rows within a range string (e.g. "5:1–3").
 * @param {string} rangeStr
 */
function highlightVerses(rangeStr) {
  document.querySelectorAll('.verse-row.highlighted')
    .forEach(r => r.classList.remove('highlighted'));
  const match = rangeStr.match(/\d+:(\d+)(?:[–\-](\d+))?/);
  if (!match) return;
  const s = +match[1], e = match[2] ? +match[2] : s;
  document.querySelectorAll('.verse-row').forEach(row => {
    const vn = row.querySelector('.v-num');
    if (vn && +vn.textContent >= s && +vn.textContent <= e)
      row.classList.add('highlighted');
  });
}

// ── Event binding ─────────────────────────────────────────────────────

function bindEvents() {
  // Logo → home
  elLogoBtn.addEventListener('click', goHome);

  // Book tabs
  document.querySelectorAll('.book-tab').forEach(btn => {
    btn.addEventListener('click', () => selectBook(btn.dataset.book));
  });

  // Book cards (event delegation)
  elBookCards.addEventListener('click', e => {
    const card = e.target.closest('[data-book]');
    if (card) selectBook(card.dataset.book);
  });
  elBookCards.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-book]');
      if (card) { e.preventDefault(); selectBook(card.dataset.book); }
    }
  });

  // Chapter list (event delegation)
  elChList.addEventListener('click', e => {
    const btn = e.target.closest('.ch-btn');
    if (btn) selectChapter(btn.dataset.ch);
  });

  // Verse clicks (event delegation on main)
  elMain.addEventListener('click', e => {
    const row = e.target.closest('.verse-row.has-commentary');
    if (row) {
      showCommentary(row.dataset.vskey);
    } else if (!e.target.closest('#comm-panel')) {
      closeCommentary();
    }
  });
  elMain.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const row = e.target.closest('.verse-row.has-commentary');
      if (row) { e.preventDefault(); showCommentary(row.dataset.vskey); }
    }
  });

  // Commentary close button
  document.getElementById('comm-close').addEventListener('click', closeCommentary);

  // ESC closes panel
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCommentary();
  });

  // Drag-to-resize commentary panel
  initResizeHandle();
}

// ── Drag-to-resize ────────────────────────────────────────────────────

function initResizeHandle() {
  const handle = document.getElementById('comm-resize');
  let dragging = false, startX = 0, startW = 0;

  const onStart = (clientX) => {
    dragging = true;
    startX   = clientX;
    startW   = elCommPanel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
  };

  const onMove = (clientX) => {
    if (!dragging) return;
    const newW = Math.min(860, Math.max(320, startW + (startX - clientX)));
    elCommPanel.style.width = `${newW}px`;
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
  };

  handle.addEventListener('mousedown',  e => { onStart(e.clientX); e.preventDefault(); });
  document.addEventListener('mousemove', e => onMove(e.clientX));
  document.addEventListener('mouseup',   onEnd);

  handle.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
  document.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });
  document.addEventListener('touchend',  onEnd);
}

// ── Utility ───────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
