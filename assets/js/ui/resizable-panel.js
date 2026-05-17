'use strict';

const CatenaResizablePanel = (() => {
  function init() {
    const handle = CatenaDOM.refs.commResize;
    const panel = CatenaDOM.refs.commPanel;
    let dragging = false;
    let startX = 0;
    let startWidth = 0;
    const root = document.documentElement;

    const setPanelWidth = (width) => {
      panel.style.width = `${width}px`;
      root.style.setProperty('--comm-panel-active-w', `${width}px`);
    };

    const onStart = (clientX) => {
      dragging = true;
      startX = clientX;
      startWidth = panel.offsetWidth;
      root.style.setProperty('--comm-panel-active-w', `${startWidth}px`);
      handle.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    };

    const onMove = (clientX) => {
      if (!dragging) return;
      const nextWidth = Math.min(860, Math.max(320, startWidth + (startX - clientX)));
      setPanelWidth(nextWidth);
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    handle.addEventListener('mousedown', event => {
      onStart(event.clientX);
      event.preventDefault();
    });
    document.addEventListener('mousemove', event => onMove(event.clientX));
    document.addEventListener('mouseup', onEnd);

    handle.addEventListener('touchstart', event => onStart(event.touches[0].clientX), { passive: true });
    document.addEventListener('touchmove', event => onMove(event.touches[0].clientX), { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  return { init };
})();
