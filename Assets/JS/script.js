/* VITRA — Progressive enhancement; works with local HTML and static hosting. */
'use strict';
(() => {
  const reduced = window.vitraMotion;
  // Apply the persisted preference before navigation and across browser tabs.
  const themeButton = document.querySelector('.theme-toggle');
  let themeTimer;
  const setTheme = (theme, animate = false) => {
    if (!['light', 'dark'].includes(theme)) return;
    const root = document.documentElement;
    if (animate && !reduced.matches) {
      root.classList.add('theme-changing');
      clearTimeout(themeTimer);
      themeTimer = setTimeout(() => root.classList.remove('theme-changing'), 650);
    }
    root.dataset.theme = theme;
    const isLight = theme === 'light';
    const label = isLight ? 'Activar modo oscuro' : 'Activar modo claro';
    themeButton?.setAttribute('aria-label', label);
    themeButton?.setAttribute('title', label);
    themeButton?.setAttribute('aria-pressed', String(isLight));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#ddd6c3' : '#2b3026');
  };
  setTheme(document.documentElement.dataset.theme || 'dark');
  themeButton?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(theme, true);
    try { localStorage.setItem('vitra-theme', theme); } catch { /* Still usable when storage is unavailable. */ }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'vitra-theme' && event.newValue) setTheme(event.newValue, true);
  });
  window.addEventListener('pageshow', () => {
    try { const saved = localStorage.getItem('vitra-theme'); if (saved) setTheme(saved); } catch {}
  });

  // Seamless twin-track ribbon, pausable and idle when outside the viewport.
  const ribbon = document.querySelector('.identity-strip');
  const ribbonButton = document.querySelector('.marquee-toggle');
  if (ribbon && ribbonButton) {
    let inView = true;
    let userPaused = false;
    const updateRibbon = () => {
      ribbon.classList.toggle('is-running', inView && !userPaused && !reduced.matches && !document.hidden);
      ribbon.classList.toggle('is-paused', userPaused);
      ribbonButton.setAttribute('aria-pressed', String(userPaused));
      const label = userPaused ? 'Reanudar cinta animada' : 'Pausar cinta animada';
      ribbonButton.setAttribute('aria-label', label);
      ribbonButton.setAttribute('title', label);
    };
    ribbonButton.addEventListener('click', () => { userPaused = !userPaused; updateRibbon(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { inView = entries[0].isIntersecting; updateRibbon(); }, {rootMargin:'80px'}).observe(ribbon);
    }
    reduced.addEventListener('change', updateRibbon);
    document.addEventListener('visibilitychange', updateRibbon);
    updateRibbon();
  }

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  const setMenu = (open, restore = false) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-open', open);
    if (restore) menuButton.focus();
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) setMenu(false, true);
  });
  document.addEventListener('click', event => {
    if (nav?.classList.contains('is-open') && !event.target.closest('.site-header')) setMenu(false);
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  nav?.addEventListener('focusout', () => {
    setTimeout(() => { if (!document.querySelector('.site-header')?.contains(document.activeElement)) setMenu(false); }, 0);
  });
  window.matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  // Full-screen VITRA interlude. The early head script covers the next document
  // before its first paint, so regular navigation needs no AJAX or router.
  const root = document.documentElement;
  let leaving = false;
  let navigationTimer;
  let recoveryTimer;
  let arrivalTimer;
  let finishTimer;
  let observer;
  const releaseCurtain = () => {
    clearTimeout(navigationTimer);
    clearTimeout(recoveryTimer);
    clearTimeout(arrivalTimer);
    clearTimeout(finishTimer);
    clearTimeout(window.vitraMotionFallback);
    leaving = false;
    root.classList.remove('motion-boot', 'motion-uncover');
    document.body.classList.remove('is-leaving');
  };

  // Animate each group in order; content is left visible if JS or observers fail.
  const revealSelectors = '.hero-copy > *, .hero-visual, .page-head > *, .product-tabs a, .faq-section > div:first-child, .faq-list details, .contact-panel, .team-note > *, .next-inner > *, .footer-top > *';
  document.querySelectorAll(revealSelectors).forEach(element => element.classList.add('reveal'));
  const reveals = [...document.querySelectorAll('.reveal')];
  const prepareReveals = () => {
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(element => {
      // Do not nest independent movement inside an already animated container.
      if (element.parentElement.closest('.reveal')) return;
      const siblings = [...element.parentElement.children].filter(child => child.classList.contains('reveal'));
      const columns = getComputedStyle(element.parentElement).gridTemplateColumns.split(' ').length;
      const index = siblings.indexOf(element);
      const textSequence = element.parentElement.matches('.hero-copy, .page-head');
      const delay = innerWidth < 761 && columns === 1 && !textSequence ? 0 : Math.min(columns > 1 ? index % columns : index, 3) * 115;
      element.style.setProperty('--reveal-delay', `${delay}ms`);
      element.classList.add('will-reveal');
    });
  };
  const startReveals = () => {
    reveals.forEach(element => {
      if (observer && !reduced.matches) observer.observe(element);
      else element.classList.add('is-visible');
    });
    document.body.classList.add('motion-started');
    document.dispatchEvent(new Event('vitra:ready'));
  };
  prepareReveals();

  const enterPage = () => {
    if (reduced.matches) { releaseCurtain(); startReveals(); return; }
    root.classList.add('motion-boot');
    // Keep the word readable before revealing the new page in one continuous lift.
    arrivalTimer = setTimeout(() => {
      root.classList.add('motion-uncover');
      startReveals();
      finishTimer = setTimeout(releaseCurtain, 1120);
    }, 300);
  };
  enterPage();
  window.addEventListener('pageshow', event => {
    if (event.persisted) { releaseCurtain(); setMenu(false); startReveals(); }
  });

  document.addEventListener('click', event => {
    const a = event.target.closest('a[href]');
    if (!a || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    const url = new URL(a.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host || !url.pathname.endsWith('.html')) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (reduced.matches) return;
    event.preventDefault();
    if (leaving) return;
    releaseCurtain();
    leaving = true;
    setMenu(false);
    const chapterNames = {'inicio.html':['01','Inicio'],'index.html':['01','Inicio'],'catalogo.html':['02','ZENITH'],'acerca.html':['03','Nosotros'],'galeria.html':['04','Equipo'],'registro.html':['05','Contacto']};
    const chapter = chapterNames[url.pathname.split('/').pop()];
    if(chapter){document.querySelector('.destination-number').textContent=chapter[0];document.querySelector('.destination-name').textContent=chapter[1];}
    document.body.classList.add('is-leaving');
    // 620ms curtain + a brief hold lets VITRA be seen, including the final letter.
    navigationTimer = setTimeout(() => location.assign(url.href), 780);
    recoveryTimer = setTimeout(releaseCurtain, 4000);
  });

  // Softer anchor journeys, with immediate cancellation on user input.
  // Mouse wheel and touch retain their native behavior throughout the site.
  let scrollFrame = 0;
  let scrollTarget = null;
  const cancelJourney = () => { cancelAnimationFrame(scrollFrame); scrollFrame = 0; scrollTarget = null; };
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => window.addEventListener(type, cancelJourney, { passive: true }));
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Escape', ' '].includes(event.key)) cancelJourney();
  });
  document.addEventListener('click', event => {
    const a = event.target.closest('a[href]');
    if (!a || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash || reduced.matches) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    cancelJourney();
    const start = scrollY;
    const offset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 100;
    const end = Math.max(0, Math.min(target.getBoundingClientRect().top + start - offset, root.scrollHeight - innerHeight));
    const distance = end - start;
    const duration = Math.min(1250, Math.max(650, Math.abs(distance) * 0.3));
    const started = performance.now();
    scrollTarget = target;
    try { history.pushState(null, '', url.hash); } catch { /* Local files may restrict history updates. */ }
    const step = time => {
      if (!scrollTarget) return;
      const progress = Math.min(1, (time - started) / duration);
      const eased = progress < .5 ? 8 * progress ** 4 : 1 - (-2 * progress + 2) ** 4 / 2;
      window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
      else {
        scrollFrame = 0;
        scrollTarget = null;
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
        target.focus({ preventScroll: true });
      }
    };
    scrollFrame = requestAnimationFrame(step);
  });
  window.addEventListener('pagehide', cancelJourney);
  window.addEventListener('popstate', cancelJourney);
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    const pendingNavigation = leaving;
    // An in-flight click must still complete if the preference changes mid-transition.
    if (!pendingNavigation) releaseCurtain();
    cancelJourney();
    observer?.disconnect();
    reveals.forEach(element => element.classList.add('is-visible'));
  });

  // Native dialogs supply keyboard focus containment and Escape handling.
  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.dialog);
      if (!dialog) return;
      if (typeof dialog.showModal !== 'function') {
        const pdf = dialog.querySelector('a[href$=".pdf"]');
        if (pdf) location.assign(pdf.href);
        return;
      }
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      dialog.addEventListener('close', () => {
        document.body.style.overflow = '';
        button.focus();
      }, { once: true });
    });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  });

  const form = document.querySelector('#contact-form');
  if (form) {
    const message = document.querySelector('#message');
    const interest = document.querySelector('#interest');
    const result = document.querySelector('#message-result');
    const output = document.querySelector('#prepared-message');
    const status = document.querySelector('#copy-status');
    const param = new URLSearchParams(location.search).get('linea');
    if ([...interest.options].some(option => option.value === param)) interest.value = param;
    message.addEventListener('input', () => { document.querySelector('#character-count').textContent = message.value.length; });
    form.addEventListener('input', () => {
      result.hidden = true;
      status.textContent = '';
      output.value = '';
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.querySelector('#name');
      name.setCustomValidity(name.value.trim().length < 2 ? 'Escribe tu nombre.' : '');
      message.setCustomValidity(message.value.trim().length < 10 ? 'Cuéntanos un poco más: escribe al menos 10 caracteres.' : '');
      if (!form.reportValidity()) return;
      const email = document.querySelector('#email').value.trim();
      output.value = `Hola, equipo VITRA. Mi nombre es ${name.value.trim()}.\n\nMe interesa: ${interest.value}.\n\n${message.value.trim()}${email ? `\n\nMi correo de contacto: ${email}` : ''}`;
      result.hidden = false;
      result.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' });
      document.querySelector('#result-title').focus({ preventScroll: true });
    });
    form.addEventListener('input', event => { event.target.setCustomValidity?.(''); });
    document.querySelector('#copy-message').addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(output.value);
        status.textContent = 'Mensaje copiado. Ahora puedes pegarlo en Instagram.';
      } catch {
        output.focus(); output.select();
        status.textContent = 'Seleccionamos tu mensaje. Usa Copiar o Ctrl+C para copiarlo y después pégalo en Instagram.';
      }
    });
  }
  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
})();
