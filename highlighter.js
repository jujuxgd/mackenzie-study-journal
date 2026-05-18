/* ════════════════════════════════════════════════════════════════
   highlighter.js — Sistema de Grifos Pastéis
   Inclua este arquivo nos resumos. Funciona standalone.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'hl2026__' + location.pathname + location.search;

  var COLORS = [
    { name: 'Rosa',        bg: 'rgba(255,182,193,0.82)' },
    { name: 'Lilás',       bg: 'rgba(210,180,255,0.82)' },
    { name: 'Azul',        bg: 'rgba(173,216,240,0.82)' },
    { name: 'Verde Menta', bg: 'rgba(150,245,190,0.82)' },
    { name: 'Amarelo',     bg: 'rgba(255,245,130,0.82)' },
    { name: 'Pêssego',     bg: 'rgba(255,210,170,0.82)' },
  ];

  /* ── Inject CSS ──────────────────────────────────────────────── */
  var CSS = [
    '.hl-mark{border-radius:3px;padding:1px 2px;cursor:pointer;transition:filter .15s ease;}',
    '.hl-mark:hover{filter:brightness(0.83);}',
    '#hl-tb{position:fixed;z-index:2147483647;display:flex;align-items:center;gap:5px;',
      'padding:9px 14px;background:rgba(255,252,250,0.97);',
      'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
      'border:1.5px solid rgba(255,255,255,0.95);border-radius:999px;',
      'box-shadow:0 10px 40px rgba(130,90,170,0.26),0 2px 12px rgba(0,0,0,0.11);',
      'animation:hlPop .22s cubic-bezier(0.34,1.56,0.64,1) forwards;',
      'pointer-events:all;font-family:sans-serif;user-select:none;touch-action:none;}',
    '@keyframes hlPop{from{opacity:0;transform:translateY(8px) scale(.88)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '#hl-tb .hl-lbl{font-size:9.5px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;',
      'color:rgba(110,90,140,.65);margin-right:3px;white-space:nowrap;}',
    '#hl-tb .hl-sw{width:26px;height:26px;border-radius:50%;',
      'border:2.5px solid rgba(255,255,255,.90);box-shadow:0 1px 5px rgba(0,0,0,.16);',
      'cursor:pointer;transition:transform .14s ease,box-shadow .14s ease;',
      'flex-shrink:0;padding:0;outline:none;}',
    '#hl-tb .hl-sw:hover{transform:scale(1.32);box-shadow:0 3px 12px rgba(0,0,0,.24);}',
    '#hl-tb .hl-sep{display:inline-block;width:1px;height:18px;',
      'background:rgba(0,0,0,.12);margin:0 3px;flex-shrink:0;}',
    '#hl-tb .hl-er{width:28px;height:28px;border-radius:50%;',
      'border:1.5px solid rgba(200,70,70,.28);background:rgba(255,100,100,.09);',
      'color:rgba(180,40,40,.80);font-size:12px;font-weight:700;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:background .14s ease,transform .14s ease;',
      'flex-shrink:0;padding:0;outline:none;line-height:1;}',
    '#hl-tb .hl-er:hover{background:rgba(255,60,60,.22);transform:scale(1.20);}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.id  = 'hl-styles';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── Restore saved highlights ────────────────────────────────── */
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) {
      document.body.innerHTML = saved;
    }
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
      sw.addEventListener('mousedown',  applyColor(c.bg));
      sw.addEventListener('touchstart', applyColor(c.bg), { passive: false });
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
    function doErase(e) {
      e.preventDefault();
      e.stopPropagation();
      if (activeMark) {
        var p = activeMark.parentNode;
        while (activeMark.firstChild) p.insertBefore(activeMark.firstChild, activeMark);
        p.removeChild(activeMark);
        if (p.normalize) p.normalize();
      }
      hideToolbar();
      save();
    }
    er.addEventListener('mousedown',  doErase);
    er.addEventListener('touchstart', doErase, { passive: false });
    el.appendChild(er);

    return el;
  }

  function applyColor(bg) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (activeMark) {
        activeMark.style.backgroundColor = bg;
      } else if (savedRange) {
        applyHL(savedRange, bg);
      }
      hideToolbar();
      save();
    };
  }

  /* ── Show toolbar at viewport (cx, cy) ──────────────────────── */
  function showToolbar(cx, cy) {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    toolbar = buildToolbar();
    document.body.appendChild(toolbar);

    var tw  = toolbar.offsetWidth  || 290;
    var th  = toolbar.offsetHeight || 50;
    var vw  = window.innerWidth;
    var vh  = window.innerHeight;
    var pad = 10;

    var left = cx - tw / 2;
    var top  = cy - th - 14;

    if (left < pad)           left = pad;
    if (left + tw > vw - pad) left = vw - tw - pad;
    if (top  < pad)           top  = cy + 22;
    if (top + th > vh - pad)  top  = vh - th - pad;

    toolbar.style.left = left + 'px';
    toolbar.style.top  = top  + 'px';
  }

  function hideToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
    savedRange = null;
    activeMark = null;
  }

  /* ── Collect all text nodes that overlap a Range ────────────── */
  /* Walks the DOM tree without crossing element boundaries so
     surroundContents() never fails for multi-paragraph selections. */
  function getTextNodesInRange(range) {
    try {
      var ancestor = range.commonAncestorContainer;
      if (ancestor.nodeType === 3) return [ancestor];

      var nodes  = [];
      /* NodeFilter.SHOW_TEXT = 4 — use numeric literal for max compatibility */
      var walker = document.createTreeWalker(ancestor, 4, null, false);
      var node;
      while ((node = walker.nextNode())) {
        /* Skip text inside <script> / <style> */
        var pn = node.parentNode;
        if (pn && (pn.nodeName === 'SCRIPT' || pn.nodeName === 'STYLE')) continue;

        var nr = document.createRange();
        nr.selectNode(node);

        /* range.end is before or at this node's start → walked past, stop */
        /* END_TO_START = 3 */
        if (range.compareBoundaryPoints(3, nr) <= 0) break;

        /* range.start is before this node's end → overlaps, include */
        /* START_TO_END = 1 */
        if (range.compareBoundaryPoints(1, nr) < 0) nodes.push(node);
      }
      return nodes;
    } catch (e) {
      return [];
    }
  }

  /* ── Apply highlight ─────────────────────────────────────────── */
  /* Each text node gets its own <mark> — DOM structure is preserved,
     so highlighting an entire paragraph never breaks the page layout. */
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
      } catch (e) { /* skip nodes that can't be wrapped (e.g. inside tables) */ }
    });

    try { window.getSelection().removeAllRanges(); } catch (e) {}
  }

  /* ── Save body to localStorage ───────────────────────────────── */
  function save() {
    try {
      localStorage.setItem(KEY, document.body.innerHTML);
    } catch (e) {}
  }

  /* ── Utility: find closest .hl-mark ancestor ─────────────────── */
  function closestMark(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('hl-mark')) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ── Capture selection (shared by mouse and touch flows) ─────── */
  var touchRangeBackup = null; /* last non-empty selection on touch */

  function captureSelection(clientX, clientY) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var rng  = sel.getRangeAt(0);
    var text = sel.toString().trim();
    if (rng.collapsed || !text) return;

    activeMark = null;
    savedRange = rng.cloneRange();
    showToolbar(clientX, clientY);
  }

  /* ── Mouse events (desktop + iOS synthetic mouse) ────────────── */
  document.addEventListener('mouseup', function (e) {
    if (toolbar && toolbar.contains(e.target)) return;

    var mk = closestMark(e.target);
    if (mk) {
      activeMark = mk;
      savedRange = null;
      showToolbar(e.clientX, e.clientY);
      return;
    }

    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { hideToolbar(); return; }
    var rng  = sel.getRangeAt(0);
    var text = sel.toString().trim();
    if (rng.collapsed || !text) { hideToolbar(); return; }

    activeMark = null;
    savedRange = rng.cloneRange();
    var rect = rng.getBoundingClientRect();
    showToolbar(rect.left + rect.width / 2, rect.top);
  });

  /* ── Touch: save selection on selectionchange, show on touchend ─ */
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (sel && sel.rangeCount) {
      var rng = sel.getRangeAt(0);
      if (!rng.collapsed && sel.toString().trim()) {
        touchRangeBackup = rng.cloneRange();
      }
    }
  });

  document.addEventListener('touchend', function (e) {
    if (toolbar) {
      /* tap inside toolbar handled by touchstart on buttons — ignore */
      if (toolbar.contains(e.target)) return;
      hideToolbar();
      return;
    }

    /* Tap on existing mark */
    var mk = closestMark(e.target);
    if (mk) {
      var t = e.changedTouches[0];
      activeMark = mk;
      savedRange = null;
      setTimeout(function () { showToolbar(t.clientX, t.clientY); }, 50);
      return;
    }

    /* Show toolbar for the last known selection */
    if (!touchRangeBackup) return;
    var backup = touchRangeBackup;
    touchRangeBackup = null;

    setTimeout(function () {
      /* If selection was cleared by iOS, use the saved backup range */
      var sel = window.getSelection();
      var active = (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed)
                   ? sel.getRangeAt(0)
                   : null;
      var rng = active || backup;
      if (!rng || rng.collapsed) return;

      activeMark = null;
      savedRange = rng.cloneRange();
      var rect = rng.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      var t = e.changedTouches[0];
      showToolbar(rect.left + rect.width / 2, rect.top || t.clientY - 60);
    }, 200);
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
