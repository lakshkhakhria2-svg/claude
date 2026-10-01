/*!
 * LK Media motion kit — shared by every page in this repo.
 * Needs (deferred, in this order): assets/vendor/gsap-bundle.min.js, assets/vendor/lenis.min.js, this file.
 *
 * Rules this file follows:
 * - Content is fully visible without JS. Hidden start states are only ever set from JS (gsap.set / from),
 *   and the page curtain has a CSS fail-safe that removes it after 3s even if this file never runs.
 * - Everything motion-heavy is skipped when the visitor prefers reduced motion (or turned motion off
 *   with a [data-motion-toggle] button). Interactions (menu, toasts, sliders, carousels) still work.
 * - Only transform and opacity are animated, except SVG stroke offsets (tiny, paint-only).
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const MO = root.classList.contains('mo') && !!gsap && !!ST;
  if (!MO) root.classList.remove('mo');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const heroHooks = [];
  const heroRolls = []; // counters / tickers inside the hero start after the curtain lifts
  const LK = (window.LK = { mo: MO, fine: FINE, gsap, lenis: null, onHero: (fn) => heroHooks.push(fn) });

  if (gsap) {
    gsap.registerPlugin(...[ST, window.SplitText, window.ScrambleTextPlugin].filter(Boolean));
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  }
  if (ST) ST.config({ ignoreMobileResize: true });

  /* ---------- Number formatting / tweening ---------- */
  const fmt = (n, d = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  LK.format = fmt;
  LK.tweenNumber = (el, to, { from, decimals = +el.dataset.decimals || 0, prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '', duration = 0.8 } = {}) => {
    const write = (v) => (el.textContent = prefix + fmt(v, decimals) + suffix);
    if (!MO) return write(to);
    const o = { v: from ?? (parseFloat(el.dataset.value) || 0) };
    el.dataset.value = to;
    gsap.killTweensOf(o);
    return gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => write(o.v) });
  };

  /* ---------- Toasts (demo forms) ---------- */
  const toastRegion = document.createElement('div');
  toastRegion.className = 'toast-region';
  toastRegion.setAttribute('role', 'status');
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastRegion);
  LK.toast = (message, { title = 'Done', timeout = 5000 } = {}) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M20 6 9 17l-5-5"/></svg><div><p class="toast__title"></p><p class="toast__msg"></p></div><button type="button" class="toast__close" aria-label="Dismiss notification"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    t.querySelector('.toast__title').textContent = title;
    t.querySelector('.toast__msg').textContent = message;
    toastRegion.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    const close = () => { t.classList.remove('is-in'); t.classList.add('is-out'); setTimeout(() => t.remove(), 400); };
    t.querySelector('.toast__close').addEventListener('click', close);
    setTimeout(close, timeout);
  };

  /* ---------- Mobile menu ---------- */
  $$('[data-menu-toggle]').forEach((btn) => {
    const menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('hidden', !open);
      root.classList.toggle('menu-open', open);
      const label = btn.querySelector('.sr-only');
      if (label) label.textContent = open ? 'Close menu' : 'Open menu';
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  });

  /* ---------- Motion on/off toggle (per visitor, all pages) ---------- */
  $$('[data-motion-toggle]').forEach((b) => {
    let off = false;
    try { off = localStorage.getItem('lk-motion') === 'off'; } catch (e) {}
    const sysReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    b.setAttribute('aria-pressed', String(!off && !sysReduce));
    b.querySelector('[data-motion-state]').textContent = off || sysReduce ? 'off' : 'on';
    if (sysReduce) { b.disabled = true; b.title = 'Your device is set to reduce motion'; return; }
    b.addEventListener('click', () => {
      try { localStorage.setItem('lk-motion', off ? 'on' : 'off'); } catch (e) {}
      location.reload();
    });
  });

  /* ---------- Scroll progress + nav (plain scroll listener; works without GSAP) ---------- */
  const bar = $('[data-progress]');
  const nav = $('[data-nav]');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
      if (goingDown && y > 320 && !root.classList.contains('menu-open') && !nav.contains(document.activeElement)) nav.classList.add('is-hidden');
      else if (goingUp || y < 320) nav.classList.remove('is-hidden');
    }
    if (Math.abs(y - lastY) > 4) lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  if (nav) nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  onScroll();

  /* ---------- Sticky mobile bar: [data-sticky-bar] appears after [data-sticky-after], hides over [data-sticky-hide] ---------- */
  const stickyBar = $('[data-sticky-bar]');
  if (stickyBar && 'IntersectionObserver' in window) {
    const after = $('[data-sticky-after]');
    const hides = $$('[data-sticky-hide]');
    let pastHero = false; const covering = new Set();
    const sync = () => stickyBar.classList.toggle('is-visible', pastHero && covering.size === 0);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(after);
    const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target))); sync(); });
    hides.forEach((h) => io.observe(h));
  }

  /* ---------- Before / after slider (works with or without GSAP) ---------- */
  $$('[data-compare]').forEach((box) => {
    const range = $('input[type="range"]', box);
    const after = $('.compare__after', box), inner = $('.compare__after-inner', box), handle = $('.compare__handle', box);
    const set = (p) => {
      p = Math.max(0, Math.min(100, p));
      after.style.transform = `translateX(${p}%)`;
      inner.style.transform = `translateX(${-p}%)`;
      handle.style.transform = `translateX(${(p / 100) * box.clientWidth}px)`;
      range.value = p;
      box.dataset.pos = p;
    };
    range.addEventListener('input', () => set(+range.value));
    let dragging = false;
    const fromEvent = (e) => { const r = box.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    box.addEventListener('pointerdown', (e) => { if (e.button) return; dragging = true; box.setPointerCapture(e.pointerId); fromEvent(e); box.classList.add('is-dragging'); });
    box.addEventListener('pointermove', (e) => dragging && fromEvent(e));
    const end = () => { dragging = false; box.classList.remove('is-dragging'); };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    addEventListener('resize', () => set(+range.value));
    set(+range.value);
    if (MO) {
      const o = { p: +range.value };
      gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 70%', once: true } })
        .to(o, { p: 30, duration: 0.7, ease: 'power2.inOut', onUpdate: () => !dragging && set(o.p) })
        .to(o, { p: 70, duration: 0.9, ease: 'power2.inOut', onUpdate: () => !dragging && set(o.p) })
        .to(o, { p: 50, duration: 0.6, ease: 'power2.inOut', onUpdate: () => !dragging && set(o.p) });
    }
  });

  /* ---------- Drag carousel (native scroll + mouse drag with momentum) ---------- */
  $$('[data-drag-carousel]').forEach((wrap) => {
    const track = $('[data-track]', wrap);
    const prev = $('[data-prev]', wrap), next = $('[data-next]', wrap), prog = $('[data-carousel-progress]', wrap);
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: MO ? 'smooth' : 'auto' });
    prev?.addEventListener('click', () => go(-1));
    next?.addEventListener('click', () => go(1));
    const upd = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? Math.max(0.08, track.scrollLeft / max) : 1})`;
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
    };
    track.addEventListener('scroll', upd, { passive: true }); upd();
    let down = false, startX = 0, startL = 0, lastX = 0, v = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button) return;
      down = true; moved = false; startX = lastX = e.clientX; startL = track.scrollLeft; v = 0;
      track.classList.add('is-dragging');
      if (gsap) gsap.killTweensOf(track);
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      v = e.clientX - lastX; lastX = e.clientX;
      track.scrollLeft = startL - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      const s = step();
      const target = Math.round((track.scrollLeft - v * (MO ? 12 : 0)) / s) * s;
      if (gsap && MO) gsap.to(track, { scrollLeft: target, duration: 0.7, ease: 'power3.out', onComplete: () => track.classList.remove('is-dragging') });
      else { track.scrollLeft = target; track.classList.remove('is-dragging'); }
    });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
  });

  /* ---------- Curtain: page-load cover, agency intro and page transitions ---------- */
  const curtain = $('[data-curtain]');
  const VT = 'CSSViewTransitionRule' in window; // cross-document View Transitions supported
  const hideCurtain = () => { if (curtain) { curtain.style.animation = 'none'; curtain.style.display = 'none'; } };
  if (!MO) hideCurtain();
  addEventListener('pageshow', (e) => { if (e.persisted) { hideCurtain(); if (curtain && gsap) gsap.set(curtain, { clearProps: 'transform' }); } });

  if (MO && curtain && !VT) {
    // Fallback page transition: slide the curtain in, then navigate.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
      if (!/\.html?$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      curtain.style.animation = 'none';
      curtain.style.display = 'flex';
      gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'expo.inOut', onComplete: () => (location.href = url.href) });
    });
  }

  if (!MO) {
    // Reduced motion / no GSAP: still give anchor links focus management, then stop.
    initAnchors(null);
    return;
  }

  /* ================= Everything below runs only with motion allowed ================= */

  /* ---------- Lenis smooth scroll ---------- */
  if (window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    LK.lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    root.classList.add('has-lenis');
  }
  initAnchors(LK.lenis);

  function initAnchors(lenis) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target && id) return;
      e.preventDefault();
      const done = () => {
        if (!target) return;
        if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      };
      history.pushState(null, '', id ? '#' + id : location.pathname);
      if (lenis) lenis.scrollTo(target || 0, { offset: -24, duration: 1.2, onComplete: done });
      else { (target || document.body).scrollIntoView({ block: 'start' }); if (!target) scrollTo(0, 0); done(); }
    });
  }

  /* ---------- Custom cursor (fine pointers only) ---------- */
  if (FINE) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor__dot"></div><div class="cursor__ring"><span class="cursor__label"></span></div>';
    document.body.appendChild(c);
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2' }), dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      c.classList.add('is-on');
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, label, select, input[type="range"], summary, [role="tab"], [role="switch"]');
      const text = t?.closest('[data-cursor]')?.dataset.cursor || '';
      c.classList.toggle('is-link', !!t && !text);
      c.classList.toggle('is-label', !!text);
      c.classList.toggle('is-text', !!e.target.closest('input:not([type="range"]):not([type="radio"]), textarea'));
      if (text) label.textContent = text;
    });
    addEventListener('pointerdown', () => c.classList.add('is-down'));
    addEventListener('pointerup', () => c.classList.remove('is-down'));
  }

  /* ---------- Magnetic buttons ---------- */
  if (FINE) $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.35;
    const inner = $('[data-magnetic-inner]', el);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3' }), iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      xTo(x * strength); yTo(y * strength);
      if (inner) { ixTo(x * strength * 0.5); iyTo(y * strength * 0.5); }
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: true });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: true });
    });
  });

  /* ---------- 3D tilt cards with a cursor spotlight ---------- */
  if (FINE) $$('[data-tilt]').forEach((card) => {
    const max = parseFloat(card.dataset.tilt) || 8;
    const spot = $('.tilt-spot', card);
    gsap.set(card, { transformPerspective: 900 });
    const rX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' }), rY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    const sX = spot && gsap.quickTo(spot, 'x', { duration: 0.3, ease: 'power3' }), sY = spot && gsap.quickTo(spot, 'y', { duration: 0.3, ease: 'power3' });
    card.addEventListener('pointerenter', () => spot && gsap.to(spot, { opacity: 1, duration: 0.3 }));
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      rY((px - 0.5) * max * 2); rX(-(py - 0.5) * max * 2);
      if (spot) { sX(e.clientX - r.left - spot.offsetWidth / 2); sY(e.clientY - r.top - spot.offsetHeight / 2); }
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
      if (spot) gsap.to(spot, { opacity: 0, duration: 0.4 });
    });
  });

  /* ---------- Pointer-following blobs ---------- */
  const followers = $$('[data-follow]');
  if (FINE && followers.length) {
    const qs = followers.map((el) => ({ f: parseFloat(el.dataset.follow) || 0.04, x: gsap.quickTo(el, 'x', { duration: 1.6, ease: 'power2' }), y: gsap.quickTo(el, 'y', { duration: 1.6, ease: 'power2' }) }));
    addEventListener('pointermove', (e) => {
      const cx = e.clientX - innerWidth / 2, cy = e.clientY - innerHeight / 2;
      qs.forEach((q) => { q.x(cx * q.f); q.y(cy * q.f); });
    }, { passive: true });
  }

  /* ---------- Parallax depth ---------- */
  $$('[data-parallax]').forEach((el) => {
    const a = parseFloat(el.dataset.parallax) || 60;
    const trigger = el.closest('section, header, footer') || el;
    const hero = trigger.getBoundingClientRect().top + scrollY < innerHeight * 0.5;
    gsap.fromTo(el, { y: hero ? 0 : -a }, { y: a, ease: 'none', scrollTrigger: { trigger, start: hero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Split-text reveals ---------- */
  const heroSplits = [];
  let started = false;
  const Split = window.SplitText;
  function splitReveal(el, inHero) {
    const kind = el.dataset.split || 'lines';
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const type = kind === 'chars' && isHeading ? 'lines,words,chars' : kind === 'words' ? 'lines,words' : 'lines';
    const key = type.endsWith('chars') ? 'chars' : type.endsWith('words') ? 'words' : 'lines';
    let anim;
    Split.create(el, {
      type, mask: 'lines', autoSplit: true, aria: isHeading ? 'auto' : 'none', ignore: '[data-scramble], [data-no-split]',
      linesClass: 'split-line', wordsClass: 'split-word', charsClass: 'split-char',
      onSplit(self) {
        const targets = self[key];
        const vars = { yPercent: 110, rotate: key === 'lines' ? 0 : 6, duration: key === 'chars' ? 0.9 : 1.1, ease: 'expo.out', stagger: key === 'chars' ? 0.018 : key === 'words' ? 0.04 : 0.09 };
        if (inHero) {
          // Before the entrance plays, hold the hero paused; on later re-splits (resize) just let it settle.
          anim = gsap.from(targets, { ...vars, paused: !started });
          if (!started) heroSplits.push(anim);
          return anim;
        }
        return gsap.from(targets, { ...vars, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      },
    });
  }

  /* ---------- Scramble / decode ---------- */
  LK.scramble = (el, d) => scramble(el, d);
  function scramble(el, delay = 0) {
    const target = el.querySelector('[data-scramble-text]') || el;
    const text = target.textContent;
    return gsap.to(target, { delay, duration: 1.3, scrambleText: { text, chars: el.dataset.scramble || 'ABCDEFGHJKLMNPQRSTUVWXYZ#%&*', revealDelay: 0.35, speed: 0.5 }, ease: 'none' });
  }

  /* ---------- Rotating words (placed at a line end so width changes never reflow) ---------- */
  function rotator(el) {
    const words = $$('.rotator__word', el);
    if (words.length < 2) return;
    gsap.set(words.slice(1), { yPercent: 100, opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, paused: true });
    words.forEach((w, k) => {
      const n = words[(k + 1) % words.length];
      tl.to(w, { yPercent: -100, opacity: 0, duration: 0.6, ease: 'expo.inOut' }, `+=${parseFloat(el.dataset.interval) || 1.8}`)
        .fromTo(n, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.inOut' }, '<');
    });
    ST.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
    el.classList.add('is-live');
  }
  $$('[data-rotator]').forEach(rotator);

  /* ---------- Generic reveals ---------- */
  const reveals = $$('[data-reveal]').filter((el) => !el.closest('[data-hero]'));
  if (reveals.length) {
    gsap.set(reveals, { opacity: 0, y: 40 });
    ST.batch(reveals, { start: 'top 90%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1, stagger: 0.09, ease: 'power3.out', overwrite: true }) });
  }
  $$('[data-reveal-group]').forEach((g) => {
    const kids = Array.from(g.children);
    gsap.from(kids, { opacity: 0, y: 36, duration: 0.9, stagger: 0.08, scrollTrigger: { trigger: g, start: 'top 85%', once: true } });
  });

  /* ---------- Image / panel wipe reveal (two opposite translates, no clip-path) ---------- */
  $$('[data-wipe]').forEach((el) => {
    const inner = el.firstElementChild;
    const dir = el.dataset.wipe === 'left' ? 'xPercent' : 'yPercent';
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.from(el, { [dir]: 101, duration: 1.3, ease: 'expo.out' }).from(inner, { [dir]: -101, scale: 1.25, duration: 1.3, ease: 'expo.out' }, 0);
  });

  /* ---------- Counters, progress rings, SVG drawing, tickers ---------- */
  $$('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const from = parseFloat(el.dataset.from || 0);
    el.dataset.value = from;
    LK.tweenNumber(el, from, { duration: 0 });
    el.dataset.value = from;
    const run = () => LK.tweenNumber(el, to, { from, duration: parseFloat(el.dataset.duration) || 1.6 });
    if (el.closest('[data-hero]')) heroRolls.push(run);
    else ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: run });
  });
  $$('[data-ring]').forEach((c) => {
    const final = getComputedStyle(c).strokeDashoffset;
    gsap.fromTo(c, { strokeDashoffset: 100 }, { strokeDashoffset: final, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: c.closest('svg'), start: 'top 90%', once: true } });
  });
  $$('[data-draw]').forEach((p) => {
    const scrub = p.dataset.draw === 'scrub';
    const trigger = p.closest('[data-draw-trigger]') || p.closest('svg');
    gsap.fromTo(p, { strokeDashoffset: 1 }, {
      strokeDashoffset: 0, ease: scrub ? 'none' : 'power2.inOut', duration: parseFloat(p.dataset.drawDuration) || 1.6, delay: parseFloat(p.dataset.drawDelay) || 0,
      scrollTrigger: scrub ? { trigger, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 } : { trigger, start: 'top 85%', once: true },
    });
  });
  // Odometer: each digit is a 0–9 column rolled into place
  $$('[data-ticker]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.setAttribute('role', 'img');
    el.textContent = '';
    const cols = [];
    for (const ch of text) {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      if (/\d/.test(ch)) {
        span.className = 'tick';
        span.innerHTML = '<span class="tick__col">' + '0123456789'.split('').map((d) => `<span>${d}</span>`).join('') + '</span>';
        cols.push([span.firstChild, +ch]);
      } else span.textContent = ch;
      el.appendChild(span);
    }
    gsap.set(cols.map((c) => c[0]), { yPercent: 0 });
    const roll = () => cols.forEach(([col, d], k) => gsap.to(col, { yPercent: -10 * d, duration: 1.6 + k * 0.06, ease: 'expo.out', delay: 0.1 }));
    if (el.closest('[data-hero]')) heroRolls.push(roll);
    else ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: roll });
  });

  /* ---------- Outline text that fills on scroll ---------- */
  $$('[data-fill]').forEach((el) => {
    const mask = $('.fill-text__mask', el), solid = $('.fill-text__solid', el);
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 95%', end: 'clamp(bottom 80%)', scrub: 0.5 } })
      .fromTo(mask, { yPercent: 100 }, { yPercent: 0, ease: 'none' }, 0)
      .fromTo(solid, { yPercent: -100 }, { yPercent: 0, ease: 'none' }, 0);
  });

  /* ---------- Velocity-reactive marquees ---------- */
  $$('[data-marquee]').forEach((m) => {
    const track = $('.marquee__track', m);
    const group = $('.marquee__group', m);
    const base = parseFloat(m.dataset.marquee) || 40; // seconds per loop
    const dir = m.dataset.direction === 'right' ? -1 : 1;
    const skew = m.hasAttribute('data-skew');
    // Clone enough groups to cover twice the viewport
    const need = Math.min(6, Math.ceil((innerWidth * 2) / Math.max(200, group.offsetWidth)) + 1);
    for (let k = 0; k < need; k++) { const c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('a,button', c).forEach((x) => x.setAttribute('tabindex', '-1')); track.appendChild(c); }
    m.classList.add('is-live');
    let tween;
    const build = () => {
      const w = group.offsetWidth;
      if (tween) tween.kill();
      gsap.set(track, { x: dir === 1 ? 0 : -w });
      tween = gsap.to(track, { x: dir === 1 ? -w : 0, duration: base, ease: 'none', repeat: -1 });
      tween.totalTime(base * 500); // headroom so a negative timeScale (scrolling up) can run backwards
    };
    build();
    ST.addEventListener('refreshInit', build);
    const skewTo = skew ? gsap.quickTo(track, 'skewX', { duration: 0.6, ease: 'power3' }) : null;
    let hover = false;
    ST.create({
      trigger: m, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => (s.isActive ? tween.play() : tween.pause()),
      onUpdate: (s) => {
        const v = s.getVelocity();
        const boost = gsap.utils.clamp(-6, 6, v / 250);
        if (!hover) gsap.to(tween, { timeScale: (s.direction === -1 ? -1 : 1) * (1 + Math.abs(boost)), duration: 0.25, overwrite: true, onComplete: () => gsap.to(tween, { timeScale: s.direction === -1 ? -1 : 1, duration: 1.2, ease: 'power2.out' }) });
        if (skewTo) skewTo(gsap.utils.clamp(-8, 8, -v / 300));
      },
    });
    m.addEventListener('pointerenter', () => { hover = true; gsap.to(tween, { timeScale: 0, duration: 0.6, overwrite: true }); });
    m.addEventListener('pointerleave', () => { hover = false; gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }); if (skewTo) skewTo(0); });
    m.addEventListener('focusin', () => tween.pause());
    m.addEventListener('focusout', () => tween.play());
  });

  /* ---------- Responsive scroll scenes ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    // Horizontal gallery driven by vertical scroll
    $$('[data-hscroll]').forEach((sec) => {
      const track = $('[data-hscroll-track]', sec), bar = $('[data-hscroll-progress]', sec);
      sec.classList.add('is-pinned');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => bar && gsap.set(bar, { scaleX: s.progress }) },
      });
      // Gentle inner parallax on each card image as it travels
      $$('[data-hscroll-img]', sec).forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('[data-hscroll-card]'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      return () => sec.classList.remove('is-pinned');
    });

    // Pinned step-by-step story
    $$('[data-steps]').forEach((sec) => {
      const pinEl = $('[data-steps-pin]', sec) || sec;
      const steps = $$('[data-step]', sec), dots = $$('[data-step-dot]', sec), bar = $('[data-steps-progress]', sec);
      sec.classList.add('is-pinned');
      gsap.set(steps.slice(1), { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 } });
      steps.forEach((s, i) => {
        if (!i) return;
        const prev = steps[i - 1];
        tl.to(prev, { autoAlpha: 0, y: -40, duration: 0.6 }, i)
          .to($('[data-step-visual]', prev), { scale: 0.92, rotate: -3, duration: 0.6 }, i)
          .fromTo(s, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.6 }, i + 0.3)
          .fromTo($('[data-step-visual]', s), { scale: 1.08, rotate: 3 }, { scale: 1, rotate: 0, duration: 0.6 }, i + 0.3);
      });
      tl.to({}, { duration: 0.4 });
      const setActive = (p) => {
        const t = p * tl.duration();
        const idx = Math.max(0, Math.min(steps.length - 1, Math.floor(t - 0.45)));
        dots.forEach((d, k) => { d.classList.toggle('is-active', k === idx); d.classList.toggle('is-done', k < idx); });
      };
      ST.create({ animation: tl, trigger: pinEl, start: 'top top', end: () => '+=' + steps.length * innerHeight * 0.75, pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: (s) => { setActive(s.progress); if (bar) gsap.set(bar, { scaleY: s.progress }); } });
      setActive(0);
      return () => { sec.classList.remove('is-pinned'); gsap.set(steps, { clearProps: 'all' }); };
    });
  });

  // Stacked sticky cards (CSS sticky does the stacking; GSAP pushes earlier cards back)
  $$('[data-stack]').forEach((stack) => {
    const cards = $$('[data-stack-card]', stack);
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      const shade = $('.stack-shade', card);
      const tl = gsap.timeline({ scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
      tl.to(card, { scale: 1 - (cards.length - 1 - i) * 0.035, ease: 'none' }, 0);
      if (shade) tl.to(shade, { opacity: 0.35, ease: 'none' }, 0);
    });
  });

  /* ---------- Start: split hero, lift curtain, play the entrance ---------- */
  $$('[data-split]').forEach((el) => splitReveal(el, !!el.closest('[data-hero]')));

  const heroItems = $$('[data-hero] [data-hero-item]');
  gsap.set(heroItems, { opacity: 0, y: 30 });

  let firstVisit = false;
  try { firstVisit = !sessionStorage.getItem('lk-intro'); sessionStorage.setItem('lk-intro', '1'); } catch (e) {}
  const fromSameSite = document.referrer && new URL(document.referrer).origin === location.origin;
  const isIntro = curtain && curtain.hasAttribute('data-intro') && firstVisit && !fromSameSite;

  const start = () => {
    const tl = gsap.timeline();
    // If the CSS fail-safe already lifted the curtain (very slow load), don't bring it back.
    let cur = curtain;
    if (cur && getComputedStyle(cur).visibility === 'hidden') { hideCurtain(); cur = null; }
    if (cur) {
      curtain.style.animation = 'none';
      if (isIntro) {
        curtain.classList.add('is-intro');
        const count = $('[data-intro-count]', curtain), word = $$('[data-intro-word] > *', curtain), skip = $('[data-intro-skip]', curtain);
        const o = { n: 0 };
        const intro = gsap.timeline();
        intro.from(word, { yPercent: 110, duration: 0.7, stagger: 0.05, ease: 'expo.out' }, 0)
          .to(o, { n: 100, duration: 0.85, ease: 'power2.inOut', onUpdate: () => count && (count.textContent = Math.round(o.n)) }, 0)
          .to(word, { yPercent: -110, duration: 0.45, stagger: 0.03, ease: 'expo.in' }, 0.95);
        tl.add(intro);
        const skipIt = () => intro.progress() < 1 && intro.timeScale(6);
        skip?.addEventListener('click', skipIt);
        ['keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skipIt, { once: true, passive: true }));
      }
      tl.to(curtain, { yPercent: -100, duration: 0.85, ease: 'expo.inOut', onComplete: hideCurtain });
    }
    const at = cur ? '-=0.45' : 0;
    tl.addLabel('hero', at);
    started = true;
    heroSplits.forEach((a, k) => tl.add(a.paused(false), `hero+=${k * 0.12}`));
    const scr = $$('[data-hero] [data-scramble]');
    scr.forEach((el) => { tl.from(el, { yPercent: 110, duration: 1.1, ease: 'expo.out' }, 'hero+=0.3'); tl.add(scramble(el), 'hero+=0.45'); });
    if (heroItems.length) tl.to(heroItems, { opacity: 1, y: 0, duration: 1, stagger: 0.07, ease: 'power3.out' }, 'hero+=0.25');
    heroRolls.forEach((fn) => tl.add(fn, 'hero+=0.5'));
    heroHooks.forEach((fn) => fn(tl, 'hero'));
    window.__motionReady = true;
  };
  // Scramble outside the hero plays when it scrolls into view
  $$('[data-scramble]').filter((el) => !el.closest('[data-hero]')).forEach((el) => ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => scramble(el) }));

  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve();
  // Let page scripts (which run after this file) register hooks first.
  fontsReady.then(() => requestAnimationFrame(() => { start(); ST.refresh(); }));
  addEventListener('load', () => ST.refresh());
})();
