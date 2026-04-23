'use strict';

const CatenaDataService = (() => {
  const LITURGY_API = 'https://liturgia.up.railway.app/v2/';

  function getBook(bookKey) {
    return CatenaState.bookCache[bookKey] || null;
  }

  function loadBook(bookKey) {
    if (CatenaState.bookCache[bookKey]) {
      return Promise.resolve(CatenaState.bookCache[bookKey]);
    }

    return new Promise((resolve, reject) => {
      if (window.CATENA_DATA && window.CATENA_DATA[bookKey]) {
        CatenaState.bookCache[bookKey] = window.CATENA_DATA[bookKey];
        resolve(CatenaState.bookCache[bookKey]);
        return;
      }

      const script = document.createElement('script');
      script.src = `data/${bookKey}.js`;
      script.async = true;

      script.onload = () => {
        const data = window.CATENA_DATA && window.CATENA_DATA[bookKey];
        if (data) {
          CatenaState.bookCache[bookKey] = data;
          resolve(data);
          return;
        }

        reject(new Error(`Data for "${bookKey}" not found after script load.`));
      };

      script.onerror = () => {
        reject(new Error(`Failed to load data/${bookKey}.js`));
      };

      document.head.appendChild(script);
    });
  }

  async function loadLiturgy(isoDate) {
    if (CatenaState.liturgyCache[isoDate]) {
      return CatenaState.liturgyCache[isoDate];
    }

    const { day, month, year } = CatenaDate.datePartsFromISO(isoDate);
    const response = await fetch(`${LITURGY_API}?dia=${day}&mes=${month}&ano=${year}`);
    if (!response.ok) {
      throw new Error(`A API respondeu com status ${response.status}.`);
    }

    const data = await response.json();
    CatenaState.liturgyCache[isoDate] = data;
    return data;
  }

  return {
    getBook,
    loadBook,
    loadLiturgy,
  };
})();
