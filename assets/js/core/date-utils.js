'use strict';

const CatenaDate = (() => {
  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseApiDate(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  }

  function datePartsFromISO(isoDate) {
    const [year, month, day] = String(isoDate).split('-');
    return { day, month, year };
  }

  function shiftISODate(isoDate, delta) {
    const [year, month, day] = String(isoDate).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + delta);
    return toISODate(date);
  }

  function formatLongDate(isoDate) {
    const [year, month, day] = String(isoDate).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  return {
    toISODate,
    parseApiDate,
    datePartsFromISO,
    shiftISODate,
    formatLongDate,
  };
})();
