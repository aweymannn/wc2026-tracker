/* ============================================================================
   FORAGER'S ATLAS — botanical illustration engine
   ----------------------------------------------------------------------------
   Generates a self-contained SVG "botanical plate" illustration for each plant,
   procedurally, from its morphology (form) and colour palette. No network, no
   external images — every illustration always renders, online or offline.

   Each plant may declare an explicit `art` form in forage-data.js; otherwise a
   form is inferred from its icon / family / parts. A plant may also set an
   `img` URL to override the drawing with a real photograph where available.

   Public API:
     window.forageIllustration(plant, { w, h, label }) -> SVG markup string
   ============================================================================ */
(function () {
  "use strict";

  /* ---- deterministic PRNG so each plant's art is stable ---- */
  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- palette ---- */
  var INK = "#3b4a2c";        // engraving line
  var INK2 = "#5a6b3e";
  var PLATE = "#f3ecda";      // aged-paper plate background
  var PLATE2 = "#ece2c9";
  var LEAF = "#7d9d55";
  var LEAF_DK = "#5f7d3e";
  var LEAF_LT = "#a8c07a";
  var STEM = "#6f7c43";
  var BROWN = "#8a6a3f";
  var BROWN_DK = "#6b4f2c";

  var ACCENTS = {
    red:    ["#c0453f", "#9e2f2c"],
    blue:   ["#4a72b0", "#345a94"],
    purple: ["#8a5a97", "#6b4278"],
    magenta:["#b5487f", "#8f3363"],
    pink:   ["#d183a0", "#c06f8e"],
    orange: ["#d7873a", "#b8692a"],
    yellow: ["#e6b23e", "#cf9526"],
    gold:   ["#e0a92c", "#c08a1e"],
    white:  ["#f7f3e8", "#d9cfb6"],
    darkberry:["#3d3a63", "#2a2747"],
    green:  ["#8aa85a", "#6f8f3e"],
  };

  function pickAccent(p) {
    var s = (p.icon + " " + p.common + " " + (p.taste || "") + " " + (p.id_notes || "")).toLowerCase();
    // icon glyph hints first (most reliable)
    if (/🫐/.test(p.icon)) return ACCENTS.darkberry;
    if (/🔴|🍒/.test(p.icon)) return ACCENTS.red;
    if (/🟣/.test(p.icon)) return ACCENTS.purple;
    if (/🟠|🧡/.test(p.icon)) return ACCENTS.orange;
    if (/🟡|💛/.test(p.icon)) return ACCENTS.yellow;
    if (/💙/.test(p.icon)) return ACCENTS.blue;
    if (/💜/.test(p.icon)) return ACCENTS.purple;
    if (/💗|🌸/.test(p.icon)) return ACCENTS.pink;
    if (/🤍|🌼/.test(p.icon)) return ACCENTS.white;
    if (/🌺/.test(p.icon)) return ACCENTS.magenta;
    if (/🍋/.test(p.icon)) return ACCENTS.yellow;
    // word hints
    if (/magenta/.test(s)) return ACCENTS.magenta;
    if (/purple|violet|lavender/.test(s)) return ACCENTS.purple;
    if (/\bblue\b/.test(s)) return ACCENTS.blue;
    if (/\bred\b|crimson|scarlet/.test(s)) return ACCENTS.red;
    if (/orange/.test(s)) return ACCENTS.orange;
    if (/yellow|golden|gold/.test(s)) return ACCENTS.yellow;
    if (/pink|rose/.test(s)) return ACCENTS.pink;
    if (/white|cream/.test(s)) return ACCENTS.white;
    return ACCENTS.gold;
  }

  function resolveForm(p) {
    if (p.art) return p.art;
    var fam = (p.family || "").toLowerCase();
    var icon = p.icon || "";
    var parts = (p.parts || []).join(" ").toLowerCase();
    if (/cactaceae/.test(fam) || /🌵/.test(icon)) return "cactus";
    if (/pinaceae|cupressaceae/.test(fam) || /🌲/.test(icon)) return "conifer";
    if (p.id === "chaga" || p.id === "reishi" || /🍄/.test(icon)) return "mushroom";
    if (/apiaceae/.test(fam)) return "umbel";
    if (/🌻/.test(icon)) return "daisy";
    if (/🍀/.test(icon)) return "trefoil";
    if (/🕯️|🕯/.test(icon)) return "spike";
    if (/🌳/.test(icon)) return "tree";
    if (/🌾/.test(icon)) return "grass";
    if (p.id === "usnea") return "lichen";
    if (/🫐|🍇|🔴|🍒|🟣|🫧/.test(icon)) return "berries";
    if (/🍋|🥭|🟠|🟡/.test(icon)) return "fruit";
    if (/🫚|🥔/.test(icon)) return "root";
    if (/🌸|🌺|💜|💛|💙|💗|🧡|🤍|🌼/.test(icon)) {
      // daisy-family composites look like daisies
      if (/asteraceae/.test(fam)) return "daisy";
      return "flower";
    }
    if (/🥬|🌿|🌱|🍃/.test(icon)) return "leafy";
    if (/berr|fruit/.test(parts)) return "berries";
    return "leafy";
  }

  /* ---- drawing primitives ---- */
  function leaf(cx, cy, len, wid, ang, fill, dk) {
    var rad = ang * Math.PI / 180;
    var dx = Math.cos(rad), dy = Math.sin(rad);
    var px = -dy, py = dx; // perpendicular
    var tx = cx + dx * len, ty = cy + dy * len;
    var m1x = cx + dx * len * 0.5 + px * wid, m1y = cy + dy * len * 0.5 + py * wid;
    var m2x = cx + dx * len * 0.5 - px * wid, m2y = cy + dy * len * 0.5 - py * wid;
    var d = "M" + f(cx) + " " + f(cy) +
            " Q" + f(m1x) + " " + f(m1y) + " " + f(tx) + " " + f(ty) +
            " Q" + f(m2x) + " " + f(m2y) + " " + f(cx) + " " + f(cy) + " Z";
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + dk + '" stroke-width="1.1"/>' +
           '<line x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(tx) + '" y2="' + f(ty) + '" stroke="' + dk + '" stroke-width="0.8" opacity="0.6"/>';
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function circle(cx, cy, r, fill, stroke) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' +
           (stroke ? ' stroke="' + stroke + '" stroke-width="1"' : '') + '/>';
  }
  function stemLine(x1, y1, x2, y2, w) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) +
           '" stroke="' + STEM + '" stroke-width="' + (w || 2.2) + '" stroke-linecap="round"/>';
  }
  function petalEllipse(cx, cy, rx, ry, ang, fill, stroke) {
    return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) +
           '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.8" transform="rotate(' +
           f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')"/>';
  }

  /* ---- form renderers (draw within 0..200 box, base near y=185) ---- */
  var forms = {
    berries: function (r, ac) {
      var s = "";
      s += stemLine(100, 190, 100, 70, 2.4);
      s += leaf(100, 150, 46, 15, 200 + r() * 15, LEAF, LEAF_DK);
      s += leaf(100, 130, 44, 14, -20 - r() * 15, LEAF_LT, LEAF_DK);
      var n = 5 + Math.floor(r() * 4);
      var bx = 100, by = 78;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        var rad = 14 + r() * 8;
        var x = bx + Math.cos(a) * rad, y = by + Math.sin(a) * rad * 0.8;
        s += '<line x1="' + f(bx) + '" y1="' + f(by) + '" x2="' + f(x) + '" y2="' + f(y) + '" stroke="' + STEM + '" stroke-width="1"/>';
        s += circle(x, y, 7 + r() * 2, ac[0], ac[1]);
        s += circle(x - 2, y - 2, 2, "rgba(255,255,255,.4)");
      }
      return s;
    },
    fruit: function (r, ac) {
      var s = stemLine(100, 190, 100, 60, 2.6);
      s += leaf(100, 120, 50, 17, 205, LEAF, LEAF_DK);
      s += leaf(100, 100, 50, 17, -25, LEAF_LT, LEAF_DK);
      s += circle(88, 78, 20, ac[0], ac[1]);
      s += circle(112, 92, 16, ac[0], ac[1]);
      s += circle(82, 72, 5, "rgba(255,255,255,.35)");
      return s;
    },
    daisy: function (r, ac) {
      var s = stemLine(100, 190, 100, 92, 2.4);
      s += leaf(100, 150, 34, 10, 210, LEAF, LEAF_DK);
      s += leaf(100, 135, 32, 9, -30, LEAF_LT, LEAF_DK);
      var cx = 100, cy = 82, n = 12 + Math.floor(r() * 4);
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 360;
        var rad = a * Math.PI / 180;
        s += petalEllipse(cx + Math.cos(rad) * 26, cy + Math.sin(rad) * 26, 16, 6, a, ac[0], ac[1]);
      }
      s += circle(cx, cy, 13, "#b9852f", "#8a5f1e");
      for (var j = 0; j < 10; j++) s += circle(cx + (r() - 0.5) * 18, cy + (r() - 0.5) * 18, 1.4, "#6b451a");
      return s;
    },
    flower: function (r, ac) {
      var s = stemLine(100, 190, 100, 92, 2.4);
      s += leaf(100, 152, 34, 11, 205, LEAF, LEAF_DK);
      s += leaf(100, 136, 32, 10, -28, LEAF_LT, LEAF_DK);
      var cx = 100, cy = 80, n = 5 + Math.floor(r() * 2);
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 360 + r() * 8;
        var rad = a * Math.PI / 180;
        s += petalEllipse(cx + Math.cos(rad) * 17, cy + Math.sin(rad) * 17, 15, 11, a, ac[0], ac[1]);
      }
      s += circle(cx, cy, 8, "#e6c65a", "#b8952e");
      return s;
    },
    spike: function (r, ac) {
      var s = stemLine(100, 192, 100, 40, 2.6);
      s += leaf(100, 165, 40, 12, 205, LEAF, LEAF_DK);
      s += leaf(100, 165, 40, 12, -25, LEAF_LT, LEAF_DK);
      s += leaf(100, 140, 34, 10, 210, LEAF, LEAF_DK);
      for (var i = 0; i < 12; i++) {
        var y = 50 + i * 9;
        var w = 6 + (i * 0.7);
        var side = i % 2 ? 1 : -1;
        s += petalEllipse(100 + side * (w * 0.4), y, w, 5, side > 0 ? 30 : -30, ac[0], ac[1]);
        s += petalEllipse(100 - side * (w * 0.4), y + 3, w, 5, side > 0 ? -30 : 30, ac[0], ac[1]);
      }
      return s;
    },
    umbel: function (r, ac) {
      var s = stemLine(100, 192, 100, 70, 2.6);
      s += leaf(100, 150, 40, 16, 210, LEAF, LEAF_DK);
      s += leaf(100, 150, 40, 16, -30, LEAF_LT, LEAF_DK);
      var n = 11;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        var ex = 100 + Math.cos(a) * (30 + r() * 6);
        var ey = 60 + Math.sin(a) * (18 + r() * 5);
        s += '<line x1="100" y1="70" x2="' + f(ex) + '" y2="' + f(ey) + '" stroke="' + STEM + '" stroke-width="1"/>';
        for (var k = 0; k < 3; k++) s += circle(ex + (r() - 0.5) * 6, ey + (r() - 0.5) * 6, 2.4, ac[0], ac[1]);
      }
      return s;
    },
    leafy: function (r, ac) {
      var s = "";
      // rosette of broad leaves from base
      var n = 5 + Math.floor(r() * 2);
      for (var i = 0; i < n; i++) {
        var a = 250 + (i - (n - 1) / 2) * (150 / n);
        var len = 78 + r() * 20;
        s += leaf(100, 188, len, 20 + r() * 6, a, i % 2 ? LEAF : LEAF_LT, LEAF_DK);
      }
      s += leaf(100, 188, 60, 16, 270, LEAF_DK, INK);
      return s;
    },
    trefoil: function (r, ac) {
      var s = stemLine(100, 192, 100, 96, 2.2);
      var base = { x: 100, y: 92 };
      var angs = [250, 290, 200 - 200, 340 - 360];
      var set = [230, 310, 90];
      for (var i = 0; i < 3; i++) {
        var a = [210, 330, 90][i];
        var rad = a * Math.PI / 180;
        var hx = base.x + Math.cos(rad) * 20, hy = base.y + Math.sin(rad) * 20;
        s += heart(hx, hy, 24, a + 90, LEAF, LEAF_DK);
      }
      return s;
    },
    conifer: function (r, ac) {
      var s = '<line x1="100" y1="192" x2="100" y2="40" stroke="' + BROWN_DK + '" stroke-width="3"/>';
      for (var i = 0; i < 13; i++) {
        var y = 50 + i * 11;
        var spread = 8 + i * 3.2;
        for (var side = -1; side <= 1; side += 2) {
          s += '<line x1="100" y1="' + f(y) + '" x2="' + f(100 + side * spread) + '" y2="' + f(y + 10) +
               '" stroke="' + LEAF_DK + '" stroke-width="2.4" stroke-linecap="round"/>';
        }
      }
      // a small cone
      s += '<ellipse cx="120" cy="120" rx="7" ry="12" fill="' + BROWN + '" stroke="' + BROWN_DK + '" stroke-width="1"/>';
      return s;
    },
    cactus: function (r, ac) {
      var s = '<ellipse cx="90" cy="130" rx="34" ry="46" fill="' + LEAF + '" stroke="' + LEAF_DK + '" stroke-width="1.6"/>';
      s += '<ellipse cx="122" cy="92" rx="24" ry="32" fill="' + LEAF_LT + '" stroke="' + LEAF_DK + '" stroke-width="1.6" transform="rotate(25 122 92)"/>';
      for (var i = 0; i < 20; i++) {
        var x = 62 + r() * 56, y = 90 + r() * 78;
        s += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x + 2) + '" y2="' + f(y - 3) + '" stroke="' + INK + '" stroke-width="0.8"/>';
      }
      s += circle(126, 66, 9, ac[0], ac[1]); // flower/fruit on top
      return s;
    },
    mushroom: function (r, ac) {
      var s = '<path d="M64 118 Q100 66 136 118 Z" fill="' + BROWN + '" stroke="' + BROWN_DK + '" stroke-width="1.4"/>';
      s += '<path d="M64 118 Q100 132 136 118" fill="#e9dcbf" stroke="' + BROWN_DK + '" stroke-width="1"/>';
      s += '<rect x="90" y="118" width="20" height="52" rx="6" fill="#e3d4b0" stroke="' + BROWN_DK + '" stroke-width="1.2"/>';
      for (var i = 0; i < 6; i++) s += '<line x1="' + f(72 + i * 10) + '" y1="120" x2="' + f(74 + i * 10) + '" y2="128" stroke="' + BROWN_DK + '" stroke-width="0.7"/>';
      s += '<ellipse cx="100" cy="176" rx="30" ry="5" fill="' + LEAF_DK + '" opacity="0.5"/>';
      return s;
    },
    grass: function (r, ac) {
      var s = "";
      for (var i = 0; i < 6; i++) {
        var off = (i - 2.5) * 9;
        var cx = 100 + off;
        var bend = (i - 2.5) * 10;
        s += '<path d="M' + f(cx) + ' 192 Q' + f(cx + bend) + ' 110 ' + f(cx + bend * 1.6) + ' 60" fill="none" stroke="' + (i % 2 ? LEAF : LEAF_DK) + '" stroke-width="2.4" stroke-linecap="round"/>';
      }
      // seed head
      for (var k = 0; k < 9; k++) s += petalEllipse(100 + (r() - 0.5) * 10, 55 + k * 4, 5, 2.4, 20, ac[0], ac[1]);
      return s;
    },
    root: function (r, ac) {
      var s = '<line x1="100" y1="120" x2="100" y2="150" stroke="' + STEM + '" stroke-width="2.4"/>';
      // tops
      s += leaf(100, 118, 40, 12, 250, LEAF, LEAF_DK);
      s += leaf(100, 118, 40, 12, 290, LEAF_LT, LEAF_DK);
      s += leaf(100, 118, 36, 10, 270, LEAF, LEAF_DK);
      // ground line
      s += '<line x1="55" y1="150" x2="145" y2="150" stroke="' + BROWN_DK + '" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>';
      // tapering root
      s += '<path d="M86 150 Q84 190 100 196 Q116 190 114 150 Z" fill="' + BROWN + '" stroke="' + BROWN_DK + '" stroke-width="1.4"/>';
      for (var i = 0; i < 5; i++) {
        var y = 160 + i * 7;
        s += '<line x1="' + (i % 2 ? 114 : 86) + '" y1="' + f(y) + '" x2="' + (i % 2 ? 128 : 72) + '" y2="' + f(y + 8) + '" stroke="' + BROWN_DK + '" stroke-width="1"/>';
      }
      return s;
    },
    tree: function (r, ac) {
      var s = '<line x1="100" y1="192" x2="100" y2="120" stroke="' + BROWN_DK + '" stroke-width="6"/>';
      s += '<line x1="100" y1="140" x2="78" y2="115" stroke="' + BROWN_DK + '" stroke-width="3"/>';
      s += '<line x1="100" y1="150" x2="124" y2="120" stroke="' + BROWN_DK + '" stroke-width="3"/>';
      s += '<circle cx="100" cy="88" r="44" fill="' + LEAF + '" stroke="' + LEAF_DK + '" stroke-width="1.6"/>';
      s += '<circle cx="74" cy="98" r="26" fill="' + LEAF_LT + '" stroke="' + LEAF_DK + '" stroke-width="1.2" opacity="0.9"/>';
      s += '<circle cx="126" cy="98" r="26" fill="' + LEAF_DK + '" stroke="' + LEAF_DK + '" stroke-width="1.2" opacity="0.85"/>';
      for (var i = 0; i < 14; i++) s += circle(70 + r() * 60, 60 + r() * 60, 1.6, "rgba(255,255,255,.18)");
      return s;
    },
    shrub: function (r, ac) {
      var s = "";
      var branches = [[100, 190, 70, 90], [100, 190, 130, 90], [100, 190, 100, 70]];
      branches.forEach(function (b) {
        s += '<path d="M' + b[0] + ' ' + b[1] + ' Q100 130 ' + b[2] + ' ' + b[3] + '" fill="none" stroke="' + BROWN_DK + '" stroke-width="2.4"/>';
      });
      var pts = [[70, 90], [130, 90], [100, 70], [84, 110], [116, 110]];
      pts.forEach(function (pt, i) {
        s += leaf(pt[0], pt[1], 28, 10, i * 60, i % 2 ? LEAF : LEAF_LT, LEAF_DK);
        s += circle(pt[0] + 6, pt[1] - 6, 5, ac[0], ac[1]);
      });
      return s;
    },
    vine: function (r, ac) {
      var s = '<path d="M60 192 Q140 150 90 100 Q50 70 120 45" fill="none" stroke="' + STEM + '" stroke-width="2.4"/>';
      var pts = [[110, 158], [96, 118], [78, 92], [116, 62]];
      pts.forEach(function (pt, i) {
        s += leaf(pt[0], pt[1], 30, 12, 200 + i * 40, i % 2 ? LEAF : LEAF_LT, LEAF_DK);
        s += circle(pt[0] - 6, pt[1] + 4, 5, ac[0], ac[1]);
      });
      // tendril spiral
      s += '<path d="M120 45 q10 -6 6 -14 q-6 -6 -12 0 q-4 6 4 8" fill="none" stroke="' + STEM + '" stroke-width="1.4"/>';
      return s;
    },
    lichen: function (r, ac) {
      var s = '<line x1="50" y1="52" x2="150" y2="60" stroke="' + BROWN_DK + '" stroke-width="4"/>';
      for (var i = 0; i < 12; i++) {
        var x = 56 + i * 8;
        var len = 60 + r() * 60;
        var d = "M" + x + " 56";
        var y = 56;
        for (var k = 0; k < 5; k++) { y += len / 5; d += " q" + ((r() - 0.5) * 14).toFixed(1) + " " + (len / 5).toFixed(1) + " " + ((r() - 0.5) * 6).toFixed(1) + " " + (len / 5).toFixed(1); }
        s += '<path d="' + d + '" fill="none" stroke="' + LEAF_LT + '" stroke-width="1.4" opacity="0.85"/>';
      }
      return s;
    },
  };

  function heart(cx, cy, size, ang, fill, dk) {
    var s = size;
    var d = "M0 " + f(s * 0.3) +
            " C " + f(-s * 0.5) + " " + f(-s * 0.3) + " " + f(-s * 0.5) + " " + f(-s * 0.7) + " 0 " + f(-s * 0.35) +
            " C " + f(s * 0.5) + " " + f(-s * 0.7) + " " + f(s * 0.5) + " " + f(-s * 0.3) + " 0 " + f(s * 0.3) + " Z";
    return '<g transform="translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(ang) + ')"><path d="' + d + '" fill="' + fill + '" stroke="' + dk + '" stroke-width="1.1"/></g>';
  }

  function buildSvg(p, w, h, label) {
    var form = resolveForm(p);
    var ac = pickAccent(p);
    var r = rng(hash(p.id || p.common || "x"));
    var body = (forms[form] || forms.leafy)(r, ac);
    var lbl = label
      ? '<text x="100" y="196" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="9" fill="' + INK + '" opacity="0.55">' + escXml(p.latin || "") + '</text>'
      : '';
    var gid = "pg" + hashSafe(p.id);
    return '' +
      '<svg viewBox="0 0 200 200" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Illustration of ' + escXml(p.common || "plant") + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><radialGradient id="' + gid + '" cx="50%" cy="40%" r="75%">' +
          '<stop offset="0%" stop-color="' + PLATE + '"/><stop offset="100%" stop-color="' + PLATE2 + '"/>' +
        '</radialGradient></defs>' +
        '<rect x="0" y="0" width="200" height="200" fill="url(#' + gid + ')"/>' +
        '<rect x="6" y="6" width="188" height="188" fill="none" stroke="' + INK + '" stroke-width="1" opacity="0.25"/>' +
        body + lbl +
      '</svg>';
  }

  /* ---- public builder ---- */
  window.forageIllustration = function (p, opts) {
    opts = opts || {};
    var w = opts.w || "100%", h = opts.h || "100%";
    var label = opts.label !== false;
    var svg = buildSvg(p, w, h, label);

    // real photo override: show the photo, fall back to the drawn plate on error
    if (p.img) {
      return '<div style="position:relative;width:100%;height:100%">' +
        '<img src="' + escXml(p.img) + '" alt="' + escXml(p.common || "") + '" loading="lazy" ' +
          'style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" ' +
          'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"/>' +
        '<div style="display:none;width:100%;height:100%">' + svg + '</div>' +
      '</div>';
    }
    return svg;
  };

  function hashSafe(id) { return (hash(id || "x") % 100000).toString(36); }
  function escXml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
