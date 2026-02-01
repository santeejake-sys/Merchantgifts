/* MerchantGifts — modern static store (GitHub Pages)
   - Edit PRODUCTS below to add your items
   - Cart persists with localStorage
*/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/** =========================
 *  1) ADD YOUR PRODUCTS HERE
 *  =========================
 *  Images:
 *    - You can use full URLs (recommended), OR
 *    - Put images in /assets and reference like "./assets/item1.jpg"
 */
const PRODUCTS = [
  {
    id: "mg-aurora-candle",
    name: "Aurora Soy Candle",
    price: 24.00,
    category: "Home",
    description: "Clean burn, subtle scent. Minimal label, gift-ready jar.",
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    badge: "Best seller",
    inventory: "in"
  },
  {
    id: "mg-leather-card",
    name: "Leather Card Holder",
    price: 32.00,
    category: "Accessories",
    description: "Slim profile, premium feel. Perfect everyday carry gift.",
    image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    badge: "Featured",
    inventory: "in"
  },
  {
    id: "mg-ceramic-mug",
    name: "Studio Ceramic Mug",
    price: 28.00,
    category: "Home",
    description: "Handmade look with a clean silhouette. Morning upgrade.",
    image: "https://images.unsplash.com/photo-1523906630133-f6934a1ab2b9?auto=format&fit=crop&w=1200&q=80",
    featured: false,
    badge: "New",
    inventory: "in"
  },
  {
    id: "mg-mini-speaker",
    name: "Mini Bluetooth Speaker",
    price: 39.00,
    category: "Tech",
    description: "Small, loud, and aesthetic. Great desk or travel gift.",
    image: "https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1200&q=80",
    featured: false,
    badge: "Giftable",
    inventory: "in"
  },
  {
    id: "mg-gift-box",
    name: "Premium Gift Box",
    price: 12.00,
    category: "Packaging",
    description: "Elevate any order. Matte finish with clean lines.",
    image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80",
    featured: false,
    badge: "Add-on",
    inventory: "in"
  }
];

// Optional: Set this to a real checkout link later (Stripe Payment Link, Shopify, etc.)
const CHECKOUT_URL = ""; // e.g. "https://buy.stripe.com/xxxx"

/** =========================
 *  STATE
 *  ========================= */
const state = {
  query: "",
  category: "all",
  sort: "featured",
  cart: loadCart(), // { [productId]: qty }
  theme: loadTheme()
};

/** =========================
 *  ELEMENTS
 *  ========================= */
const productGrid = $("#productGrid");
const categorySelect = $("#categorySelect");
const sortSelect = $("#sortSelect");
const searchInput = $("#searchInput");
const emptyState = $("#emptyState");

const productModal = $("#productModal");
const modalBody = $("#modalBody");

const cartDrawer = $("#cartDrawer");
const cartItems = $("#cartItems");
const cartCount = $("#cartCount");
const cartSub = $("#cartSub");
const cartSubtotal = $("#cartSubtotal");
const cartTax = $("#cartTax");
const cartTotal = $("#cartTotal");
const cartDot = $("#cartDot");

const topbarProgress = $("#topbarProgress");

/** =========================
 *  INIT
 *  ========================= */
boot();

