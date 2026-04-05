/**
 * commentary.js
 * Formats raw commentary text extracted from the Catena Áurea PDFs into
 * styled HTML. Handles:
 *   - PDF line-wrap collapsing (wrap at ~90 chars in source)
 *   - Patristic Father name detection → styled chip
 *   - Verse number detection → styled number span
 */

/* global formatCommentary */

/**
 * Regex that identifies the start of a new semantic paragraph:
 * either a Father's name in ALL-CAPS followed by a period,
 * or a verse number (digit + period) at the start of a line.
 */
const BLOCK_START_RE =
  /^(?:[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\-]{3,}(?:[\s\-][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\-]+)*\s*\.|\d+\.)\s/;

/** Regex matching a Father's name at the very start of a paragraph. */
const FATHER_RE =
  /^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\-]{3,}(?:[\s\-][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\-]+)*)\s*\.\s*/;

/** Regex matching a verse number (e.g. "5. ") at the start of a paragraph. */
const VERSE_NUM_RE = /^(\d+)\.\s/;

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
 *  1. Split on newlines.
 *  2. If a line starts a new semantic block (Father name / verse number)
 *     or is blank → start a new paragraph.
 *  3. Otherwise, it is a PDF word-wrap continuation → append to the previous
 *     paragraph with a space (or no space if prev line ended with a hyphen).
 *  4. Convert each merged paragraph to a <p> with styled Father chips
 *     and verse-number spans.
 *
 * @param {string} raw - Raw text from the JSON data file.
 * @returns {string} - HTML string ready for innerHTML.
 */
function formatCommentary(raw) {
  const lines  = raw.split('\n');
  const merged = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 || BLOCK_START_RE.test(line) || line.trim() === '') {
      merged.push(line);
    } else {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = prev + (prev.endsWith('-') ? '' : ' ') + line.trim();
    }
  }

  return merged
    .filter(p => p.trim().length > 0)
    .map(p => {
      let h = escHtml(p);

      // Style Father name at paragraph start
      h = h.replace(FATHER_RE, (_, name) =>
        `<strong class="father">${escHtml(name)}</strong> `
      );

      // Style verse number at paragraph start
      h = h.replace(VERSE_NUM_RE, (_, n) =>
        `<span class="vs-num">${n}.</span> `
      );

      return `<p>${h}</p>`;
    })
    .join('');
}
