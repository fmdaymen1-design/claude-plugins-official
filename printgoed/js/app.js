(function () {
  const PRODUCTS = window.PG_PRODUCTS;
  const CATEGORIES = window.PG_CATEGORIES;
  const FREE_SHIPPING = 50;
  const SHIPPING_COST = 4.95;
  const CART_KEY = "printgoed-cart";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const euro = (n) => "€" + n.toFixed(2).replace(".", ",");
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  // ---------- Opslag ----------
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
    catch (e) { toast("Let op: winkelwagen kon niet lokaal worden opgeslagen."); }
  }
  let cart = loadCart();

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function unitPrice(product, size) {
    return product.price + ((product.sizePrices && product.sizePrices[size]) || 0);
  }

  // ---------- Hero ----------
  function renderHero() {
    const picks = [["tshirt", "#ff5a36"], ["mug", "#ffffff"], ["hoodie", "#111111"], ["tote", "#e8e0d5"]];
    $("#heroVisual").innerHTML = picks
      .map(([type, color], i) => `<div class="hero-card c${i}">${pgMockup(type, color)}</div>`)
      .join("");
  }

  // ---------- Categorieën ----------
  function renderCategories() {
    $("#catGrid").innerHTML = CATEGORIES.map((c) => {
      const first = PRODUCTS.find((p) => p.category === c.id);
      const count = PRODUCTS.filter((p) => p.category === c.id).length;
      return `<button class="cat-card" data-cat="${c.id}">
        <div class="cat-img">${pgMockup(first.type, first.colors[0])}</div>
        <div class="cat-body"><h3>${c.name}</h3><p>${c.desc}</p><span>${count} producten →</span></div>
      </button>`;
    }).join("");
    $$(".cat-card").forEach((el) =>
      el.addEventListener("click", () => {
        state.category = el.dataset.cat;
        renderFilters();
        renderProducts();
        $("#shop").scrollIntoView({ behavior: "smooth" });
      })
    );
  }

  // ---------- Productoverzicht ----------
  const state = { category: "all", search: "", sort: "popular" };

  function renderFilters() {
    const all = [{ id: "all", name: "Alles" }, ...CATEGORIES];
    $("#filters").innerHTML = all
      .map((c) => `<button role="tab" class="chip ${state.category === c.id ? "active" : ""}" data-cat="${c.id}" aria-selected="${state.category === c.id}">${c.name}</button>`)
      .join("");
    $$("#filters .chip").forEach((el) =>
      el.addEventListener("click", () => {
        state.category = el.dataset.cat;
        renderFilters();
        renderProducts();
      })
    );
  }

  function renderProducts() {
    let list = PRODUCTS.filter(
      (p) =>
        (state.category === "all" || p.category === state.category) &&
        p.name.toLowerCase().includes(state.search.toLowerCase())
    );
    if (state.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (state.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "nl"));

    $("#emptyState").hidden = list.length > 0;
    $("#productGrid").innerHTML = list
      .map(
        (p) => `<article class="product-card" data-id="${p.id}" tabindex="0">
          <div class="product-img">${p.badge ? `<span class="badge">${p.badge}</span>` : ""}${pgMockup(p.type, p.colors[0])}</div>
          <div class="product-body">
            <h3>${p.name}</h3>
            <div class="dots">${p.colors.slice(0, 6).map((c) => `<span style="background:${c}"></span>`).join("")}</div>
            <div class="product-foot"><span class="price">vanaf ${euro(p.price)}</span><span class="design-link">Ontwerp →</span></div>
          </div>
        </article>`
      )
      .join("");
    $$(".product-card").forEach((el) => {
      el.addEventListener("click", () => openProduct(el.dataset.id));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") openProduct(el.dataset.id); });
    });
  }

  // ---------- Configurator ----------
  const cfg = { product: null, color: null, size: null, design: {}, tab: "upload" };

  function openProduct(id) {
    const p = byId(id);
    cfg.product = p;
    cfg.color = p.colors[0];
    cfg.size = p.sizes[0];
    cfg.design = {};
    cfg.tab = "upload";
    cfg.textColorTouched = false;

    $("#pmTitle").textContent = p.name;
    $("#pmDesc").textContent = p.desc;
    $("#pmColors").innerHTML = p.colors
      .map((c, i) => `<button type="button" class="swatch ${i === 0 ? "active" : ""}" style="background:${c}" data-color="${c}" aria-label="Kleur ${c}"></button>`)
      .join("");
    $$("#pmColors .swatch").forEach((el) =>
      el.addEventListener("click", () => {
        cfg.color = el.dataset.color;
        $$("#pmColors .swatch").forEach((s) => s.classList.toggle("active", s === el));
        updatePreview();
      })
    );
    $("#pmSize").innerHTML = p.sizes
      .map((s) => {
        const extra = p.sizePrices && p.sizePrices[s] ? ` (+${euro(p.sizePrices[s])})` : "";
        return `<option value="${s}">${s}${extra}</option>`;
      })
      .join("");
    $("#pmText").value = "";
    $("#pmUpload").value = "";
    $("#pmUploadLabel").textContent = "Klik om een PNG, JPG of SVG te kiezen";
    $("#pmQty").value = 1;
    setTab("upload");
    updatePreview();
    openModal("#productModal");
  }

  function currentDesign() {
    if (cfg.tab === "upload" && cfg.design.img) return { img: cfg.design.img };
    if (cfg.tab === "text" && cfg.design.text) return { text: cfg.design.text, font: cfg.design.font, textColor: cfg.design.textColor };
    return null;
  }

  function updatePreview() {
    const p = cfg.product;
    $("#pmPreview").innerHTML = pgMockup(p.type, cfg.color, currentDesign());
    const qty = Math.max(1, parseInt($("#pmQty").value, 10) || 1);
    $("#pmPrice").textContent = euro(unitPrice(p, cfg.size) * qty) + (qty > 1 ? ` (${qty} × ${euro(unitPrice(p, cfg.size))})` : "");
  }

  function setTab(tab) {
    cfg.tab = tab;
    $$(".design-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    $$(".tab-panel").forEach((panel) => (panel.hidden = panel.dataset.panel !== tab));
    updatePreview();
  }

  // Verklein uploads zodat de winkelwagen in localStorage past
  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (file.type === "image/svg+xml") return resolve(reader.result);
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 800;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function bindConfigurator() {
    $$(".design-tabs .tab").forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));
    $("#pmSize").addEventListener("change", (e) => { cfg.size = e.target.value; updatePreview(); });
    $("#pmUpload").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) return toast("Bestand is te groot (max. 20 MB).");
      try {
        cfg.design.img = await readImage(file);
        $("#pmUploadLabel").textContent = "✔ " + file.name;
        updatePreview();
      } catch (err) {
        toast("Kon deze afbeelding niet lezen.");
      }
    });
    const syncText = () => {
      cfg.design.text = $("#pmText").value.trim();
      cfg.design.font = $("#pmFont").value;
      cfg.design.textColor = cfg.textColorTouched ? $("#pmTextColor").value : undefined;
      updatePreview();
    };
    ["#pmText", "#pmFont"].forEach((s) => $(s).addEventListener("input", syncText));
    $("#pmTextColor").addEventListener("input", () => { cfg.textColorTouched = true; syncText(); });
    $("#pmQty").addEventListener("input", updatePreview);
    $("#qtyMinus").addEventListener("click", () => { $("#pmQty").value = Math.max(1, ($("#pmQty").value | 0) - 1); updatePreview(); });
    $("#qtyPlus").addEventListener("click", () => { $("#pmQty").value = Math.min(999, ($("#pmQty").value | 0) + 1); updatePreview(); });

    $("#pmAdd").addEventListener("click", () => {
      const design = currentDesign();
      if (!design) {
        toast("Voeg eerst een afbeelding of tekst toe.");
        return;
      }
      const qty = Math.max(1, Math.min(999, parseInt($("#pmQty").value, 10) || 1));
      cart.push({
        key: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        id: cfg.product.id,
        color: cfg.color,
        size: cfg.size,
        qty,
        design,
      });
      saveCart();
      renderCart();
      closeModal("#productModal");
      openCart();
      toast(`${cfg.product.name} toegevoegd aan je winkelwagen`);
    });
  }

  // ---------- Winkelwagen ----------
  function totals() {
    const subtotal = cart.reduce((sum, item) => {
      const p = byId(item.id);
      return p ? sum + unitPrice(p, item.size) * item.qty : sum;
    }, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  function renderCart() {
    cart = cart.filter((item) => byId(item.id));
    const count = cart.reduce((n, i) => n + i.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartCount").classList.toggle("visible", count > 0);

    const { subtotal, shipping, total } = totals();
    $("#cartSubtotal").textContent = euro(subtotal);
    $("#cartShipping").textContent = shipping ? euro(shipping) : "Gratis";
    $("#cartTotal").textContent = euro(total);
    const remaining = FREE_SHIPPING - subtotal;
    $("#shipText").textContent = remaining > 0 ? `Nog ${euro(remaining)} tot gratis verzending` : "🎉 Je bestelling wordt gratis verzonden!";
    $("#shipFill").style.width = Math.min(100, (subtotal / FREE_SHIPPING) * 100) + "%";
    $("#checkoutBtn").disabled = cart.length === 0;

    if (!cart.length) {
      $("#cartItems").innerHTML = `<div class="cart-empty"><p>Je winkelwagen is nog leeg.</p><a href="#shop" class="btn btn-ghost" data-close-cart>Bekijk producten</a></div>`;
    } else {
      $("#cartItems").innerHTML = cart
        .map((item) => {
          const p = byId(item.id);
          return `<div class="cart-item" data-key="${item.key}">
            <div class="ci-img">${pgMockup(p.type, item.color, item.design)}</div>
            <div class="ci-body">
              <strong>${p.name}</strong>
              <span class="ci-meta"><i style="background:${item.color}"></i>${item.size}</span>
              <div class="ci-actions">
                <div class="qty small">
                  <button type="button" data-act="dec" aria-label="Minder">−</button>
                  <span>${item.qty}</span>
                  <button type="button" data-act="inc" aria-label="Meer">+</button>
                </div>
                <button type="button" class="link" data-act="del">Verwijder</button>
              </div>
            </div>
            <span class="ci-price">${euro(unitPrice(p, item.size) * item.qty)}</span>
          </div>`;
        })
        .join("");
    }
    $$("[data-close-cart]", $("#cartItems")).forEach((el) => el.addEventListener("click", closeCart));
  }

  function bindCart() {
    $("#cartBtn").addEventListener("click", openCart);
    $$("[data-close-cart]").forEach((el) => el.addEventListener("click", closeCart));
    $("#cartItems").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const key = btn.closest(".cart-item").dataset.key;
      const item = cart.find((i) => i.key === key);
      if (btn.dataset.act === "inc") item.qty = Math.min(999, item.qty + 1);
      if (btn.dataset.act === "dec") item.qty = Math.max(1, item.qty - 1);
      if (btn.dataset.act === "del") cart = cart.filter((i) => i.key !== key);
      saveCart();
      renderCart();
    });
    $("#checkoutBtn").addEventListener("click", () => {
      closeCart();
      $("#coTotal").textContent = euro(totals().total);
      openModal("#checkoutModal");
    });
    $("#checkoutForm").addEventListener("submit", (e) => {
      e.preventDefault();
      cart = [];
      saveCart();
      renderCart();
      e.target.reset();
      closeModal("#checkoutModal");
      toast("Bedankt voor je bestelling! (demo)");
    });
  }

  function openCart() { $("#cartDrawer").hidden = false; document.body.classList.add("locked"); }
  function closeCart() { $("#cartDrawer").hidden = true; document.body.classList.remove("locked"); }

  // ---------- Modals ----------
  function openModal(sel) { $(sel).hidden = false; document.body.classList.add("locked"); }
  function closeModal(sel) { $(sel).hidden = true; document.body.classList.remove("locked"); }

  function bindModals() {
    $$(".modal").forEach((m) => $$("[data-close]", m).forEach((el) => el.addEventListener("click", () => closeModal("#" + m.id))));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      $$(".modal").forEach((m) => { if (!m.hidden) closeModal("#" + m.id); });
      if (!$("#cartDrawer").hidden) closeCart();
    });
  }

  // ---------- Overig ----------
  function bindMisc() {
    $("#search").addEventListener("input", (e) => { state.search = e.target.value; renderProducts(); });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
    $("#menuBtn").addEventListener("click", () => {
      const open = $("#nav").classList.toggle("open");
      $("#menuBtn").setAttribute("aria-expanded", open);
    });
    $$("#nav a").forEach((a) => a.addEventListener("click", () => $("#nav").classList.remove("open")));
    $("#newsletterForm").addEventListener("submit", (e) => {
      e.preventDefault();
      e.target.reset();
      toast("Bedankt! Je kortingscode is onderweg.");
    });
    $("#year").textContent = new Date().getFullYear();
  }

  renderHero();
  renderCategories();
  renderFilters();
  renderProducts();
  renderCart();
  bindConfigurator();
  bindCart();
  bindModals();
  bindMisc();
})();
