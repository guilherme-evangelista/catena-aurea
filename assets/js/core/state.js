'use strict';

const CatenaState = {
  currentBook: null,
  currentChapter: null,
  bookCache: {},
  liturgyCache: {},
  liturgy: {
    date: CatenaDate.toISODate(new Date()),
    data: null,
    gospelRef: null,
    verseTexts: {},
  },

  resetBookSelection() {
    this.currentBook = null;
    this.currentChapter = null;
  },

  resetLiturgy(date) {
    this.liturgy.date = date;
    this.liturgy.data = null;
    this.liturgy.gospelRef = null;
    this.liturgy.verseTexts = {};
  },
};
