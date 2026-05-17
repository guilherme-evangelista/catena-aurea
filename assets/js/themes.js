/**
 * themes.js
 * Colour palettes for each Gospel, derived from the cover art
 * of the Ecclesiae edition. Applied as CSS custom properties on :root.
 */

/* global BOOK_THEMES, BOOK_META */

const BOOK_THEMES = {
  mateus: {
    bg1:    '#1a2744',
    bg2:    '#243662',
    accent: '#7a9fe0',
    gold:   '#d4b86a',
    symbol: '#7a9fe0',
    glow:   'rgba(106, 143, 216, .18)',
  },
  marcos: {
    bg1:    '#0e2e1e',
    bg2:    '#163d28',
    accent: '#5dba8a',
    gold:   '#d4e07a',
    symbol: '#d4e07a',
    glow:   'rgba(77, 175, 122, .18)',
    light: {
      accent: '#1f7653',
      gold:   '#386f28',
      symbol: '#2f6f3d',
      glow:   'rgba(31, 118, 83, .18)',
    },
  },
  lucas: {
    bg1:    '#3b2800',
    bg2:    '#5a3d00',
    accent: '#d4a030',
    gold:   '#f0cc6a',
    symbol: '#f0cc6a',
    glow:   'rgba(212, 160, 48, .18)',
  },
  joao: {
    bg1:    '#2e0a0a',
    bg2:    '#4a1212',
    accent: '#d05050',
    gold:   '#e8c090',
    symbol: '#e46a6a',
    glow:   'rgba(200, 64, 64, .18)',
  },
};

/** Metadata used to render book cards and chapter headers */
const BOOK_META = {
  mateus: { name: 'São Mateus', vol: 'Vol. I',   abbr: 'Mt' },
  marcos: { name: 'São Marcos', vol: 'Vol. II',  abbr: 'Mc' },
  lucas:  { name: 'São Lucas',  vol: 'Vol. III', abbr: 'Lc' },
  joao:   { name: 'São João',   vol: 'Vol. IV',  abbr: 'Jo' },
};

/**
 * Apply a book's colour theme to the document root.
 * @param {string} bookKey
 */
function applyTheme(bookKey) {
  const t = BOOK_THEMES[bookKey];
  const mode = document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark';
  const palette = { ...t, ...(t[mode] || {}) };
  const r = document.documentElement.style;
  document.documentElement.dataset.bookTheme = bookKey;
  r.setProperty('--book-bg1',    palette.bg1);
  r.setProperty('--book-bg2',    palette.bg2);
  r.setProperty('--book-accent', palette.accent);
  r.setProperty('--book-gold',   palette.gold);
  r.setProperty('--book-symbol', palette.symbol || palette.gold);
  r.setProperty('--book-glow',   palette.glow);
}
