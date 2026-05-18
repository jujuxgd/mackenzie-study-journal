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
    '.hl-mark{border-radius:3px;padding:1px 2px;cursor:pointer;transition:filter .15s;}',
    '.hl-mark:hover{filter:brightness(0.82);}',
    '#hl-tb{position:fixed;z-index:2147483647;display:flex;align-items:center;gap:6px;',
      'padding:10px 16px;background:rgba(255,252,250,0.98);',
      'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
      'border:1.5px solid rgba(255,255,255,0.95);border-radius:999px;',
      'box-shadow:0 10px 40px rgba(130,90,170,0.28),0 2px 12px rgba(0,0,0,0.12);',
      'animation:hlPop .22s cubic-bezier(0.34,1.56,0.64,1) forwards;',
      'touch-action:none;user-select:none;font-family:sans-serif;}',
    '@keyframes hlPop{from{opacity:0;transform:translateY(6px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '#hl-tb .hl-lbl{font-size:10px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;',
      'color:rgba(110,90,140,.65);white-space:nowrap;margin-right:2px;}',
    '#hl-tb .hl-sw{width:28px;height:28px;border-radius:50%;',
      'border:2.5px solid rgba(255,255,255,.9);box-shadow:0 1px 5px rgba(0,0,0,.18);',
      'cursor:pointer;flex-shrink:0;padding:0;outline:none;',
      'transition:transform .14s,box-shadow .14s;}',
    '#hl-tb .hl-sw:hover,#hl-tb .hl-sw:focus{transform:scale(1.3);box-shadow:0 3px 12px rgba(0,0,0,.26);}',
    '#hl-tb .hl-sep{width:1px;height:18px;background:rgba(0,0,0,.12);margin:0 2px;flex-shrink:0;}',
    '#hl-tb .hl-er{width:28px;height:28px;border-radius:50%;',
      'border:1.5px solid rgba(200,70,70,.3);background:rgba(255,100,100,.1);',
      'color:rgba(180,40,40,.85);font-size:12px;font-weight:700;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;padding:0;outline:none;line-height:1;',
      'transition:background .14s,transform .14s;}',
    '#hl-tb .hl-er:hover{background:rgba(255,60,60,.22);transform:scale(1.18);}',
  ].join('');
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── Restore saved highlights ────────────────────────────────── */
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) document.body.innerHTML = saved;
  } catch (e) {}

  /* ── State ───────────────────────────────────────────────────── */
  var toolbar    = null;
  var savedRange = null;
  var activeMark = null;

  /* ── Build toolbar ───────────────────────────────────────────── */
  function buildToolbar() {
    var el = document.createElement('div');
    el.id = 'hl-tb';

    var lbl = document.createElement('span');
    lbl.className   = 'hl-lbl';
    lbl.textContent = 'Grifar';
    el.appendChild(lbl);

    COLORS.forEach(function (c) {
      var sw = document.createElement('button');
      sw.className        = 'hl-sw';
      sw.style.background = c.bg;
      sw.title            = c.name;
      sw.setAttribute('aria-label', 'Grifar em ' + c.name);
      addTapHandler(sw, function () {
        if (activeMark) {
          activeMark.style.backgroundColor = c.bg;
        } else if (savedRange) {
          applyHL(savedRange, c.bg);
        }
        hideToolbar();
        save();
      });
      el.appendChild(sw);
    });

    var sep = document.createElement('span');
    sep.className = 'hl-sep';
    el.appendChild(sep);

    var er = document.createElement('button');
    er.className   = 'hl-er';
    er.textContent = '✕';
    er.title       = 'Remover grifo';
    er.setAttribute('aria-label', 'Remover grifo');
    addTapHandler(er, function () {
      if (activeMark) {
        var p = activeMark.parentNode;
        while (activeMark.firstChild) p.insertBefore(activeMark.firstChild, activeMark);
        p.removeChild(activeMark);
        if (p.normalize) p.normalize();
      }
      hideToolbar();
      save();
    });
    el.appendChild(er);

    return el;
  }

  /* addTapHandler: handles both mouse and touch without double-firing */
  function addTapHandler(el, fn) {
    var touched = false;
    el.addEventListener('touchstart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      touched = true;
      fn();
    }, { passive: false });
    el.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (touched) { touched = false; return; } /* already handled by touchstart */
      fn();
    });
  }

  /* ── Position and show toolbar ───────────────────────────────── */
  function showToolbar(cx, cy) {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    toolbar = buildToolbar();
    document.body.appendChild(toolbar);

    var tw  = toolbar.offsetWidth  || 290;
    var th  = toolbar.offsetHeight || 52;
    var vw  = window.innerWidth;
    var vh  = window.innerHeight;
    var pad = 8;

    /* clamp cx to viewport */
    var left = Math.min(Math.max(cx - tw / 2, pad), vw - tw - pad);
    /* try above selection; flip below if off-screen */
    var top  = cy - th - 12;
    if (top < pad) top = cy + 18;
    if (top + th > vh - pad) top = vh - th - pad;

    toolbar.style.left = left + 'px';
    toolbar.style.top  = top  + 'px';
  }

  function hideToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    savedRange = null;
    activeMark = null;
  }

  /* ── Find all text nodes that overlap a Range ───────────────── */
  /* Uses range.intersectsNode() — simpler and more reliable than
     compareBoundaryPoints across all iOS Safari versions.           */
  function getTextNodesInRange(range) {
    try {
      var ancestor = range.commonAncestorContainer;

      /* Already a text node: entire selection is within one text node */
      if (ancestor.nodeType === 3) return [ancestor];

      var nodes = [];
      /* createNodeIterator with SHOW_TEXT (4) visits all text descendants */
      var iter = document.createNodeIterator(ancestor, 4 /* NodeFilter.SHOW_TEXT */, null, false);
      var node;
      while ((node = iter.nextNode())) {
        var pName = node.parentNode ? node.parentNode.nodeName : '';
        if (pName === 'SCRIPT' || pName === 'STYLE') continue;
        if (node.length > 0 && range.intersectsNode(node)) nodes.push(node);
      }
      return nodes;
    } catch (e) { return []; }
  }

  /* ── Apply highlight ─────────────────────────────────────────── */
  /* Wraps each text node individually with its own <mark> so the
     DOM structure is never disrupted for multi-paragraph selections. */
  function applyHL(range, color) {
    var nodes = getTextNodesInRange(range);
    if (!nodes.length) return;

    nodes.forEach(function (node) {
      try {
        var start = (node === range.startContainer) ? range.startOffset : 0;
        var end   = (node === range.endContainer)   ? range.endOffset   : node.length;
        if (start >= end) return;

        var r = document.createRange();
        r.setStart(node, start);
        r.setEnd(node, end);

        var mark = document.createElement('mark');
        mark.className = 'hl-mark';
        mark.setAttribute('style',
          'background-color:' + color + '!important;' +
          'border-radius:3px!important;' +
          'padding:1px 2px!important;' +
          'color:inherit!important;' +
          'cursor:pointer;'
        );
        r.surroundContents(mark);
      } catch (e) { /* skip nodes that can't be wrapped (e.g. table boundary) */ }
    });

    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }

  /* ── Save body to localStorage ───────────────────────────────── */
  function save() {
    try { localStorage.setItem(KEY, document.body.innerHTML); } catch (e) {}
  }

  /* ── Utility: find closest .hl-mark ancestor ─────────────────── */
  function closestMark(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('hl-mark')) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ── Capture and show toolbar for current selection ─────────── */
  function tryShowForSelection(fallbackX, fallbackY) {
    var sel = window.getSelection();
    var rng;
    if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
      rng = sel.getRangeAt(0);
    } else if (pendingRange) {
      rng = pendingRange; /* iOS cleared the selection — use backup */
    } else {
      return;
    }
    if (!rng || rng.toString().trim() === '') return;

    activeMark  = null;
    savedRange  = rng.cloneRange();
    pendingRange = null;

    var rect = rng.getBoundingClientRect();
    var cx   = (rect.width > 0) ? rect.left + rect.width / 2 : fallbackX;
    var cy   = (rect.height > 0) ? rect.top : fallbackY;
    showToolbar(cx, cy);
  }

  /* pendingRange: saved on selectionchange before iOS clears it on touchend */
  var pendingRange = null;

  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      var r = sel.getRangeAt(0);
      if (!r.collapsed && r.toString().trim()) pendingRange = r.cloneRange();
    }
  });

  /* ── Mouse flow (desktop) ─────────────────────────────────────── */
  document.addEventListener('mouseup', function (e) {
    if (toolbar && toolbar.contains(e.target)) return;

    /* Clicked existing mark → edit it */
    var mk = closestMark(e.target);
    if (mk) {
      activeMark = mk; savedRange = null;
      showToolbar(e.clientX, e.clientY);
      return;
    }

    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { hideToolbar(); return; }
    var rng  = sel.getRangeAt(0);
    if (rng.collapsed || !rng.toString().trim()) { hideToolbar(); return; }

    activeMark   = null;
    savedRange   = rng.cloneRange();
    pendingRange = null;
    var rect = rng.getBoundingClientRect();
    showToolbar(rect.left + rect.width / 2, rect.top);
  });

  /* ── Touch flow (iOS) ─────────────────────────────────────────── */
  document.addEventListener('touchend', function (e) {
    /* Tap inside our toolbar — buttons handle themselves via addTapHandler */
    if (toolbar && toolbar.contains(e.target)) return;

    /* Tapped an existing mark */
    var mk = closestMark(e.target);
    if (mk) {
      if (toolbar) hideToolbar();
      var t = e.changedTouches[0];
      activeMark = mk; savedRange = null;
      setTimeout(function () { showToolbar(t.clientX, t.clientY); }, 50);
      return;
    }

    /* New selection: wait a bit for iOS to finalise, then show toolbar */
    var t = e.changedTouches[0];
    setTimeout(function () {
      if (toolbar) return;
      tryShowForSelection(t.clientX, t.clientY - 60);
    }, 250);
  });

  /* Close toolbar when clicking/tapping elsewhere */
  document.addEventListener('mousedown', function (e) {
    if (!toolbar) return;
    if (toolbar.contains(e.target)) return;
    if (closestMark(e.target)) return;
    hideToolbar();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideToolbar();
  });

  /* ── postMessage from parent dashboard ──────────────────────── */
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'hl-clear') return;
    document.querySelectorAll('.hl-mark').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      if (p.normalize) p.normalize();
    });
    try { localStorage.removeItem(KEY); } catch (er) {}
    hideToolbar();
  });

})();
