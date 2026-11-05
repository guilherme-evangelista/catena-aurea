const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/liturgy-2026-10-31.json'), 'utf8'));
const gospel = fixture.leituras.evangelho[0];
const plainReference = 'Lc 14,1.7-11';
const expectedVerses = [1, 7, 8, 9, 10, 11];
const context = vm.createContext({
  URLSearchParams,
  window: {},
  document: { getElementById: () => null },
  CatenaDOM: { refs: { liturgyView: { innerHTML: '' } } },
});

for (const file of [
  'assets/js/core/date-utils.js',
  'assets/js/core/bible-utils.js',
  'assets/js/core/text-utils.js',
  'assets/js/core/state.js',
  'assets/js/services/data-service.js',
  'assets/js/renderers/liturgy-renderer.js',
  'data/lucas.js',
]) {
  vm.runInContext(readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const { bible, text, state, renderer, book } = vm.runInContext(`({
  bible: CatenaBible,
  text: CatenaText,
  state: CatenaState,
  renderer: CatenaLiturgyRenderer,
  book: window.CATENA_DATA.lucas,
})`, context);
state.bookCache.lucas = book;

test('October 31 API reference retains verses 1 and 7 through 11', () => {
  const reference = bible.parseGospelReference(gospel.referencia);
  assert.deepEqual(reference, bible.parseGospelReference(plainReference));
  assert.equal(reference.chapter, 14);
  assert.equal(reference.endVerse, 11);
  assert.deepEqual(Array.from(bible.parseReferenceVerseSet(gospel.referencia)), expectedVerses);
  assert.deepEqual(Array.from(bible.parseReferenceVerseLabelSet(gospel.referencia)), Array.from(bible.parseReferenceVerseLabelSet(plainReference)));
  assert.deepEqual(Array.from(bible.parseReferenceChapterMarkerSet(gospel.referencia)), [14]);

  const parts = bible.splitGospelText(gospel.texto, reference, gospel.referencia);
  assert.equal(parts.intro, '');
  assert.deepEqual(Array.from(parts.verses, part => part.verse), expectedVerses);
  assert.ok(parts.verses.every(part => part.chapter === 14));
  assert.ok(parts.verses[0].text.endsWith('E eles o observavam.'));
  assert.ok(parts.verses[1].text.startsWith('Jesus notou'));
  assert.ok(parts.verses[3].text.startsWith('e o dono'));
  const reconstructed = parts.verses.map(part => `${part.label}${part.text}`).join(' ');
  assert.equal(reconstructed, gospel.texto);
});

test('October 31 renders six separate verses with their actual patristic links', () => {
  renderer.render(fixture, bible.parseGospelReference(gospel.referencia));
  const html = context.CatenaDOM.refs.liturgyView.innerHTML;
  assert.ok(html.includes('value="2026-10-31"'));
  assert.ok(html.includes(text.escHtml(fixture.liturgia)));
  assert.ok(html.includes(`<div class="liturgy-reference">${plainReference}</div>`));
  assert.ok(!html.includes('\u00ac'));
  assert.equal((html.match(/data-verse="/g) || []).length, expectedVerses.length);
  const commentaryMap = bible.buildCommentaryMap(book.commentary['14']);
  for (const verse of expectedVerses) {
    const key = commentaryMap[String(verse)];
    assert.ok(book.commentary['14'][key].text);
    assert.ok(html.includes(`data-chapter="14" data-verse="${verse}" data-vskey="${key}" role="button" tabindex="0"`));
    assert.ok(html.includes(`<sup class="lit-v-num">${verse}</sup>`));
    assert.ok(state.liturgy.verseTexts[`14:${verse}`]);
  }
  assert.ok(!state.liturgy.verseTexts['14:1'].includes('7Jesus'));

  const plainData = { ...fixture, leituras: { evangelho: [{ ...gospel, referencia: plainReference }] } };
  renderer.render(plainData, bible.parseGospelReference(plainReference));
  assert.equal(html, context.CatenaDOM.refs.liturgyView.innerHTML);
  assert.equal(gospel.referencia, 'Lc 14,1.7-11\u00ac\u00ac');
});

test('trailing not-sign artifacts do not alter normal ranges, suffixes, notes or chapter transitions', () => {
  for (const reference of ['Lc 14,1.7-11', 'Mt 7,21a.24-27', 'Lc 1,80-2,2', 'Lc 2,22-40 (mais longo)']) {
    for (const suffix of ['\u00ac', '\u00ac\u00ac', ' \u00ac \u00ac\n']) {
      const marked = reference + suffix;
      assert.deepEqual(bible.parseGospelReference(marked), bible.parseGospelReference(reference));
      assert.deepEqual(Array.from(bible.parseReferenceVerseSet(marked)), Array.from(bible.parseReferenceVerseSet(reference)));
      assert.deepEqual(Array.from(bible.parseReferenceVerseLabelSet(marked)), Array.from(bible.parseReferenceVerseLabelSet(reference)));
      assert.deepEqual(Array.from(bible.parseReferenceChapterMarkerSet(marked)), Array.from(bible.parseReferenceChapterMarkerSet(reference)));
    }
  }
  for (const reference of ['Lc 14,7\u00ac11', 'Lc 14,7-11abc', 'Lc 14,7-11 (nota incompleta']) {
    assert.equal(bible.parseGospelReference(reference), null);
  }
});

test('plain reading number formatting uses the same complete verse selection', () => {
  assert.equal(text.formatVerseMarkers(gospel.texto, gospel.referencia), text.formatVerseMarkers(gospel.texto, plainReference));
});
