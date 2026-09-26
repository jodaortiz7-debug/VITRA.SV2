/* Resolve motion before first paint; an explicit choice overrides the OS. */
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new EventTarget();
  let preference = 'auto';
  try { preference = localStorage.getItem('vitra-motion') || 'auto'; } catch {}
  const update = () => {
    root.dataset.motion = preference === 'auto' ? (system.matches ? 'reduce' : 'full') : preference;
    const event = new Event('change');
    Object.defineProperty(event, 'matches', {value: root.dataset.motion === 'reduce'});
    events.dispatchEvent(event);
  };
  window.vitraMotion = {
    get matches() { return root.dataset.motion === 'reduce'; },
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    set(value) {
      preference = value;
      try { localStorage.setItem('vitra-motion', value); } catch {}
      update();
    }
  };
  system.addEventListener('change', update);
  update();
})();
