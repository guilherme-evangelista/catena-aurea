'use strict';

const CatenaAppearance = (() => {
  const COLOR_MODE_KEY = 'catena-color-mode';
  const FAVICON_VERSION = '20260425-symbol-colors';
  const COLOR_MODE_BUTTON = {
    dark: {
      label: 'Alternar modo claro',
      icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 2.8v2.4M12 18.8v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,
    },
    light: {
      label: 'Alternar modo escuro',
      icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.9 7.9 0 1 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>`,
    },
  };

  function initColorMode() {
    setColorMode(getStoredColorMode(), false);
  }

  function getStoredColorMode() {
    try {
      const stored = localStorage.getItem(COLOR_MODE_KEY);
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  function setColorMode(mode, persist = true) {
    const nextMode = mode === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.colorMode = nextMode;

    if (persist) {
      try {
        localStorage.setItem(COLOR_MODE_KEY, nextMode);
      } catch {
        // Storage may be unavailable in private browsing or locked-down contexts.
      }
    }

    const meta = COLOR_MODE_BUTTON[nextMode];
    const toggle = CatenaDOM.refs.themeToggle;
    if (toggle && meta) {
      const modeIcon = toggle.querySelector('.mode-icon');
      toggle.setAttribute('aria-label', meta.label);
      toggle.setAttribute('title', meta.label);
      if (modeIcon) modeIcon.innerHTML = meta.icon;
    }
  }

  function toggleColorMode() {
    const currentMode = document.documentElement.dataset.colorMode === 'light' ? 'light' : 'dark';
    setColorMode(currentMode === 'light' ? 'dark' : 'light');
  }

  function updateFavicon(bookKey) {
    const key = SYMBOL_FAVICON_PATHS[bookKey] ? bookKey : 'mateus';
    CatenaDOM.refs.favicon.href = `${SYMBOL_FAVICON_PATHS[key]}?v=${FAVICON_VERSION}`;
  }

  return {
    initColorMode,
    toggleColorMode,
    updateFavicon,
  };
})();
