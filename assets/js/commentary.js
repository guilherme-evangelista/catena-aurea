/**
 * commentary.js
 * Formats raw commentary text extracted from the Catena Aurea PDFs into
 * styled HTML. Handles:
 *   - PDF line-wrap collapsing
 *   - Patristic Father name detection -> styled chip
 *   - Verse number detection -> styled number span
 */

/* global formatCommentary */

const FATHER_NAME_CHARS = 'A-Z\\u00C0-\\u00D6\\u00D8-\\u00DE\\-';
const TITLE_CASE_FATHER_NAMES = [
  'São João Crisóstomo',
  'Santo Agostinho',
  'Santo Ambrósio',
  'Santo Atanásio',
  'Santo Epifânio',
  'Santo Hilário',
  'Santo Isidoro de Pelúsio',
  'Santo Isidoro',
  'Santo Pascásio Radberto',
  'São Basílio',
  'São Beda, o Venerável',
  'São Cipriano',
  'São Cirilo de Alexandria',
  'São Cirilo de Jerusalém',
  'São Dionísio de Alexandria',
  'São Gregório de Nazianzo',
  'São Gregório de Nissa',
  'São Gregório Magno',
  'São Jerônimo',
  'São João Cassiano',
  'São João Damasceno',
  'São Leão Magno',
  'São Máximo',
  'São Pedro Crisólogo',
  'São Remígio',
  'Alcuíno',
  'Ambrosiaster',
  'Concílio de Éfeso',
  'Dídimo',
  'Eusébio',
  'Expositor Grego',
  'Genádio',
  'Glosa',
  'Haymo',
  'Lanfranc',
  'Nemésio',
  'Orígenes',
  'Petrus Alfonsus',
  'Pseudo-Agostinho',
  'Pseudo-Atanásio',
  'Pseudo-Basílio',
  'Pseudo-Crisóstomo',
  'Pseudo-Dionísio',
  'Pseudo-Jerônimo',
  'Pseudo-Orígenes',
  'Rábano Mauro',
  'Segundo Concílio de Constantinopla',
  'Severiano',
  'Teódoto de Ancira',
  'Teofilato',
  'Tito de Bostra',
].sort((a, b) => b.length - a.length);
const TITLE_CASE_FATHER_RE = new RegExp(
  `^\\s*(${TITLE_CASE_FATHER_NAMES.map(escapeRegExp).join('|')})\\s*\\.\\s*`,
  'iu'
);
const UPPERCASE_FATHER_RE = new RegExp(
  `^\\s*([${FATHER_NAME_CHARS}]{3,}(?:[\\s\\-][${FATHER_NAME_CHARS}]+)*)\\s*\\.\\s*`
);

/** Regex matching a verse number (e.g. "5. ") at the start of a paragraph. */
const VERSE_NUM_RE = /^\s*(\d+)\.\s/;

/**
 * Escape special HTML characters in a string.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchFather(line) {
  const source = String(line || '');
  const titleMatch = source.match(TITLE_CASE_FATHER_RE);
  if (titleMatch) {
    return {
      name: titleMatch[1],
      end: titleMatch[0].length,
    };
  }

  const uppercaseMatch = source.match(UPPERCASE_FATHER_RE);
  if (!uppercaseMatch) return null;

  return {
    name: uppercaseMatch[1],
    end: uppercaseMatch[0].length,
  };
}

/**
 * Format a raw commentary block into HTML paragraphs.
 *
 * Strategy:
 *  1. Split inline verse markers for the selected Gospel range.
 *  2. Split on newlines.
 *  3. If a line starts a new semantic block (Father name / verse number)
 *     or is blank, start a new paragraph.
 *  4. Otherwise, it is a PDF word-wrap continuation; append it to the previous
 *     paragraph with a space (or no space if the previous line ended with a hyphen).
 *  5. Convert each merged paragraph to a <p> with styled Father chips
 *     and verse-number spans.
 *
 * @param {string} raw - Raw text from the JSON data file.
 * @param {string} rangeStr - Catena range for the current block, e.g. "6:15-21".
 * @returns {string} - HTML string ready for innerHTML.
 */
function formatCommentary(raw, rangeStr = '') {
  const verseNums = getRangeVerseNumbers(rangeStr);
  const lines = splitInlineVerseMarkers(raw, rangeStr).split('\n');
  const merged = [];
  let current = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      const nextNonBlank = findNextNonBlankLine(lines, i + 1);
      if (!nextNonBlank) break;

      if (current && isBlockStart(nextNonBlank, verseNums)) {
        merged.push(current);
        current = '';
      }
      continue;
    }

    if (!current) {
      current = trimmed;
      continue;
    }

    if (isBlockStart(line, verseNums)) {
      merged.push(current);
      current = trimmed;
      continue;
    }

    current += (current.endsWith('-') ? '' : ' ') + trimmed;
  }

  if (current) merged.push(current);

  return merged.map(p => formatParagraph(p, verseNums)).join('');
}

function isBlockStart(line, verseNums) {
  return !!matchFather(line) || startsRangeVerse(line, verseNums);
}

function formatParagraph(paragraph, verseNums) {
  let source = String(paragraph || '');
  let prefix = '';

  const verseMatch = source.match(VERSE_NUM_RE);
  if (verseMatch && verseNums.includes(Number(verseMatch[1])) && startsRangeVerse(source, verseNums)) {
    prefix += `<span class="vs-num">${escHtml(verseMatch[1])}.</span> `;
    source = source.slice(verseMatch[0].length);
  }

  const fatherMatch = matchFather(source);
  if (fatherMatch) {
    prefix += `<strong class="father">${escHtml(fatherMatch.name)}</strong> `;
    source = source.slice(fatherMatch.end);
  }

  return `<p>${prefix}${escHtml(source)}</p>`;
}

function startsRangeVerse(line, verseNums) {
  const match = String(line || '').match(/^\s*(\d+)\.\s+(\S)/);
  if (!match || !verseNums.includes(Number(match[1]))) return false;

  return /^[A-Z\u00C0-\u00D6\u00D8-\u00DE"'“‘«([]/.test(match[2]);
}

function findNextNonBlankLine(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim()) return lines[i];
  }
  return '';
}

/**
 * Add line breaks before verse markers that belong to the selected range.
 * Some source blocks contain "22. text 23. text" in a single paragraph;
 * citations such as "Sermão 83." must not be treated as Gospel verses.
 *
 * @param {string} raw
 * @param {string} rangeStr
 * @returns {string}
 */
function splitInlineVerseMarkers(raw, rangeStr) {
  const verseNums = getRangeVerseNumbers(rangeStr);
  if (!verseNums.length) return String(raw);

  const markers = verseNums
    .sort((a, b) => b - a)
    .map(n => String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const markerRe = new RegExp(`([^\\n])\\s+(${markers})\\.\\s+(?=\\S)`, 'g');

  return String(raw).replace(markerRe, (_, previous, marker) => `${previous}\n${marker}. `);
}

/**
 * Extract all verse numbers from a Catena range such as "6:15-21".
 * @param {string} rangeStr
 * @returns {number[]}
 */
function getRangeVerseNumbers(rangeStr) {
  const match = String(rangeStr || '').match(/\d+:(\d+)(?:[–\-](\d+))?/);
  if (!match) return [];

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  const nums = [];
  for (let n = start; n <= end; n++) nums.push(n);
  return nums;
}
