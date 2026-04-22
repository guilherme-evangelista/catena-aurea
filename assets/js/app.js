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
/** Cache of daily liturgy API responses, keyed by ISO date */
const liturgyCache = {};
/** Daily liturgy API endpoint */
const LITURGY_API = 'https://liturgia.up.railway.app/v2/';
/** Current liturgy UI state */
const liturgyState = {
  date: toISODate(new Date()),
  data: null,
  gospelRef: null,
  verseTexts: {},
};

// ── DOM refs ──────────────────────────────────────────────────────────
const elApp        = document.getElementById('app');
const elMain       = document.getElementById('main');
const elWelcome    = document.getElementById('welcome');
const elChView     = document.getElementById('chapter-view');
const elLiturgyView= document.getElementById('liturgy-view');
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
const elLiturgyTab = document.getElementById('tab-liturgia');
const elChapterToggle = document.getElementById('chapter-toggle');
const elFavicon    = document.getElementById('favicon');

// ── Initialisation ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  injectTabSymbols();
  buildBookCards();
  updateFavicon('mateus');
  elChapterToggle.hidden = true;
  bindEvents();
  updateMobileControls();
});

function isMobileViewport() {
  return window.matchMedia('(max-width: 600px)').matches;
}

function updateMobileControls() {
  elChapterToggle.hidden = !isMobileViewport() || !curBook;
  if (!isMobileViewport()) closeChapterPanel();
}

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
  document.body.classList.remove('liturgy-active');
  document.body.classList.remove('sidebar-open');
  elChapterToggle.hidden = true;
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
  document.body.classList.remove('liturgy-active');
  updateMobileControls();

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
  closeChapterPanel();
  renderChapter(ch);
  elMain.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load and display the daily liturgy for a chosen date.
 * @param {string} isoDate - YYYY-MM-DD
 */
