'use strict';

const CatenaBible = (() => {
  const CATENA_RANGE_RE = /\d+:(\d+)(?:[\u2013-](\d+))?/;
  const FATHER_LINE_RE = /\n\s*[A-Z\u00C0-\u00D6\u00D8-\u00DE-]{3,}(?:[\s-][A-Z\u00C0-\u00D6\u00D8-\u00DE-]+)*\s*\./;

  function firstReading(readings) {
    return Array.isArray(readings) && readings.length ? readings[0] : null;
  }

  function buildCommentaryMap(comm) {
    const map = {};
    for (const [vsKey, block] of Object.entries(comm || {})) {
      const range = parseCatenaRange(block.range);
      if (!range) continue;

      for (let v = range.start; v <= range.end; v++) {
        map[String(v)] = vsKey;
      }
    }
    return map;
  }

  function parseCatenaRange(rangeStr) {
    const match = String(rangeStr || '').match(CATENA_RANGE_RE);
    if (!match) return null;

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    return { start, end };
  }

  function parseGospelReference(ref) {
    if (/[-\u2013]\s*\d+\s*,/.test(ref)) return null;

    const match = String(ref).match(/^\s*([1-3]?\s*[A-Za-z\u00C0-\u00FF]+)\.?\s+(\d+)\s*,\s*(\d+[a-c]?)(?:\s*[-\u2013]\s*(\d+[a-c]?))?/i);
    if (!match) return null;

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
    const bookKey = bookMap[normalizeBookToken(match[1])];
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

  function normalizeBookToken(token) {
    return String(token)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  function parseVerseNumber(token) {
    const match = String(token).match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function parseReferenceVerseSet(ref) {
    const source = String(ref || '');
    const commaIndex = source.indexOf(',');
    if (commaIndex < 0) return null;

    const verseSpec = source.slice(commaIndex + 1);
    const segments = verseSpec
      .split(/[.;]/)
      .map(segment => segment.trim())
      .filter(Boolean);

    const verses = new Set();

    segments.forEach(segment => {
      const match = segment.match(/^(\d+[a-c]?)(?:\s*[-\u2013]\s*(\d+[a-c]?))?$/i);
      if (!match) return;

      const start = parseVerseNumber(match[1]);
      const end = match[2] ? parseVerseNumber(match[2]) : start;
      if (!start || !end) return;

      for (let verse = Math.min(start, end); verse <= Math.max(start, end); verse++) {
        verses.add(verse);
      }
    });

    return verses.size ? verses : null;
  }

  function collectInlineVerseMarkers(text, options = {}) {
    const source = String(text || '');
    const markerRe = /(^|[\s\n.!?;:,)"'“”‘’»\]])(\d{1,3}[a-c]?)(?=(?:\s+|["'“”‘’«»([{])?\S)/g;
    const matches = [];
    const allowedVerses = options.allowedVerses instanceof Set ? options.allowedVerses : null;
    const minVerse = Number.isFinite(options.minVerse) ? options.minVerse : null;
    const maxVerse = Number.isFinite(options.maxVerse) ? options.maxVerse : null;
    let match;

    while ((match = markerRe.exec(source)) !== null) {
      const verse = parseVerseNumber(match[2]);
      if (!verse) continue;
      if (allowedVerses && !allowedVerses.has(verse)) continue;
      if (minVerse !== null && verse < minVerse) continue;
      if (maxVerse !== null && verse > maxVerse) continue;

      const markerStart = match.index + match[1].length;
      matches.push({
        verse,
        label: match[2],
        markerStart,
        markerEnd: markerStart + match[2].length,
        contentStart: markerStart + match[2].length,
      });
    }

    return matches;
  }

  function splitGospelText(text, gospelRef) {
    const source = String(text || '');
    const matches = collectInlineVerseMarkers(source, {
      minVerse: gospelRef?.startVerse,
      maxVerse: gospelRef?.endVerse,
    });

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

  function expandLeadingRangeQuote(raw, rangeStr, verses) {
    const range = parseCatenaRange(rangeStr);
    if (!range || range.start === range.end) return raw;

    const startRe = new RegExp(`^\\s*${range.start}\\s*[\\u2013-]\\s*${range.end}\\.\\s*`);
    if (!startRe.test(raw)) return raw;

    const firstFather = findFirstFatherLineIndex(raw);
    const suffix = firstFather >= 0 ? raw.slice(firstFather) : '';
    const replacement = [];

    for (let verse = range.start; verse <= range.end; verse++) {
      const text = verses[String(verse)];
      if (text) replacement.push(`${verse}. ${text}`);
    }

    if (!replacement.length) return raw;
    return `${replacement.join('\n')}${suffix}`;
  }

  function findFirstFatherLineIndex(raw) {
    const match = String(raw).match(FATHER_LINE_RE);
    return match ? match.index : -1;
  }

  return {
    firstReading,
    buildCommentaryMap,
    parseCatenaRange,
    parseGospelReference,
    parseVerseNumber,
    parseReferenceVerseSet,
    collectInlineVerseMarkers,
    splitGospelText,
    expandLeadingRangeQuote,
  };
})();
