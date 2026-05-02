'use strict';

const CatenaBible = (() => {
  const CATENA_RANGE_RE = /\d+:(\d+)(?:[\u2013-](\d+))?/;
  const FATHER_LINE_RE = /\n\s*[A-Z\u00C0-\u00D6\u00D8-\u00DE-]{3,}(?:[\s-][A-Z\u00C0-\u00D6\u00D8-\u00DE-]+)*\s*\./;
  const MAX_REFERENCE_VERSE = 200;

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
    const ranges = parseReferenceRanges(ref);
    if (!ranges.length) return null;

    const verses = new Set();

    ranges.forEach(range => {
      if (range.endChapter !== range.startChapter) {
        for (let verse = range.startVerse; verse <= MAX_REFERENCE_VERSE; verse++) {
          verses.add(verse);
        }
        for (let verse = 1; verse <= range.endVerse; verse++) {
          verses.add(verse);
        }
        return;
      }

      for (let verse = Math.min(range.startVerse, range.endVerse); verse <= Math.max(range.startVerse, range.endVerse); verse++) {
        verses.add(verse);
      }
    });

    return verses.size ? verses : null;
  }

  function parseReferenceVerseLabelSet(ref) {
    const ranges = parseReferenceRanges(ref);
    if (!ranges.length) return null;

    const labels = new Set();

    ranges.forEach(range => {
      const startLabel = range.startLabel.toLowerCase();
      const endLabel = range.endLabel.toLowerCase();

      labels.add(startLabel);
      if (endLabel !== startLabel) labels.add(endLabel);

      if (range.endChapter !== range.startChapter) {
        if (!/[a-c]$/i.test(startLabel)) {
          for (let verse = range.startVerse; verse <= MAX_REFERENCE_VERSE; verse++) {
            labels.add(String(verse));
          }
        }
        if (!/[a-c]$/i.test(endLabel)) {
          for (let verse = 1; verse <= range.endVerse; verse++) {
            labels.add(String(verse));
          }
        }
        return;
      }

      if (!/[a-c]$/i.test(startLabel) && !/[a-c]$/i.test(endLabel)) {
        for (let verse = Math.min(range.startVerse, range.endVerse); verse <= Math.max(range.startVerse, range.endVerse); verse++) {
          labels.add(String(verse));
        }
      }
    });

    return labels.size ? labels : null;
  }

  function parseReferenceChapterMarkerSet(ref) {
    const ranges = parseReferenceRanges(ref);
    if (!ranges.length) return null;

    const markers = new Set();
    const firstChapter = ranges[0].startChapter;

    ranges.forEach(range => {
      if (range.startChapter !== firstChapter) {
        markers.add(range.startChapter);
      }

      if (range.endChapter !== range.startChapter) {
        const direction = range.endChapter > range.startChapter ? 1 : -1;
        for (let chapter = range.startChapter + direction; chapter !== range.endChapter + direction; chapter += direction) {
          markers.add(chapter);
        }
      }
    });

    return markers.size ? markers : null;
  }

  function parseReferenceRanges(ref) {
    const source = String(ref || '');
    const firstChapterMatch = source.match(/(\d+)\s*,/);
    if (!firstChapterMatch) return [];

    let currentChapter = Number(firstChapterMatch[1]);
    if (!currentChapter) return [];

    const verseSpec = source.slice(firstChapterMatch.index + firstChapterMatch[0].length);
    const segments = verseSpec
      .split(/[.;]/)
      .map(segment => segment.trim())
      .filter(Boolean);

    const ranges = [];

    segments.forEach(segment => {
      const parsed = parseReferenceSegment(segment, currentChapter);
      if (!parsed) return;

      ranges.push(parsed);
      currentChapter = parsed.endChapter;
    });

    return ranges;
  }

  function parseReferenceSegment(segment, defaultChapter) {
    let startChapter = defaultChapter;
    let body = String(segment || '').trim();
    const chapterPrefix = body.match(/^(\d+)\s*,\s*(.+)$/);

    if (chapterPrefix) {
      startChapter = Number(chapterPrefix[1]);
      body = chapterPrefix[2].trim();
    }

    const match = body.match(/^(\d+[a-c]?)(?:\s*[-\u2013]\s*(?:(\d+)\s*,\s*)?(\d+[a-c]?))?$/i);
    if (!match) return null;

    const startLabel = match[1];
    const startVerse = parseVerseNumber(startLabel);
    const endChapter = match[2] ? Number(match[2]) : startChapter;
    const endLabel = match[3] || startLabel;
    const endVerse = parseVerseNumber(endLabel);

    if (!startChapter || !startVerse || !endChapter || !endVerse) return null;

    return {
      startChapter,
      startVerse,
      startLabel,
      endChapter,
      endVerse,
      endLabel,
    };
  }

  function collectInlineVerseMarkers(text, options = {}) {
    const source = String(text || '');
    const markerRe = /(^|[\s\n.!?;:,)"'“”‘’»\]])(\d{1,3}(?:[a-cA-C](?=$|[\s\n.!?;:,)"'“”‘’»\]]|["'“‘«([{]))?)(?=$|\s+|["'“”‘’«»([{]|[A-Za-z\u00C0-\u00FF])/g;
    const matches = [];
    const allowedVerses = options.allowedVerses instanceof Set ? options.allowedVerses : null;
    const allowedLabels = options.allowedLabels instanceof Set ? options.allowedLabels : null;
    const allowedChapterMarkers = options.allowedChapterMarkers instanceof Set ? options.allowedChapterMarkers : null;
    const requireKnownSuffix = options.requireKnownSuffix === true;
    const minVerse = Number.isFinite(options.minVerse) ? options.minVerse : null;
    const maxVerse = Number.isFinite(options.maxVerse) ? options.maxVerse : null;
    let match;

    if (allowedChapterMarkers) {
      matches.push(...collectInlineChapterMarkers(source, allowedChapterMarkers, allowedVerses));
    }

    while ((match = markerRe.exec(source)) !== null) {
      let label = match[2];
      let markerEnd = match.index + match[1].length + label.length;
      if (requireKnownSuffix && /[a-c]$/i.test(label) && !allowedLabels?.has(label.toLowerCase())) {
        label = label.slice(0, -1);
        markerEnd -= 1;
      }
      if (requireKnownSuffix && !/[a-c]$/i.test(label) && allowedLabels) {
        const suffix = findDetachedVerseSuffix(source, markerEnd, label, allowedLabels);
        if (suffix) {
          label += suffix.letter;
          markerEnd = suffix.end;
        }
      }

      const verse = parseVerseNumber(label);
      if (!verse) continue;
      if (allowedVerses && !allowedVerses.has(verse)) continue;
      if (minVerse !== null && verse < minVerse) continue;
      if (maxVerse !== null && verse > maxVerse) continue;

      const markerStart = match.index + match[1].length;
      matches.push({
        verse,
        label,
        markerStart,
        markerEnd,
        contentStart: markerEnd,
      });
    }

    return matches.sort((a, b) => a.markerStart - b.markerStart);
  }

  function collectInlineChapterMarkers(source, allowedChapterMarkers, allowedVerses) {
    const chapterRe = /(^|[\s\n.!?;:,)"'\u201D\u2019\u00BB\]])(\d{1,3})\s*,\s*(\d+[a-cA-C]?)(?=$|\s+|["'\u201C\u2018\u00AB([{]|[A-Za-z\u00C0-\u00FF])/g;
    const markers = [];
    let match;

    while ((match = chapterRe.exec(source)) !== null) {
      const chapter = Number(match[2]);
      if (!allowedChapterMarkers.has(chapter)) continue;

      const nextVerse = parseVerseNumber(match[3]);
      if (!nextVerse) continue;
      if (allowedVerses && !allowedVerses.has(nextVerse)) continue;

      const markerStart = match.index + match[1].length;
      const markerEnd = markerStart + match[2].length;
      markers.push({
        verse: chapter,
        label: match[2],
        markerStart,
        markerEnd,
        contentStart: markerEnd,
        isChapterMarker: true,
      });
    }

    return markers;
  }

  function findDetachedVerseSuffix(source, startIndex, label, allowedLabels) {
    const match = source.slice(startIndex).match(/^\s*([a-cA-C])(?=\S)/);
    if (!match) return null;

    const combined = `${label}${match[1]}`.toLowerCase();
    if (!allowedLabels.has(combined)) return null;

    return {
      letter: match[1].toUpperCase(),
      end: startIndex + match[0].length,
    };
  }

  function splitGospelText(text, gospelRef, reference = '') {
    const source = String(text || '');
    const allowedLabels = parseReferenceVerseLabelSet(reference);
    const matches = collectInlineVerseMarkers(source, {
      allowedLabels,
      minVerse: gospelRef?.startVerse,
      maxVerse: gospelRef?.endVerse,
      requireKnownSuffix: !!String(reference || '').trim(),
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
    parseReferenceVerseLabelSet,
    parseReferenceChapterMarkerSet,
    collectInlineVerseMarkers,
    splitGospelText,
    expandLeadingRangeQuote,
  };
})();
