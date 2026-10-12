const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/liturgy-2026-12-27.json'), 'utf8'));
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

for (const [index, expectedVerses] of [
  [0, Array.from({ length: 19 }, (_, offset) => offset + 22)],
  [1, [22, 39, 40]],
]) {
  const gospel = fixture.leituras.evangelho[index];
  const plainReference = index === 0 ? 'Lc 2, 22-40' : 'Lc 2, 22.39-40';

  test(`December 27 reference ${gospel.referencia} retains the complete verse range`, () => {
    const ref = bible.parseGospelReference(gospel.referencia);
    assert.ok(ref);
    assert.deepEqual(ref, bible.parseGospelReference(plainReference));
    assert.equal(ref.bookKey, 'lucas');
    assert.equal(ref.chapter, 2);
    assert.equal(ref.startVerse, 22);
    assert.equal(ref.endVerse, 40);
    assert.deepEqual(Array.from(bible.parseReferenceVerseSet(gospel.referencia)), expectedVerses);
    assert.deepEqual(Array.from(bible.parseReferenceVerseLabelSet(gospel.referencia)), Array.from(bible.parseReferenceVerseLabelSet(plainReference)));
    assert.deepEqual(Array.from(bible.parseReferenceChapterMarkerSet(gospel.referencia)), [2]);
    const parts = bible.splitGospelText(gospel.texto, ref, gospel.referencia);
    assert.deepEqual(Array.from(parts.verses, part => part.verse), expectedVerses);
    assert.ok(parts.verses.every(part => part.chapter === 2));
  });

  test(`December 27 version ${index + 1} renders all verses with actual Catena links`, () => {
    const data = { ...fixture, leituras: { ...fixture.leituras, evangelho: [gospel] } };
    renderer.render(data, bible.parseGospelReference(gospel.referencia));
    const html = context.CatenaDOM.refs.liturgyView.innerHTML;
    assert.ok(html.includes('value="2026-12-27"'));
    assert.ok(html.includes(text.escHtml(fixture.liturgia)));
    assert.ok(html.includes(text.escHtml(gospel.referencia)));
    assert.ok(html.includes(text.escHtml(fixture.leituras.primeiraLeitura[0].referencia)));
    assert.ok(html.includes(text.escHtml(fixture.oracoes.coleta)));
    assert.equal((html.match(/data-verse="/g) || []).length, expectedVerses.length);
    const commentaryMap = bible.buildCommentaryMap(book.commentary['2']);
    for (const verse of expectedVerses) {
      const key = commentaryMap[String(verse)];
      assert.ok(book.commentary['2'][key].text);
      assert.ok(html.includes(`data-chapter="2" data-verse="${verse}" data-vskey="${key}" role="button" tabindex="0"`));
      assert.ok(state.liturgy.verseTexts[`2:${verse}`]);
    }

    const plainData = { ...data, leituras: { ...data.leituras, evangelho: [{ ...gospel, referencia: plainReference }] } };
    renderer.render(plainData, bible.parseGospelReference(plainReference));
    assert.equal(html.replace(text.escHtml(gospel.referencia), text.escHtml(plainReference)), context.CatenaDOM.refs.liturgyView.innerHTML);
  });
}

test('unrecognized or missing references display the full reading without commentary controls', () => {
  for (const reference of ['', 'Referencia indisponivel', 'Livro 2,22-40']) {
    const gospel = { ...fixture.leituras.evangelho[0], referencia: reference };
    const data = { ...fixture, leituras: { ...fixture.leituras, evangelho: [gospel] } };
    const ref = bible.parseGospelReference(reference);
    assert.equal(ref, null);
    assert.doesNotThrow(() => renderer.render(data, ref));
    const html = context.CatenaDOM.refs.liturgyView.innerHTML;
    assert.ok(html.includes(`<p>${text.formatVerseMarkers(gospel.texto, reference)}</p>`));
    assert.ok(html.includes('n&atilde;o p&ocirc;de ser vinculada automaticamente'));
    assert.ok(!html.includes('has-commentary'));
    assert.equal(Object.keys(state.liturgy.verseTexts).length, 0);
  }
});

test('cross-chapter ranges and verse suffixes keep their meaning with a trailing note', () => {
  for (const reference of ['Lc 1,80-2,2', 'Mt 7,21a.24-27', 'Jo 1,1-18']) {
    const annotated = `${reference} (forma longa)`;
    assert.deepEqual(bible.parseGospelReference(annotated), bible.parseGospelReference(reference));
    assert.deepEqual(Array.from(bible.parseReferenceVerseSet(annotated)), Array.from(bible.parseReferenceVerseSet(reference)));
    assert.deepEqual(Array.from(bible.parseReferenceVerseLabelSet(annotated)), Array.from(bible.parseReferenceVerseLabelSet(reference)));
    assert.deepEqual(Array.from(bible.parseReferenceChapterMarkerSet(annotated)), Array.from(bible.parseReferenceChapterMarkerSet(reference)));
  }
  assert.equal(bible.parseReferenceVerseSet('Sl 127(128),1-2'), null);
  assert.equal(bible.parseGospelReference('Lc 2,22-40 (nota incompleta'), null);
});
