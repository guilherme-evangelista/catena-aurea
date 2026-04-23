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

/**
 * Regex that identifies the start of a new semantic paragraph:
 * either a Father's name in ALL-CAPS followed by a period,
 * or a verse number (digit + period) at the start of a line.
 */
const BLOCK_START_RE = new RegExp(
  `^\\s*(?:[${FATHER_NAME_CHARS}]{3,}(?:[\\s\\-][${FATHER_NAME_CHARS}]+)*\\s*\\.|\\d+\\.)\\s`
);

/** Regex matching a Father's name at the very start of a paragraph. */
const FATHER_RE = new RegExp(
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
  const lines = splitInlineVerseMarkers(raw, rangeStr).split('\n');
  const merged = [];
  let current = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      const nextNonBlank = findNextNonBlankLine(lines, i + 1);
      if (!nextNonBlank) break;

      if (current && BLOCK_START_RE.test(nextNonBlank)) {
        merged.push(current);
        current = '';
      }
      continue;
    }

    if (!current) {
      current = trimmed;
      continue;
    }

    if (BLOCK_START_RE.test(line)) {
      merged.push(current);
      current = trimmed;
      continue;
    }

    current += (current.endsWith('-') ? '' : ' ') + trimmed;
  }

  if (current) merged.push(current);

  return merged
    .map(p => {
      let h = escHtml(p);

      h = h.replace(FATHER_RE, (_, name) =>
        `<strong class="father">${escHtml(name)}</strong> `
      );

      h = h.replace(VERSE_NUM_RE, (_, n) =>
        `<span class="vs-num">${n}.</span> `
      );

      return `<p>${h}</p>`;
    })
    .join('');
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
