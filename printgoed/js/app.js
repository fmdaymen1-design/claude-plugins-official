(function () {
  const CFG = window.PG_CONFIG;
  const I18N = window.PG_I18N;
  const PRODUCTS = window.PG_PRODUCTS || [];
  const REVIEWS = window.PG_REVIEWS || [];
  const CATEGORIES = ["tshirts", "hoodies", "ornaments", "home", "accessories", "digital"];
  const THEMES = ["halloween", "christmas", "family", "pets", "sports", "funny"];
  const LANG_KEY = "printgoed-lang";
  const SHOP_URL = `https://www.etsy.com/shop/${CFG.etsyShop}`;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  // ---------- Taal ----------
  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && I18N[saved]) return saved;
    } catch (e) { /* opslag niet beschikbaar */ }
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return I18N[nav] ? nav : "en";
  }
  let lang = detectLang();

  function t(key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
    if (vars) Object.keys(vars).forEach((k) => (s = s.replace(`{${k}}`, vars[k])));
    return s;
  }

  function money(n) {
    return new Intl.NumberFormat(lang, { style: "currency", currency: CFG.currency }).format(n);
  }

  function applyTranslations() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-placeholder]").forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $("#promo").textContent = CFG.promoCode ? t("promo", { code: CFG.promoCode }) : "";
    $$(".lang-select").forEach((sel) => (sel.value = lang));
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* opslag niet beschikbaar */ }
    renderAll();
  }

  // ---------- Afbeeldingen ----------
  // Etsy levert meerdere formaten; kleinere varianten laden veel sneller.
  const sized = (url, size) => url.replace("il_fullxfull.", `il_${size}.`);
  function img(url, size, alt, cls = "") {
    return `<img class="${cls}" src="${esc(sized(url, size))}" data-full="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  }
  // Val terug op het originele formaat als een verkleinde variant niet bestaat
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG" && el.dataset.full && el.src !== el.dataset.full) el.src = el.dataset.full;
  }, true);

  function etsyUrl(p) {
    if (p.u) return p.u;
    const q = p.t.split(/[,|:–]| - /)[0].trim().split(/\s+/).slice(0, 8).join(" ");
    return `${SHOP_URL}?search_query=${encodeURIComponent(q)}`;
  }

  // ---------- Hero, statistieken ----------
  function avgRating() {
    if (!REVIEWS.length) return 0;
    return REVIEWS.reduce((s, r) => s + r.r, 0) / REVIEWS.length;
  }

  function renderHero() {
    const picks = ["tshirts", "ornaments", "hoodies", "home"]
      .map((c) => PRODUCTS.find((p) => p.c === c))
      .filter(Boolean);
    $("#heroVisual").innerHTML = picks
      .map((p, i) => `<button class="hero-card c${i}" data-id="${p.id}" aria-label="${esc(p.t)}">${img(p.img[0], "570xN", p.t)}</button>`)
      .join("");
    $$("#heroVisual .hero-card").forEach((el) => el.addEventListener("click", () => openProduct(el.dataset.id)));
    $("#statProducts").textContent = PRODUCTS.length ? PRODUCTS.length + "+" : "–";
    $("#statRating").textContent = REVIEWS.length ? avgRating().toFixed(1) + " ★" : "–";
  }

  // ---------- Collecties ----------
  function renderCollections() {
    $("#catGrid").innerHTML = CATEGORIES.map((c) => {
      const items = PRODUCTS.filter((p) => p.c === c);
      if (!items.length) return "";
      return `<button class="cat-card" data-cat="${c}">
        <div class="cat-img">${img(items[0].img[0], "570xN", t("cat_" + c))}</div>
        <div class="cat-body"><h3>${esc(t("cat_" + c))}</h3><span>${esc(t("results", { n: items.length }))} →</span></div>
      </button>`;
    }).join("");
    $$(".cat-card").forEach((el) => el.addEventListener("click", () => {
      state.category = el.dataset.cat;
      state.theme = null;
      resetAndRender();
      $("#shop").scrollIntoView({ behavior: "smooth" });
    }));

    $("#themeRow").innerHTML = THEMES.map((th) => {
      const n = PRODUCTS.filter((p) => p.th.includes(th)).length;
      return n ? `<button class="theme-chip" data-theme="${th}">${esc(t("th_" + th))} <small>${n}</small></button>` : "";
    }).join("");
    $$(".theme-chip").forEach((el) => el.addEventListener("click", () => {
      state.theme = el.dataset.theme;
      state.category = "all";
      resetAndRender();
      $("#shop").scrollIntoView({ behavior: "smooth" });
    }));
  }

  // ---------- Shop ----------
  const state = { category: "all", theme: null, search: "", sort: "featured", shown: CFG.pageSize };

  function filtered() {
    const words = state.search.toLowerCase().split(/\s+/).filter(Boolean);
    let list = PRODUCTS.filter((p) => {
      if (state.category !== "all" && p.c !== state.category) return false;
      if (state.theme && !p.th.includes(state.theme)) return false;
      const hay = p.t.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    if (state.sort === "price-asc") list = [...list].sort((a, b) => a.p - b.p);
    if (state.sort === "price-desc") list = [...list].sort((a, b) => b.p - a.p);
    if (state.sort === "name") list = [...list].sort((a, b) => a.t.localeCompare(b.t, lang));
    return list;
  }

  function renderFilters() {
    const cats = ["all", ...CATEGORIES.filter((c) => PRODUCTS.some((p) => p.c === c))];
    $("#filters").innerHTML = cats
      .map((c) => `<button class="chip ${state.category === c ? "active" : ""}" data-cat="${c}" aria-pressed="${state.category === c}">${esc(c === "all" ? t("all") : t("cat_" + c))}</button>`)
      .join("");
    $$("#filters .chip").forEach((el) => el.addEventListener("click", () => {
      state.category = el.dataset.cat;
      resetAndRender();
    }));
    const at = $("#activeTheme");
    at.hidden = !state.theme;
    if (state.theme) {
      at.innerHTML = `<button class="theme-chip active" id="clearTheme">${esc(t("th_" + state.theme))} ✕</button>`;
      $("#clearTheme").addEventListener("click", () => { state.theme = null; resetAndRender(); });
    }
  }

  function renderProducts() {
    if (!PRODUCTS.length) {
      $("#emptyState").hidden = false;
      $("#emptyState").textContent = t("noCatalog");
      $("#resultCount").textContent = "";
      return;
    }
    const list = filtered();
    $("#resultCount").textContent = t("results", { n: list.length });
    $("#emptyState").hidden = list.length > 0;
    $("#emptyState").textContent = t("noResults");
    $("#productGrid").innerHTML = list.slice(0, state.shown).map((p) => `
      <article class="product-card" data-id="${p.id}" tabindex="0">
        <div class="product-img">${img(p.img[0], "570xN", p.t)}</div>
        <div class="product-body">
          <h3>${esc(p.t)}</h3>
          <div class="product-foot"><span class="price">${t("from")} ${money(p.p)}</span><span class="design-link">${esc(t("view"))} →</span></div>
        </div>
      </article>`).join("");
    $("#loadMore").hidden = list.length <= state.shown;
  }

  function resetAndRender() {
    state.shown = CFG.pageSize;
    renderFilters();
    renderProducts();
  }

  // ---------- Productdetail ----------
  let current = null;
  let photo = 0;

  function optionBlock(label, values) {
    if (!values || !values.length) return "";
    const max = 14;
    const chips = values.slice(0, max).map((v) => `<span class="opt">${esc(v)}</span>`).join("");
    const more = values.length > max ? `<span class="opt more">${esc(t("moreOptions", { n: values.length - max }))}</span>` : "";
    return `<div class="field"><label>${esc(label)}</label><div class="opts">${chips}${more}</div></div>`;
  }

  function optLabel(name, fallbackKey) {
    const n = (name || "").toLowerCase();
    if (n === "size") return t("sizes");
    if (n === "color" || n === "colour") return t("colors");
    return name || t(fallbackKey);
  }

  function showPhoto(i) {
    photo = (i + current.img.length) % current.img.length;
    const el = $("#pmImage");
    el.dataset.full = current.img[photo];
    el.src = sized(current.img[photo], "794xN");
    el.alt = current.t;
    $$("#pmThumbs button").forEach((b, idx) => b.classList.toggle("active", idx === photo));
  }

  function openProduct(id) {
    const p = byId(id);
    if (!p) return;
    current = p;
    $("#pmTitle").textContent = p.t;
    $("#pmPrice").textContent = `${t("from")} ${money(p.p)}`;
    $("#pmOptions").innerHTML = optionBlock(optLabel(p.sn, "options"), p.s) + optionBlock(optLabel(p.cn, "options"), p.co);
    $("#pmDesc").innerHTML = p.d.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`).join("");
    $("#descNote").hidden = lang === "en";
    $("#pmBuy").href = etsyUrl(p);
    $("#pmThumbs").innerHTML = p.img.map((u, i) => `<button type="button" data-i="${i}" aria-label="${i + 1}">${img(u, "170x135", "")}</button>`).join("");
    $$("#pmThumbs button").forEach((b) => b.addEventListener("click", () => showPhoto(+b.dataset.i)));
    $("#galPrev").hidden = $("#galNext").hidden = p.img.length < 2;
    showPhoto(0);
    $("#productModal").hidden = false;
    document.body.classList.add("locked");
    history.replaceState(null, "", "#p=" + p.id);
  }

  function closeProduct() {
    $("#productModal").hidden = true;
    document.body.classList.remove("locked");
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
  }

  // ---------- Reviews ----------
  let reviewsOpen = false;
  const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

  function renderReviews() {
    const section = $("#reviews");
    if (!REVIEWS.length) { section.hidden = true; $$('a[href="#reviews"]').forEach((a) => (a.hidden = true)); return; }
    const avg = avgRating();
    $("#avgStars").textContent = stars(Math.round(avg));
    $("#reviewsSummary").textContent = t("reviewsText", { avg: avg.toFixed(1), n: REVIEWS.length });
    const list = reviewsOpen ? REVIEWS : REVIEWS.slice(0, 6);
    $("#reviewGrid").innerHTML = list.map((r) => {
      const [m, d, y] = r.dt.split("/");
      const date = y ? new Date(+y, +m - 1, +d).toLocaleDateString(lang, { year: "numeric", month: "short" }) : "";
      return `<figure class="review">
        <div class="stars" aria-label="${r.r}/5">${stars(r.r)}</div>
        <blockquote>${esc(r.m).replace(/\n+/g, "<br>")}</blockquote>
        <figcaption><strong>${esc(r.n)}</strong><span>${esc(date)} · Etsy</span></figcaption>
      </figure>`;
    }).join("");
    const btn = $("#reviewsToggle");
    btn.hidden = REVIEWS.length <= 6;
    btn.textContent = reviewsOpen ? t("reviewsLess") : t("reviewsMore");
  }

  // ---------- Koppelingen ----------
  function bind() {
    $$(".etsy-link").forEach((a) => (a.href = SHOP_URL));
    $$(".etsy-contact").forEach((a) => (a.href = SHOP_URL + "#about"));

    const langs = CFG.languages.filter((l) => I18N[l]);
    $$(".lang-select").forEach((sel) => {
      sel.innerHTML = langs.map((l) => `<option value="${l}">${esc(I18N[l].langName)}</option>`).join("");
      sel.addEventListener("change", (e) => setLang(e.target.value));
    });

    $("#search").addEventListener("input", (e) => { state.search = e.target.value; state.shown = CFG.pageSize; renderProducts(); });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shown = CFG.pageSize; renderProducts(); });
    $("#loadMore").addEventListener("click", () => { state.shown += CFG.pageSize; renderProducts(); });
    $("#productGrid").addEventListener("click", (e) => {
      const card = e.target.closest(".product-card");
      if (card) openProduct(card.dataset.id);
    });
    $("#productGrid").addEventListener("keydown", (e) => {
      const card = e.target.closest(".product-card");
      if (card && e.key === "Enter") openProduct(card.dataset.id);
    });
    $("#reviewsToggle").addEventListener("click", () => { reviewsOpen = !reviewsOpen; renderReviews(); });

    $$("#productModal [data-close]").forEach((el) => el.addEventListener("click", closeProduct));
    $("#galPrev").addEventListener("click", () => showPhoto(photo - 1));
    $("#galNext").addEventListener("click", () => showPhoto(photo + 1));
    document.addEventListener("keydown", (e) => {
      if ($("#productModal").hidden) return;
      if (e.key === "Escape") closeProduct();
      if (e.key === "ArrowLeft") showPhoto(photo - 1);
      if (e.key === "ArrowRight") showPhoto(photo + 1);
    });

    $("#menuBtn").addEventListener("click", () => {
      const open = $("#nav").classList.toggle("open");
      $("#menuBtn").setAttribute("aria-expanded", open);
    });
    $$("#nav a").forEach((a) => a.addEventListener("click", () => $("#nav").classList.remove("open")));
    $("#year").textContent = new Date().getFullYear();
  }

  function renderAll() {
    applyTranslations();
    renderHero();
    renderCollections();
    renderFilters();
    renderProducts();
    renderReviews();
    if (current && !$("#productModal").hidden) openProduct(current.id);
  }

  bind();
  renderAll();
  const deep = location.hash.match(/^#p=(.+)$/);
  if (deep) openProduct(decodeURIComponent(deep[1]));
})();
