// Tekent SVG-productmockups met een optioneel ontwerp (afbeelding of tekst)
// in het printvlak. Vervang dit later gerust door echte productfoto's.
(function () {
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return r * 0.299 + g * 0.587 + b * 0.114 > 150;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  // Printvlak per producttype: x, y, breedte, hoogte
  const AREAS = {
    tshirt: [70, 62, 60, 66],
    hoodie: [72, 78, 56, 44],
    sweater: [70, 64, 60, 60],
    mug: [52, 72, 72, 62],
    poster: [48, 30, 104, 140],
    pillow: [50, 50, 100, 100],
    tote: [62, 88, 76, 76],
    cap: [76, 70, 48, 26],
    phone: [72, 30, 56, 140],
    mousepad: [30, 55, 140, 90],
  };

  function shape(type, color) {
    const s = shade(color, -28);
    const line = isLight(color) ? "rgba(0,0,0,.14)" : "rgba(255,255,255,.12)";
    const st = `stroke="${line}" stroke-width="1.2"`;
    switch (type) {
      case "tshirt":
        return `<path d="M70 28 L50 34 L22 58 L38 80 L52 70 L52 178 L148 178 L148 70 L162 80 L178 58 L150 34 L130 28 C124 40 112 46 100 46 C88 46 76 40 70 28 Z" fill="${color}" ${st}/>
          <path d="M70 28 C76 40 88 46 100 46 C112 46 124 40 130 28" fill="none" ${st}/>`;
      case "sweater":
        return `<path d="M72 30 L50 36 L24 70 L20 150 L36 154 L50 88 L52 176 L148 176 L150 88 L164 154 L180 150 L176 70 L150 36 L128 30 C122 40 112 44 100 44 C88 44 78 40 72 30 Z" fill="${color}" ${st}/>
          <path d="M72 30 C78 42 88 46 100 46 C112 46 122 42 128 30" fill="none" ${st} stroke-width="3"/>
          <rect x="52" y="168" width="96" height="8" fill="${s}"/>`;
      case "hoodie":
        return `<path d="M68 40 L48 46 L22 80 L18 156 L34 160 L50 96 L52 180 L148 180 L150 96 L166 160 L182 156 L178 80 L152 46 L132 40 Z" fill="${color}" ${st}/>
          <path d="M68 40 C66 18 84 10 100 10 C116 10 134 18 132 40 C124 60 76 60 68 40 Z" fill="${s}" ${st}/>
          <path d="M80 38 C86 52 114 52 120 38 C114 26 86 26 80 38 Z" fill="${shade(color, -60)}"/>
          <line x1="92" y1="52" x2="90" y2="74" ${st} stroke-width="2"/><line x1="108" y1="52" x2="110" y2="74" ${st} stroke-width="2"/>
          <path d="M70 136 L130 136 L140 166 L60 166 Z" fill="${s}" opacity=".5"/>`;
      case "mug":
        return `<path d="M136 80 C170 80 170 136 136 136" fill="none" stroke="${s}" stroke-width="12"/>
          <rect x="44" y="56" width="100" height="100" rx="8" fill="${color}" ${st}/>
          <ellipse cx="94" cy="58" rx="50" ry="8" fill="${s}"/>`;
      case "poster":
        return `<rect x="40" y="22" width="120" height="156" fill="${color}" stroke="#333" stroke-width="4"/>`;
      case "pillow":
        return `<path d="M36 40 Q100 30 164 40 Q172 100 164 160 Q100 170 36 160 Q28 100 36 40 Z" fill="${color}" ${st}/>`;
      case "tote":
        return `<path d="M76 70 C76 30 124 30 124 70" fill="none" stroke="${s}" stroke-width="7"/>
          <rect x="50" y="70" width="100" height="112" fill="${color}" ${st}/>`;
      case "cap":
        return `<path d="M50 110 C50 60 150 60 150 110 Z" fill="${color}" ${st}/>
          <path d="M40 110 L178 110 C186 120 170 128 150 124 L50 120 C40 120 36 114 40 110 Z" fill="${s}" ${st}/>
          <circle cx="100" cy="64" r="4" fill="${s}"/>`;
      case "phone":
        return `<rect x="64" y="20" width="72" height="160" rx="14" fill="${color}" ${st}/>
          <rect x="70" y="26" width="26" height="30" rx="6" fill="${shade(color, -50)}"/>
          <circle cx="78" cy="34" r="4" fill="#222"/><circle cx="88" cy="46" r="4" fill="#222"/>`;
      case "mousepad":
        return `<rect x="22" y="48" width="156" height="104" rx="10" fill="${color}" ${st}/>`;
    }
    return "";
  }

  function designLayer(type, color, design, uid) {
    const [x, y, w, h] = AREAS[type];
    const fullBleed = type === "poster" || type === "phone" || type === "mousepad" || type === "pillow";
    if (design && design.img) {
      const clip = `<clipPath id="c${uid}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
      return `<defs>${clip}</defs><image href="${design.img}" x="${x}" y="${y}" width="${w}" height="${h}"
        preserveAspectRatio="${fullBleed ? "xMidYMid slice" : "xMidYMid meet"}" clip-path="url(#c${uid})"/>`;
    }
    const text = design && design.text ? design.text : "";
    if (!text) {
      // Standaardontwerp zodat de mockup niet leeg oogt
      const ink = isLight(color) ? "#ff5a36" : "#ffd23f";
      return `<g opacity=".9"><circle cx="${x + w / 2}" cy="${y + h / 2 - 4}" r="${Math.min(w, h) / 4}" fill="none" stroke="${ink}" stroke-width="3"/>
        <text x="${x + w / 2}" y="${y + h / 2 + Math.min(w, h) / 4 + 12}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="${Math.min(w, h) / 6}" fill="${ink}">JOUW PRINT</text></g>`;
    }
    const ink = design.textColor || (isLight(color) ? "#111111" : "#ffffff");
    const lines = String(text).slice(0, 60).split("\n").slice(0, 3);
    const longest = Math.max(...lines.map((l) => l.length), 1);
    const size = Math.max(6, Math.min(h / (lines.length * 1.3), (w / longest) * 1.6));
    const startY = y + h / 2 - ((lines.length - 1) * size * 1.15) / 2 + size / 3;
    return lines
      .map((l, i) => `<text x="${x + w / 2}" y="${startY + i * size * 1.15}" text-anchor="middle" font-family="${design.font || "Archivo, sans-serif"}" font-weight="800" font-size="${size.toFixed(1)}" fill="${ink}">${esc(l)}</text>`)
      .join("");
  }

  let counter = 0;
  window.pgMockup = function (type, color, design) {
    const uid = ++counter;
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      ${shape(type, color)}${designLayer(type, color, design, uid)}</svg>`;
  };
})();