async function selectLiturgy(isoDate = liturgyState.date) {
  curBook    = null;
  curChapter = null;
  liturgyState.date = isoDate;
  liturgyState.gospelRef = null;
  liturgyState.verseTexts = {};

  document.body.classList.remove('book-active');
  document.body.classList.add('liturgy-active');
  document.querySelectorAll('.book-tab').forEach(b => b.classList.remove('active'));
  if (elLiturgyTab) elLiturgyTab.classList.add('active');
  elSideLabel.textContent = 'Liturgia';
  elChList.innerHTML = '';
  closeCommentary();
  showPanel('loading');

  try {
    const data = await loadLiturgy(isoDate);
    liturgyState.data = data;

    const gospel = firstReading(data.leituras?.evangelho);
    const gospelRef = parseGospelReference(gospel?.referencia || '');
    liturgyState.gospelRef = gospelRef;

    if (gospelRef) {
      curBook    = gospelRef.bookKey;
      curChapter = String(gospelRef.chapter);
      applyTheme(curBook);
      await loadBook(curBook);
    }

    renderLiturgy(data, gospelRef);
    showPanel('liturgy');
    elMain.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('[Catena Áurea] Liturgy load error:', err);
    renderLiturgyError(err, isoDate);
    showPanel('liturgy');
  }
function closeChapterPanel() {
  document.body.classList.remove('sidebar-open');
}

function toggleChapterPanel() {
  if (!curBook) return;
  document.body.classList.toggle('sidebar-open');
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

/**
 * Load the daily liturgy from the public API.
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {Promise<object>}
 */
async function loadLiturgy(isoDate) {
  if (liturgyCache[isoDate]) return liturgyCache[isoDate];

  const { day, month, year } = datePartsFromISO(isoDate);
  const url = `${LITURGY_API}?dia=${day}&mes=${month}&ano=${year}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`A API respondeu com status ${response.status}.`);
  }

  const data = await response.json();
  liturgyCache[isoDate] = data;
  return data;
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
  const panels = {
    welcome: elWelcome,
    chapter: elChView,
    liturgy: elLiturgyView,
    loading: elLoading,
  };
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
 * Render the complete daily liturgy view.
 * @param {object} data
 * @param {object|null} gospelRef
 */
function renderLiturgy(data, gospelRef) {
  const isoDate = parseApiDate(data.data) || liturgyState.date;
  liturgyState.date = isoDate;
  liturgyState.verseTexts = {};

  const leituras  = data.leituras || {};
  const oracoes   = data.oracoes || {};
  const antifonas = data.antifonas || {};
  const gospel    = firstReading(leituras.evangelho);

  elLiturgyView.innerHTML = `
    <div class="liturgy-shell">
      ${renderLiturgyControls(isoDate)}

      <header class="liturgy-hero fade-up">
        <div class="liturgy-eyebrow">Liturgia Diária</div>
        <h1>${escHtml(data.liturgia || 'Liturgia diária')}</h1>
        <div class="liturgy-meta-row">
          <span>${escHtml(formatLongDate(isoDate))}</span>
          ${data.cor ? `<span class="liturgy-color">${escHtml(data.cor)}</span>` : ''}
        </div>
      </header>

      ${renderAntiphons(antifonas)}
      ${renderPrayerSections(oracoes)}
      ${renderReadingGroup('Primeira Leitura', leituras.primeiraLeitura)}
      ${renderReadingGroup('Salmo Responsorial', leituras.salmo, true)}
      ${renderReadingGroup('Segunda Leitura', leituras.segundaLeitura)}
      ${renderGospelReading(gospel, gospelRef)}
      ${renderReadingGroup('Leituras Complementares', leituras.extras)}
    </div>`;

  bindLiturgyControls();
}

/**
 * Render a friendly error state while keeping the date controls available.
 * @param {Error} err
 * @param {string} isoDate
 */
function renderLiturgyError(err, isoDate) {
  elLiturgyView.innerHTML = `
    <div class="liturgy-shell">
      ${renderLiturgyControls(isoDate)}
      <section class="liturgy-section liturgy-error fade-up">
        <div class="liturgy-section-header">
          <div>
            <div class="liturgy-kicker">Liturgia Diária</div>
            <h2>Não foi possível carregar esta data</h2>
          </div>
        </div>
        <p>${escHtml(err.message || 'Verifique a conexão e tente novamente.')}</p>
      </section>
    </div>`;
  bindLiturgyControls();
}

/**
 * Render the centered date picker and day navigation buttons.
 * @param {string} isoDate
 * @returns {string}
 */
function renderLiturgyControls(isoDate) {
  return `
    <div class="liturgy-nav fade-up">
      <button class="liturgy-day-btn" id="liturgy-prev" aria-label="Dia anterior" title="Dia anterior">&lsaquo;</button>
      <label class="liturgy-date-picker">
        <span>Escolher dia</span>
        <input type="date" id="liturgy-date" value="${escHtml(isoDate)}" aria-label="Escolher dia da liturgia">
      </label>
      <button class="liturgy-day-btn" id="liturgy-next" aria-label="Dia seguinte" title="Dia seguinte">&rsaquo;</button>
    </div>`;
}

/**
 * Render entrance and communion antiphons.
 * @param {object} antifonas
 * @returns {string}
 */
function renderAntiphons(antifonas) {
  const items = [
    ['Antífona de Entrada', antifonas.entrada],
    ['Antífona da Comunhão', antifonas.comunhao],
  ].filter(([, text]) => text);

  if (!items.length) return '';

  return `<section class="liturgy-section liturgy-antiphons fade-up">
    <div class="liturgy-section-header">
      <div>
        <div class="liturgy-kicker">Antífonas</div>
        <h2>Textos próprios</h2>
      </div>
    </div>
    <div class="liturgy-two-col">
      ${items.map(([label, text]) => `
        <div class="liturgy-mini">
          <h3>${escHtml(label)}</h3>
          <p>${formatPlainText(text)}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

/**
 * Render the collect, offerings, communion and extra prayers.
 * @param {object} oracoes
 * @returns {string}
 */
function renderPrayerSections(oracoes) {
  const items = [
    ['Oração do Dia', oracoes.coleta],
    ['Sobre as Oferendas', oracoes.oferendas],
    ['Depois da Comunhão', oracoes.comunhao],
  ].filter(([, text]) => text);

  const extras = Array.isArray(oracoes.extras) ? oracoes.extras : [];
  extras.forEach((extra, index) => {
    if (typeof extra === 'string' && extra.trim()) {
      items.push([`Oração ${index + 1}`, extra]);
    } else if (extra && (extra.titulo || extra.texto || extra.text)) {
      items.push([extra.titulo || `Oração ${index + 1}`, extra.texto || extra.text || '']);
    }
  });

  if (!items.length) return '';

  return `<section class="liturgy-section fade-up">
    <div class="liturgy-section-header">
      <div>
        <div class="liturgy-kicker">Orações</div>
        <h2>Orações da celebração</h2>
      </div>
    </div>
    <div class="liturgy-prayers">
      ${items.map(([label, text]) => `
        <div class="liturgy-prayer">
          <h3>${escHtml(label)}</h3>
          <p>${formatPlainText(text)}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

/**
 * Render one group of readings from the API.
 * @param {string} label
 * @param {Array<object>} readings
 * @param {boolean} isPsalm
 * @returns {string}
 */
function renderReadingGroup(label, readings, isPsalm = false) {
  if (!Array.isArray(readings) || readings.length === 0) return '';

  return readings.map(reading => {
    const readingText = reading.texto || reading.text || '';

    return `
      <section class="liturgy-section liturgy-reading fade-up">
        <div class="liturgy-section-header">
          <div>
            <div class="liturgy-kicker">${escHtml(label)}</div>
            ${reading.referencia ? `<div class="liturgy-reference">${escHtml(reading.referencia)}</div>` : ''}
            ${reading.titulo ? `<h2>${escHtml(reading.titulo)}</h2>` : ''}
          </div>
        </div>
        ${isPsalm && reading.refrao ? `<p class="liturgy-psalm-response">${formatPlainText(reading.refrao)}</p>` : ''}
        <div class="liturgy-text">${formatVerseMarkers(readingText)}</div>
      </section>`;
  }).join('');
}

/**
 * Render the Gospel with clickable verses connected to Catena commentary.
 * @param {object|null} gospel
 * @param {object|null} gospelRef
 * @returns {string}
 */
function renderGospelReading(gospel, gospelRef) {
  if (!gospel) return '';

  const hasCatena = !!(gospelRef && bookCache[gospelRef.bookKey]);
  const gospelText = gospel.texto || gospel.text || '';

  return `
    <section class="liturgy-section liturgy-gospel fade-up">
      <div class="liturgy-section-header">
        <div>
          <div class="liturgy-kicker">Evangelho</div>
          ${gospel.referencia ? `<div class="liturgy-reference">${escHtml(gospel.referencia)}</div>` : ''}
          ${gospel.titulo ? `<h2>${escHtml(gospel.titulo)}</h2>` : ''}
        </div>
      </div>
      <div class="liturgy-gospel-text">
        ${renderLiturgyGospelText(gospelText, gospelRef)}
      </div>
      ${hasCatena ? `
        <p class="liturgy-hint">Catena Áurea disponível para esta perícope do Evangelho.</p>
      ` : `
        <p class="liturgy-hint">A referência deste Evangelho não pôde ser vinculada automaticamente aos comentários da Catena Áurea.</p>
      `}
    </section>`;
}

/**
 * Render Gospel text as verse spans.
 * @param {string} text
 * @param {object|null} gospelRef
 * @returns {string}
 */
function renderLiturgyGospelText(text, gospelRef) {
  const parts = splitGospelText(text, gospelRef);
  if (!parts.verses.length) {
    return `<p>${formatVerseMarkers(text)}</p>`;
  }

  const book = gospelRef ? bookCache[gospelRef.bookKey] : null;
  const comm = book?.commentary?.[String(gospelRef.chapter)] || {};
  const commMap = buildCommMap(comm);

  const intro = parts.intro
    ? `<p class="liturgy-gospel-intro">${formatPlainText(parts.intro)}</p>`
    : '';

  const verses = parts.verses.map(part => {
    const verseKey = String(part.verse);
    const commentaryKey = commMap[verseKey];
    liturgyState.verseTexts[verseKey] = part.text;

    const cls = commentaryKey
      ? 'liturgy-verse has-commentary'
      : 'liturgy-verse';
    const interactiveAttrs = commentaryKey
      ? ` data-vskey="${escHtml(commentaryKey)}" role="button" tabindex="0"`
      : '';

    return `<span class="${cls}" data-verse="${escHtml(verseKey)}"${interactiveAttrs}>
      <sup class="lit-v-num">${escHtml(part.label)}</sup>${formatPlainText(part.text)}
    </span>`;
  }).join(' ');

  return `${intro}<p class="liturgy-verse-flow">${verses}</p>`;
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
 * @param {object} opts
 */
function showCommentary(vsKey, opts = {}) {
  const book  = bookCache[curBook];
  const m     = BOOK_META[curBook];
  const t     = BOOK_THEMES[curBook];
  const block = book.commentary[curChapter]?.[vsKey];
  if (!block) return;

  // Highlight the verse range in the text
  highlightVerses(block.range);

  elCommLabel.textContent  = `${m.name} — Catena Áurea`;
  elCommRef.textContent    = block.range;
  const previewText        = opts.previewText || book.gospel[curChapter]?.[vsKey] || '';
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
  document.querySelectorAll('.verse-row.highlighted, .liturgy-verse.highlighted')
    .forEach(r => r.classList.remove('highlighted'));
}

/**
 * Highlight verse rows within a range string (e.g. "5:1–3").
 * @param {string} rangeStr
 */
function highlightVerses(rangeStr) {
  document.querySelectorAll('.verse-row.highlighted, .liturgy-verse.highlighted')
    .forEach(r => r.classList.remove('highlighted'));
  const match = rangeStr.match(/\d+:(\d+)(?:[–\-](\d+))?/);
  if (!match) return;
  const s = +match[1], e = match[2] ? +match[2] : s;
  document.querySelectorAll('.verse-row').forEach(row => {
    const vn = row.querySelector('.v-num');
    if (vn && +vn.textContent >= s && +vn.textContent <= e)
      row.classList.add('highlighted');
  });
  document.querySelectorAll('.liturgy-verse[data-verse]').forEach(verse => {
    const vn = +verse.dataset.verse;
    if (vn >= s && vn <= e) verse.classList.add('highlighted');
  });
}

// ── Event binding ─────────────────────────────────────────────────────

function bindEvents() {
  // Logo → home
  elLogoBtn.addEventListener('click', goHome);

  // Book tabs
  document.querySelectorAll('.book-tab[data-book]').forEach(btn => {
    btn.addEventListener('click', () => selectBook(btn.dataset.book));
  });
  if (elLiturgyTab) {
    elLiturgyTab.addEventListener('click', () => selectLiturgy(liturgyState.date));
  }

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
    const liturgyVerse = e.target.closest('.liturgy-verse.has-commentary');
    if (liturgyVerse) {
      showLiturgyCommentary(liturgyVerse);
      return;
    }

    const row = e.target.closest('.verse-row.has-commentary');
    if (row) {
      showCommentary(row.dataset.vskey);
    } else if (!e.target.closest('#comm-panel')) {
      closeCommentary();
      closeChapterPanel();
    }
  });
  elMain.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const liturgyVerse = e.target.closest('.liturgy-verse.has-commentary');
      if (liturgyVerse) {
        e.preventDefault();
        showLiturgyCommentary(liturgyVerse);
        return;
      }

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

  // Chapter panel toggle
  elChapterToggle.addEventListener('click', toggleChapterPanel);

  // Close mobile chapter panel when tapping outside
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('sidebar-open')) return;
    if (e.target.closest('#sidebar') || e.target.closest('#chapter-toggle')) return;
    closeChapterPanel();
  });

  window.addEventListener('resize', updateMobileControls);

  // Drag-to-resize commentary panel
  initResizeHandle();
}

/**
 * Open commentary for a clicked verse in the liturgy Gospel.
 * @param {HTMLElement} verseEl
 */
function showLiturgyCommentary(verseEl) {
  const verse = verseEl.dataset.verse;
  const previewText = liturgyState.verseTexts[verse] || verseEl.textContent.trim();
  showCommentary(verseEl.dataset.vskey, { previewText });
}

/** Bind controls inside the freshly rendered liturgy view. */
function bindLiturgyControls() {
  const prev = document.getElementById('liturgy-prev');
  const next = document.getElementById('liturgy-next');
  const date = document.getElementById('liturgy-date');

  if (prev) prev.addEventListener('click', () => selectLiturgy(shiftISODate(liturgyState.date, -1)));
  if (next) next.addEventListener('click', () => selectLiturgy(shiftISODate(liturgyState.date, 1)));
  if (date) {
    date.addEventListener('change', () => {
      if (date.value) selectLiturgy(date.value);
    });
  }
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

/**
 * Return the first reading object from an API reading list.
 * @param {Array<object>} readings
 * @returns {object|null}
 */
function firstReading(readings) {
  return Array.isArray(readings) && readings.length ? readings[0] : null;
}

/**
 * Parse a Gospel reference such as "Jo 6, 35-40".
 * @param {string} ref
 * @returns {object|null}
 */
function parseGospelReference(ref) {
  if (/[-–]\s*\d+\s*,/.test(ref)) return null;

  const match = String(ref).match(/^\s*([1-3]?\s*[A-Za-zÀ-ÿ]+)\.?\s+(\d+)\s*,\s*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?/i);
  if (!match) return null;

  const bookToken = normalizeBookToken(match[1]);
  const bookMap = {
    mt: 'mateus',
    mat: 'mateus',
    mateus: 'mateus',
    mc: 'marcos',
    marcos: 'marcos',
    lc: 'lucas',
    lucas: 'lucas',
    jo: 'joao',
    joao: 'joao',
    jn: 'joao',
    john: 'joao',
  };
  const bookKey = bookMap[bookToken];
  if (!bookKey) return null;

  const startVerse = parseVerseNumber(match[3]);
  const endVerse = match[4] ? parseVerseNumber(match[4]) : startVerse;
  if (!startVerse || !endVerse) return null;

  return {
    bookKey,
    chapter: Number(match[2]),
    startVerse,
    endVerse,
  };
}

/**
 * Normalize biblical book abbreviations for matching.
 * @param {string} token
 * @returns {string}
 */
function normalizeBookToken(token) {
  return String(token)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Extract the numeric part of a verse token such as "1b" or "12a".
 * @param {string} token
 * @returns {number|null}
 */
function parseVerseNumber(token) {
  const match = String(token).match(/\d+/);
  return match ? Number(match[0]) : null;
}

/**
 * Split Gospel text into an intro plus verse segments based on inline verse numbers.
 * @param {string} text
 * @param {object|null} gospelRef
 * @returns {{intro: string, verses: Array<object>}}
 */
function splitGospelText(text, gospelRef) {
  const source = String(text || '');
  const matches = [];
  const markerRe = /(^|[\s\n.!?])(\d{1,3}[a-z]?)(?=[^\s.,;:)\]])/g;
  let match;

  while ((match = markerRe.exec(source)) !== null) {
    const verse = parseVerseNumber(match[2]);
    if (!verse) continue;
    if (gospelRef && (verse < gospelRef.startVerse || verse > gospelRef.endVerse)) continue;

    const markerStart = match.index + match[1].length;
    matches.push({
      verse,
      label: match[2],
      markerStart,
      contentStart: markerStart + match[2].length,
    });
  }

  if (!matches.length) {
    if (gospelRef?.startVerse) {
      return {
        intro: '',
        verses: [{
          verse: gospelRef.startVerse,
          label: String(gospelRef.startVerse),
          text: source.trim(),
        }],
      };
    }
    return { intro: '', verses: [] };
  }

  const intro = source.slice(0, matches[0].markerStart).trim();
  const verses = matches.map((item, index) => {
    const next = matches[index + 1];
    return {
      verse: item.verse,
      label: item.label,
      text: source.slice(item.contentStart, next ? next.markerStart : source.length).trim(),
    };
  });

  return { intro, verses };
}

/**
 * Escape plain text and preserve line breaks.
 * @param {string} text
 * @returns {string}
 */
function formatPlainText(text) {
  return escHtml(text || '').replace(/\n/g, '<br>');
}

/**
 * Convert inline verse numbers into superscript markers.
 * @param {string} text
 * @returns {string}
 */
function formatVerseMarkers(text) {
  return escHtml(text || '')
    .replace(/(^|[\s\n.!?])(\d{1,3}[a-z]?)(?=[^\s.,;:)\]])/g, '$1<sup class="lit-v-num">$2</sup>')
    .replace(/\n/g, '<br>');
}

/**
 * Convert a Date to a local ISO date (YYYY-MM-DD).
 * @param {Date} date
 * @returns {string}
 */
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an API date formatted as DD/MM/YYYY.
 * @param {string} value
 * @returns {string|null}
 */
function parseApiDate(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/**
 * Convert an ISO date into API day/month/year parameters.
 * @param {string} isoDate
 * @returns {{day: string, month: string, year: string}}
 */
function datePartsFromISO(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return { day, month, year };
}

/**
 * Add days to an ISO date.
 * @param {string} isoDate
 * @param {number} delta
 * @returns {string}
 */
function shiftISODate(isoDate, delta) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

/**
 * Format an ISO date in Portuguese for display.
 * @param {string} isoDate
 * @returns {string}
 */
function formatLongDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