function boot(){
  // Footer year
  $("#year").textContent = new Date().getFullYear();

  // Theme
  applyTheme(state.theme);

  // Populate categories
  const cats = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  categorySelect.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c === "all" ? "All categories" : c)}</option>`).join("");
  categorySelect.value = state.category;

  // Wire events
  wireEvents();

  // Render
  renderAll();

  // Cosmetic top progress
  fakeProgress();
}

function wireEvents(){
  $("#scrollToShop").addEventListener("click", () => document.querySelector("#shop").scrollIntoView({behavior:"smooth"}));
  $("#viewFeatured").addEventListener("click", () => {
    state.sort = "featured";
    sortSelect.value = "featured";
    state.query = "";
    searchInput.value = "";
    state.category = "all";
    categorySelect.value = "all";
    renderProducts();
  });

  $("#clearFilters").addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.sort = "featured";
    searchInput.value = "";
    categorySelect.value = "all";
    sortSelect.value = "featured";
    renderProducts();
  });

  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  categorySelect.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderProducts();
  });

  sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProducts();
  });

  // Modal close
  productModal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      closeModal();
      closeCart();
    }
  });
  // Cart open/close
  $("#openCart").addEventListener("click", openCart);
  cartDrawer.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-cart]")) closeCart();
  });
  $$("[data-close-cart]").forEach(btn => btn.addEventListener("click", closeCart));

  // Buttons
  $("#clearCartBtn").addEventListener("click", () => {
    state.cart = {};
    persistCart();
    renderCart();
  });

  $("#checkoutBtn").addEventListener("click", handleCheckout);
  $("#demoCheckout").addEventListener("click", handleCheckout);

  $("#copyStoreLink").addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(window.location.href);
      toast("Copied store link ✨");
    }catch{
      toast("Copy failed — your browser blocked it.");
    }
  });

  $("#themeToggle").addEventListener("click", () => {
    state.theme = (state.theme === "light") ? "dark" : "light";
    persistTheme();
    applyTheme(state.theme);
    toast(`Theme: ${state.theme}`);
  });
}

/** =========================
 *  RENDER
 *  ========================= */
function renderAll(){
  renderProducts();
  renderCart();
}

function renderProducts(){
  let list = [...PRODUCTS];

  // Filter by category
  if (state.category !== "all"){
    list = list.filter(p => p.category === state.category);
  }

  // Search
  if (state.query){
    list = list.filter(p => (
      p.name.toLowerCase().includes(state.query) ||
      p.description.toLowerCase().includes(state.query) ||
      p.category.toLowerCase().includes(state.query)
    ));
  }

  // Sort
  list = sortProducts(list, state.sort);

  // Render
  productGrid.innerHTML = list.map(p => productCard(p)).join("");

  // Empty state
  emptyState.hidden = list.length !== 0;

  // Add click handlers
  $$(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const p = PRODUCTS.find(x => x.id === id);
      if (p) openProduct(p);
    });
  });
}

function renderCart(){
  const entries = Object.entries(state.cart);
  const count = entries.reduce((sum, [,qty]) => sum + qty, 0);

  cartCount.textContent = String(count);
  cartSub.textContent = `${count} item${count === 1 ? "" : "s"}`;
  cartDot.style.display = count > 0 ? "block" : "none";

  if (entries.length === 0){
    cartItems.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Your cart is empty</div>
        <div class="empty-sub">Add a product to get started.</div>
      </div>
    `;
    cartSubtotal.textContent = "$0";
    cartTax.textContent = "$0";
    cartTotal.textContent = "$0";
    return;
  }

  const lines = entries.map(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return null;
    return { p, qty, lineTotal: p.price * qty };
  }).filter(Boolean);

  cartItems.innerHTML = lines.map(({p, qty}) => cartItemRow(p, qty)).join("");

  // Wire qty buttons
  $$(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (!id || !action) return;

      if (action === "inc") addToCart(id, 1);
      if (action === "dec") addToCart(id, -1);
      if (action === "remove") removeFromCart(id);

      renderCart();
    });
  });

  // Totals
  const subtotal = lines.reduce((s, x) => s + x.lineTotal, 0);
  const tax = subtotal * 0.07; // change or set 0 if you want
  const total = subtotal + tax;

  cartSubtotal.textContent = money(subtotal);
  cartTax.textContent = money(tax);
  cartTotal.textContent = money(total);
}

/** =========================
 *  PRODUCT MODAL
 *  ========================= */
