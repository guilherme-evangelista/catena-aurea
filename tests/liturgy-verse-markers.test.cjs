const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/liturgy-2026-12-03.json'), 'utf8'));
const gospel = fixture.leituras.evangelho[0];
const context = vm.createContext({
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
  'data/mateus.js',
]) {
  vm.runInContext(readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const { bible, text, state, renderer, book } = vm.runInContext(`({
  bible: CatenaBible,
  text: CatenaText,
  state: CatenaState,
  renderer: CatenaLiturgyRenderer,
  book: window.CATENA_DATA.mateus,
})`, context);
state.bookCache.mateus = book;

function split(source, reference = gospel.referencia) {
  return bible.splitGospelText(source, bible.parseGospelReference(reference), reference);
}

test('December 3 response keeps verse 21 out of the introduction and preserves its text', () => {
  const result = split(gospel.texto);
  assert.equal(result.intro, 'Naquele tempo, disse Jesus aos seus disc\u00edpulos:');
  assert.deepEqual(Array.from(result.verses, item => item.verse), [21, 24, 25, 26, 27]);
  assert.equal(result.verses[0].text, gospel.texto.slice(gospel.texto.indexOf('21') + 2, gospel.texto.indexOf('24Portanto')).trim());
  assert.equal(result.verses[0].text[0], '\u2033');
});

test('rendered verse 21 is keyboard-accessible and linked to the actual patristic commentary', () => {
  renderer.render(fixture, bible.parseGospelReference(gospel.referencia));
  const html = context.CatenaDOM.refs.liturgyView.innerHTML;
  const commentaryKey = bible.buildCommentaryMap(book.commentary['7'])['21'];
  assert.ok(book.commentary['7'][commentaryKey].text);
  assert.ok(html.includes(`<p class="liturgy-gospel-intro">Naquele tempo, disse Jesus aos seus disc\u00edpulos:</p>`));
  for (const verse of [21, 24, 25, 26, 27]) {
    const key = bible.buildCommentaryMap(book.commentary['7'])[String(verse)];
    assert.ok(html.includes(`class="liturgy-verse has-commentary" data-chapter="7" data-verse="${verse}" data-vskey="${key}" role="button" tabindex="0"`));
    assert.ok(state.liturgy.verseTexts[`7:${verse}`]);
  }
  assert.ok(state.liturgy.verseTexts['7:21'].startsWith('\u2033Nem todo'));
});

test('ordinary whitespace, direct text and existing quote styles still delimit verses', () => {
  for (const quote of ['', ' ', '"', "'", '\u201c', '\u2018', '\u00ab', '\u2033']) {
    const result = split(`Introducao: 21${quote}Primeiro texto. 24Segundo texto. 25Terceiro. 26Quarto. 27Fim.`);
    assert.equal(result.intro, 'Introducao:');
    assert.deepEqual(Array.from(result.verses, item => item.verse), [21, 24, 25, 26, 27]);
    assert.equal(result.verses[0].text, `${quote}Primeiro texto.`.trim());
  }
});

test('a closing quote before a marker does not prevent the next verse from being recognized', () => {
  for (const quote of ['"', "'", '\u201d', '\u2019', '\u00bb', '\u2033']) {
    const result = split(`21Primeiro${quote}24Segundo`, 'Mt 7,21.24');
    assert.deepEqual(Array.from(result.verses, item => item.verse), [21, 24]);
    assert.equal(result.verses[0].text, `Primeiro${quote}`);
  }
});

test('verse suffixes and invisible padding remain supported next to the quote', () => {
  for (const marker of ['21a', '21A', '21a\u200b', '21\u200ba']) {
    const result = split(`${marker}\u2033Primeiro 24Segundo`, 'Mt 7,21a.24');
    assert.deepEqual(Array.from(result.verses, item => item.verse), [21, 24]);
    assert.equal(result.verses[0].label.toLowerCase(), '21a');
    assert.equal(result.verses[0].text, '\u2033Primeiro');
  }
});

test('chapter transitions followed by quotes retain the correct chapter and verse', () => {
  for (const [closing, opening] of [['"', '"'], ['\u201d', '\u201c'], ['\u2033', '\u2033']]) {
    const result = split(`80Primeiro${closing}2,1${opening}Segundo 2Terceiro`, 'Lc 1,80-2,2');
    assert.deepEqual(Array.from(result.verses, item => [item.chapter, item.verse]), [[1, 80], [2, 1], [2, 2]]);
    assert.equal(result.verses[1].chapterLabel, '2');
    assert.equal(result.verses[1].text, `${opening}Segundo`);
  }
});

test('the reference still excludes unrelated numbers and the no-marker fallback is unchanged', () => {
  const result = split('Introducao 22\u2033Nota 24Texto 27Fim', 'Mt 7,24.27');
  assert.equal(result.intro, 'Introducao 22\u2033Nota');
  assert.deepEqual(Array.from(result.verses, item => item.verse), [24, 27]);
  const fallback = split('Texto sem numeracao', 'Mt 7,21');
  assert.equal(fallback.verses.length, 1);
  assert.equal(fallback.verses[0].verse, 21);
  assert.equal(fallback.verses[0].text, 'Texto sem numeracao');
});

test('plain reading markers also preserve the quote and honor the reference', () => {
  assert.equal(text.formatVerseMarkers('21\u2033Texto 24Outro', 'Mt 7,21.24'), '<sup class="lit-v-num">21</sup> \u2033Texto <sup class="lit-v-num">24</sup> Outro');
  assert.equal(text.formatVerseMarkers('21\u2033Texto', 'Mt 7,24'), '21\u2033Texto');
});
