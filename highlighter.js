/* ════════════════════════════════════════════════════════════════
   highlighter.js — Sistema de Grifos Pastéis
   Inclua este arquivo nos resumos. Funciona standalone.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'hl2026__' + location.pathname + location.search;

  var COLORS = [
    { name: 'Rosa',        bg: 'rgba(255,182,193,0.88)' },
    { name: 'Lilás',       bg: 'rgba(210,180,255,0.88)' },
    { name: 'Azul',        bg: 'rgba(173,216,240,0.88)' },
    { name: 'Verde Menta', bg: 'rgba(150,245,190,0.88)' },
    { name: 'Amarelo',     bg: 'rgba(255,245,130,0.88)' },
    { name: 'Pêssego',     bg: 'rgba(255,210,170,0.88)' },
  ];

  /* ── Inject CSS ──────────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.id  = 'hl-styles';
  styleEl.textContent = [
    /* marks */
    '.hl-mark{border-radius:3px;padding:1px 2px;cursor:pointer;transition:filter .15s;}',
    '.hl-mark:hover{filter:brightness(0.82);}',

    /* desktop floating toolbar */
    '#hl-tb{position:fixed;z-index:2147483647;display:flex;align-items:center;gap:6px;',
      'padding:10px 16px;background:rgba(255,252,250,0.98);',
      'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
      'border:1.5px solid rgba(255,255,255,0.95);border-radius:999px;',
      'box-shadow:0 10px 40px rgba(130,90,170,0.28),0 2px 12px rgba(0,0,0,0.12);',
      'animation:hlPop .22s cubic-bezier(0.34,1.56,0.64,1) forwards;',
      'touch-action:none;user-select:none;font-family:sans-serif;}',
    '@keyframes hlPop{from{opacity:0;transform:translateY(6px) scale(.9)}',
      'to{opacity:1;transform:none}}',
    '#hl-tb .hl-lbl{font-size:10px;font-weight:700;letter-spacing:.10em;',
      'text-transform:uppercase;color:rgba(110,90,140,.65);white-space:nowrap;margin-right:2px;}',
    '#hl-tb .hl-sw{width:28px;height:28px;border-radius:50%;',
      'border:2.5px solid rgba(255,255,255,.9);box-shadow:0 1px 5px rgba(0,0,0,.18);',
      'cursor:pointer;flex-shrink:0;padding:0;outline:none;transition:transform .14s;}',
    '#hl-tb .hl-sw:hover{transform:scale(1.3);}',
    '#hl-tb .hl-sep{width:1px;height:18px;background:rgba(0,0,0,.12);margin:0 2px;flex-shrink:0;}',
    '#hl-tb .hl-er{width:28px;height:28px;border-radius:50%;',
      'border:1.5px solid rgba(200,70,70,.3);background:rgba(255,100,100,.1);',
      'color:rgba(180,40,40,.85);font-size:12px;font-weight:700;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;padding:0;outline:none;line-height:1;transition:background .14s;}',
    '#hl-tb .hl-er:hover{background:rgba(255,60,60,.22);}',

    /* mobile sticky bar (slides up from bottom) */
    '#hl-bar{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;',
      'display:flex;align-items:center;justify-content:center;gap:10px;',
      'padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));',
      'background:rgba(255,252,250,0.98);',
      'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
      'border-top:1.5px solid rgba(200,180,170,0.3);',
      'box-shadow:0 -4px 24px rgba(130,90,170,0.14);',
      'transform:translateY(110%);',
      'transition:transform .28s cubic-bezier(0.34,1.2,0.64,1);',
      'touch-action:none;user-select:none;font-family:sans-serif;}',
    '#hl-bar.hl-visible{transform:translateY(0);}',
    '#hl-bar .hl-lbl{font-size:10px;font-weight:700;letter-spacing:.08em;',
      'text-transform:uppercase;color:rgba(110,90,140,.6);white-space:nowrap;}',
    '#hl-bar .hl-sw{width:34px;height:34px;border-radius:50%;',
      'border:2.5px solid rgba(255,255,255,.9);box-shadow:0 1px 6px rgba(0,0,0,.18);',
      'cursor:pointer;flex-shrink:0;padding:0;outline:none;}',
    '#hl-bar .hl-er{width:34px;height:34px;border-radius:50%;',
      'border:1.5px solid rgba(200,70,70,.3);background:rgba(255,100,100,.1);',
      'color:rgba(180,40,40,.85);font-size:14px;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;padding:0;outline:none;line-height:1;}',
    '#hl-bar .hl-cancel{font-size:11px;color:rgba(110,90,140,.6);',
      'background:none;border:none;cursor:pointer;padding:4px 8px;white-space:nowrap;}',

    /* Mobile: collapse side-by-side grids to single column */
    '@media(max-width:640px){',
      '.cards-grid,.grid2,.organ-grid,.prazo-grid{grid-template-columns:1fr!important;}',
      '.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}',
    '}',
  ].join('');
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── Restore saved highlights ────────────────────────────────── */
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) document.body.innerHTML = saved;
  } catch (e) {}

  /* ── State ───────────────────────────────────────────────────── */
  var toolbar      = null;
  var mobileBar    = null;
  var savedRange   = null;
  var activeMark   = null;
  var pendingRange = null; /* backup before iOS clears the selection */

  /* ── Detect touch device ─────────────────────────────────────── */
  function isTouch() { return 'ontouchstart' in window; }

  /* ── addTapHandler: prevents double-fire from touch + mouse ──── */
  function addTapHandler(el, fn) {
    var didTouch = false;
    el.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation();
      didTouch = true;
      fn();
    }, { passive: false });
    el.addEventListener('mousedown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (didTouch) { didTouch = false; return; }
      fn();
    });
  }

  /* ── Shared: remove a mark element ──────────────────────────── */
  function removeMark(mark) {
    var p = mark.parentNode;
    while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
    p.removeChild(mark);
    if (p.normalize) p.normalize();
  }

  /* ── Shared: find closest .hl-mark ancestor ──────────────────── */
  function closestMark(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('hl-mark')) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ── Save: serialize body WITHOUT toolbar elements ───────────── */
  function save() {
    var clone = document.body.cloneNode(true);
    /* Remove live toolbar elements from the clone before serializing */
    ['hl-tb', 'hl-bar'].forEach(function (id) {
      var el = clone.querySelector('#' + id);
      if (el) el.parentNode.removeChild(el);
    });
    try { localStorage.setItem(KEY, clone.innerHTML); } catch (e) {}
  }

  /* ── Get all text nodes that intersect a Range ───────────────── */
  /* Uses range.intersectsNode() — simple and reliable on iOS 10+.  */
  function getTextNodesInRange(range) {
    try {
      var ancestor = range.commonAncestorContainer;
      if (ancestor.nodeType === 3) return [ancestor]; /* single text node */

      var nodes = [];
      var iter  = document.createNodeIterator(ancestor, 4 /* SHOW_TEXT */, null, false);
      var node;
      while ((node = iter.nextNode())) {
        var pn = node.parentNode;
        if (!pn || pn.nodeName === 'SCRIPT' || pn.nodeName === 'STYLE') continue;
        if (node.length > 0 && range.intersectsNode(node)) nodes.push(node);
      }
      return nodes;
    } catch (e) { return []; }
  }

  /* ── Apply highlight ─────────────────────────────────────────── */
  function applyHL(range, color) {
    var nodes = getTextNodesInRange(range);
    if (!nodes.length) return;

    nodes.forEach(function (node) {
      try {
        var start = (node === range.startContainer) ? range.startOffset : 0;
        var end   = (node === range.endContainer)   ? range.endOffset   : node.length;
        if (start >= end) return;

        var r = document.createRange();
        r.setStart(node, start); r.setEnd(node, end);

        var mark = document.createElement('mark');
        mark.className = 'hl-mark';
        mark.setAttribute('style',
          'background-color:' + color + '!important;border-radius:3px!important;' +
          'padding:1px 2px!important;color:inherit!important;cursor:pointer;'
        );
        r.surroundContents(mark);
      } catch (e) { /* skip nodes that can't be wrapped */ }
    });

    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }

  /* ══ DESKTOP: floating toolbar ══════════════════════════════════ */

  function buildToolbar() {
    var el = document.createElement('div');
    el.id  = 'hl-tb';

    var lbl = document.createElement('span');
    lbl.className = 'hl-lbl'; lbl.textContent = 'Grifar';
    el.appendChild(lbl);

    COLORS.forEach(function (c) {
      var sw = document.createElement('button');
      sw.className = 'hl-sw'; sw.style.background = c.bg;
      sw.title = c.name; sw.setAttribute('aria-label', 'Grifar em ' + c.name);
      addTapHandler(sw, function () {
        if (activeMark) activeMark.style.backgroundColor = c.bg;
        else if (savedRange) applyHL(savedRange, c.bg);
        hideToolbar(); save();
      });
      el.appendChild(sw);
    });

    var sep = document.createElement('span'); sep.className = 'hl-sep';
    el.appendChild(sep);

    var er = document.createElement('button');
    er.className = 'hl-er'; er.textContent = '✕';
    addTapHandler(er, function () {
      if (activeMark) removeMark(activeMark);
      hideToolbar(); save();
    });
    el.appendChild(er);
    return el;
  }

  function showToolbar(cx, cy) {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    toolbar = buildToolbar();
    document.body.appendChild(toolbar);

    var tw = toolbar.offsetWidth || 290, th = toolbar.offsetHeight || 52;
    var vw = window.innerWidth,          vh = window.innerHeight, pad = 8;

    var left = Math.min(Math.max(cx - tw / 2, pad), vw - tw - pad);
    var top  = cy - th - 12;
    if (top < pad) top = cy + 18;
    if (top + th > vh - pad) top = vh - th - pad;

    toolbar.style.left = left + 'px';
    toolbar.style.top  = top  + 'px';
  }

  function hideToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    savedRange = null; activeMark = null;
  }

  /* ══ MOBILE: sticky bar at bottom of screen ═════════════════════
     Avoids all position:fixed-in-iframe quirks in iOS Safari.
     The bar slides up from the bottom, always reachable.           */

  function buildMobileBar() {
    var bar = document.createElement('div');
    bar.id  = 'hl-bar';

    var lbl = document.createElement('span');
    lbl.className = 'hl-lbl'; lbl.textContent = 'Grifar:';
    bar.appendChild(lbl);

    COLORS.forEach(function (c) {
      var sw = document.createElement('button');
      sw.className = 'hl-sw'; sw.style.background = c.bg;
      sw.setAttribute('aria-label', 'Grifar em ' + c.name);
      addTapHandler(sw, function () {
        if (activeMark) activeMark.style.backgroundColor = c.bg;
        else if (savedRange) applyHL(savedRange, c.bg);
        hideMobileBar(); save();
      });
      bar.appendChild(sw);
    });

    var er = document.createElement('button');
    er.className = 'hl-er'; er.textContent = '✕'; er.title = 'Remover grifo';
    addTapHandler(er, function () {
      if (activeMark) removeMark(activeMark);
      hideMobileBar(); save();
    });
    bar.appendChild(er);

    var cancel = document.createElement('button');
    cancel.className = 'hl-cancel'; cancel.textContent = 'Cancelar';
    addTapHandler(cancel, function () { hideMobileBar(); });
    bar.appendChild(cancel);

    document.body.appendChild(bar);
    /* Double rAF so initial transform is painted before transition triggers */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add('hl-visible'); });
    });
    return bar;
  }

  function showMobileBar() {
    if (mobileBar) return;
    mobileBar = buildMobileBar();
  }

  function hideMobileBar() {
    if (!mobileBar) return;
    var bar  = mobileBar;
    mobileBar = null; savedRange = null; activeMark = null;
    bar.classList.remove('hl-visible');
    setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 300);
  }

  /* ══ EVENTS ══════════════════════════════════════════════════════ */

  /* Save selection on every change so iOS can't lose it */
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      var r = sel.getRangeAt(0);
      if (!r.collapsed && r.toString().trim()) pendingRange = r.cloneRange();
    }
  });

  /* ── DESKTOP mouseup ─────────────────────────────────────────── */
  document.addEventListener('mouseup', function (e) {
    if (isTouch()) return; /* handled by touchend */
    if (toolbar && toolbar.contains(e.target)) return;

    var mk = closestMark(e.target);
    if (mk) {
      activeMark = mk; savedRange = null;
      showToolbar(e.clientX, e.clientY);
      return;
    }

    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { hideToolbar(); return; }
    var rng = sel.getRangeAt(0);
    if (rng.collapsed || !rng.toString().trim()) { hideToolbar(); return; }

    activeMark = null; savedRange = rng.cloneRange(); pendingRange = null;
    var rect = rng.getBoundingClientRect();
    showToolbar(rect.left + rect.width / 2, rect.top);
  });

  /* ── MOBILE touchend ─────────────────────────────────────────── */
  var touchTimer = null;
  document.addEventListener('touchend', function (e) {
    if (!isTouch()) return;
    if (mobileBar && mobileBar.contains(e.target)) return; /* bar handles itself */

    /* Tapped existing mark */
    var mk = closestMark(e.target);
    if (mk) {
      if (mobileBar) hideMobileBar();
      activeMark = mk; savedRange = null;
      setTimeout(showMobileBar, 60);
      return;
    }

    /* Wait for selection to finalise (iOS needs ~200ms after touchend) */
    clearTimeout(touchTimer);
    touchTimer = setTimeout(function () {
      if (mobileBar) return;

      var sel = window.getSelection();
      var rng = (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed)
                ? sel.getRangeAt(0)
                : pendingRange;

      if (!rng || rng.toString().trim() === '') return;

      activeMark   = null;
      savedRange   = rng.cloneRange();
      pendingRange = null;
      showMobileBar();
    }, 350);
  });

  /* ── Close desktop toolbar on outside click ──────────────────── */
  document.addEventListener('mousedown', function (e) {
    if (!toolbar) return;
    if (toolbar.contains(e.target)) return;
    if (closestMark(e.target)) return;
    hideToolbar();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideToolbar(); hideMobileBar(); }
  });

  /* ── postMessage from parent dashboard ──────────────────────── */
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'hl-clear') return;
    document.querySelectorAll('.hl-mark').forEach(removeMark);
    try { localStorage.removeItem(KEY); } catch (er) {}
    hideToolbar(); hideMobileBar();
  });

})();