function openProduct(p){
  modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-media">
        <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy" />
      </div>

      <div class="modal-info">
        <div class="pill-mini">${escapeHtml(p.category)}</div>
        <div class="modal-title">${escapeHtml(p.name)}</div>
        <div class="price">${money(p.price)}</div>
        <div class="muted">${escapeHtml(p.description)}</div>
        <div class="hr"></div>
        <div class="modal-actions">
          <button class="btn primary" id="modalAdd">Add to cart</button>
          <button class="btn ghost" id="modalClose">Close</button>
        </div>
        <div class="tiny muted">
          Status: <span class="strong">${p.inventory === "in" ? "In stock" : "Sold out"}</span>
        </div>
      </div>
    </div>
  `;

  $("#modalAdd").addEventListener("click", () => {
    if (p.inventory !== "in"){
      toast("This item is sold out.");
      return;
    }
    addToCart(p.id, 1);
    renderCart();
    openCart();
    closeModal();
    toast("Added to cart ✅");
  });

  $("#modalClose").addEventListener("click", closeModal);

  productModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(){
  productModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/** =========================
 *  CART
 *  ========================= */
function openCart(){
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeCart(){
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function addToCart(id, delta){
  const cur = state.cart[id] ?? 0;
  const next = cur + delta;
  if (next <= 0){
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  persistCart();
}
function removeFromCart(id){
  delete state.cart[id];
  persistCart();
}

/** =========================
 *  CHECKOUT (static demo)
 *  ========================= */
function handleCheckout(){
  const entries = Object.entries(state.cart);
  if (entries.length === 0){
    toast("Your cart is empty.");
    return;
  }

  // If you set a real checkout link, go there:
  if (CHECKOUT_URL){
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Otherwise generate a simple order summary:
  const lines = entries.map(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === id);
    return p ? `• ${p.name} x${qty} — ${money(p.price * qty)}` : null;
  }).filter(Boolean);

  const subtotal = entries.reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find(x => x.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const summary =
`MerchantGifts Order
${lines.join("\n")}
Subtotal: ${money(subtotal)}
Tax (est): ${money(tax)}
Total: ${money(total)}

Name:
Address:
Phone:
Notes:`;

  // Copy to clipboard for DM checkout
  navigator.clipboard.writeText(summary)
    .then(() => toast("Checkout summary copied — paste into DMs ✅"))
    .catch(() => toast("Couldn’t copy. Your browser blocked it."));

  // Also show a quick modal view
  openQuickModal("Checkout summary", `<pre class="order-pre">${escapeHtml(summary)}</pre>`);
}

function openQuickModal(title, html){
  modalBody.innerHTML = `
    <div class="glass" style="margin: 4px;">
      <div class="modal-title">${escapeHtml(title)}</div>
      <div class="muted" style="margin-top:6px;">Copied to clipboard (if allowed). You can paste this into messages.</div>
      <div class="hr"></div>
      ${html}
      <div class="modal-actions" style="margin-top:12px;">
        <button class="btn primary" id="modalClose2">Close</button>
      </div>
    </div>
  `;
  $("#modalClose2").addEventListener("click", closeModal);
  productModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/** =========================
 *  TEMPLATES
 *  ========================= */
function productCard(p){
  const badge = p.badge ? `<div class="tag">${escapeHtml(p.badge)}</div>` : "";
  const out = p.inventory !== "in";
  const statusPill = out ? `<span class="pill-mini" style="border-color: rgba(255,77,109,.25); color: rgba(255,77,109,.95);">Sold out</span>` : `<span class="pill-mini">Tap for details</span>`;

  return `
    <article class="card" data-id="${escapeAttr(p.id)}" tabindex="0" role="button" aria-label="Open ${escapeAttr(p.name)}">
      <div class="card-media">
        ${badge}
        <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy" />
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.description)}</div>
        <div class="card-row">
          <div class="price">${money(p.price)}</div>
          ${statusPill}
        </div>
      </div>
    </article>
  `;
}

function cartItemRow(p, qty){
  return `
    <div class="cart-item">
      <div class="cart-thumb">
        <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy" />
      </div>
      <div class="cart-meta">
        <div class="cart-meta-top">
          <div class="cart-name">${escapeHtml(p.name)}</div>
          <div class="cart-price">${money(p.price * qty)}</div>
        </div>
        <div class="muted tiny">${escapeHtml(p.category)}</div>
        <div class="qty">
          <div class="qty-controls">
            <button class="qty-btn" data-id="${escapeAttr(p.id)}" data-action="dec" aria-label="Decrease quantity">−</button>
            <div class="strong">${qty}</div>
            <button class="qty-btn" data-id="${escapeAttr(p.id)}" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
          <button class="qty-btn remove" data-id="${escapeAttr(p.id)}" data-action="remove">Remove</button>
        </div>
      </div>
    </div>
  `;
}

function sortProducts(list, mode){
  switch(mode){
    case "priceAsc":
      return list.sort((a,b) => a.price - b.price);
    case "priceDesc":
      return list.sort((a,b) => b.price - a.price);
    case "nameAsc":
      return list.sort((a,b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      // featured first, then by name
      return list.sort((a,b) => (b.featured === true) - (a.featured === true) || a.name.localeCompare(b.name));
  }
}

/** =========================
 *  STORAGE
 *  ========================= */
function loadCart(){
  try{
    return JSON.parse(localStorage.getItem("mg_cart") || "{}") || {};
  }catch{
    return {};
  }
}
function persistCart(){
  localStorage.setItem("mg_cart", JSON.stringify(state.cart));
}
function loadTheme(){
  const saved = localStorage.getItem("mg_theme");
  if (saved === "light" || saved === "dark") return saved;
  // Prefer system
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}
function persistTheme(){
  localStorage.setItem("mg_theme", state.theme);
}
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
}

/** =========================
 *  HELPERS
 *  ========================= */
function money(n){
  return new Intl.NumberFormat(undefined, { style:"currency", currency:"USD" }).format(n);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){
  return escapeHtml(str).replaceAll("`","&#096;");
}

// Tiny toast (no library)
let toastTimer = null;
function toast(msg){
  let el = $("#toast");
  if (!el){
    el = document.createElement("div");
    el.id = "toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "12px 14px";
    el.style.borderRadius = "16px";
    el.style.border = "1px solid var(--line)";
    el.style.background = "rgba(255,255,255,.10)";
    el.style.backdropFilter = "blur(10px)";
    el.style.boxShadow = "var(--shadow)";
    el.style.zIndex = "99999";
    el.style.fontWeight = "800";
    el.style.letterSpacing = "-0.02em";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2200);
}

// Cosmetic progress bar
function fakeProgress(){
  topbarProgress.style.width = "10%";
  setTimeout(() => topbarProgress.style.width = "65%", 120);
  setTimeout(() => topbarProgress.style.width = "92%", 260);
  setTimeout(() => topbarProgress.style.width = "100%", 420);
  setTimeout(() => topbarProgress.style.width = "0%", 900);
}
