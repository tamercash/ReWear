import { $, API, PLACEHOLDER_IMG, loadMe, resolveImageUrl, starsLabel, toast } from "./api.js";
import { applyI18n } from "./i18n.js";

const CART_KEY = "rewear_cart";

function getCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
}

function addToCart(post){
  const cart = getCart();
  const id = String(post.id);
  const existing = cart.find(x => String(x.id) === id);
  if (existing) existing.qty = Number(existing.qty || 1) + 1;
  else cart.push({
    id: post.id,
    title: post.title,
    price: Number(post.price || 0),
    imageUrl: post.imageUrl,
    qty: 1,
  });
  saveCart(cart);
  toast("Added to cart");
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function formatPrice(post){
  const tt = String(post.tradeType || "").toLowerCase();
  if (tt === "free") return t("trade_free");
  if (tt === "exchange") return t("trade_exchange");
  const n = Number(post.price || 0);
  return `${n.toFixed(2)} JOD`;
}

async function submitRating(rateeId){
  const sel = $("#rateStars");
  const stars = Number(sel.value);
  try{
    await API.request(`/api/users/${rateeId}/rate`, { method:"POST", body: JSON.stringify({ stars }) });
    toast("Thanks! Rating submitted.");
    await render(); // refresh
  }catch(e){
    toast(e?.message || "Rating failed.");
  }
}

async function render(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const wrap = $("#itemWrap");
  if (!id){ wrap.innerHTML = `<div class="p">Missing item id.</div>`; return; }

  try{
    await loadMe();
  }catch{}

  try{
    const { post } = await API.request(`/api/posts/${id}`);
    const img = resolveImageUrl(post.imageUrl);
    const ratingText = starsLabel(post.sellerRating);
    const price = formatPrice(post);
    const tt = String(post.tradeType || "").toLowerCase();
    const isSale = tt === "sale";

    wrap.innerHTML = `
      <div class="grid2">
        <div>
          <img class="hero" alt="item" src="${img}" onerror="this.src='${PLACEHOLDER_IMG}'"/>
        </div>
        <div>
          <div class="h1" style="margin:0 0 6px 0">${esc(post.title)}</div>
          <div class="meta" style="margin-top:6px">
            <span class="badge">${esc(post.categoryName || "Uncategorized")}</span>
            <span class="badge">${esc(String(post.tradeType||"").toUpperCase())}</span>
            ${post.size ? `<span class="badge">Size: ${esc(post.size)}</span>` : ""}
            ${post.location ? `<span class="badge">Location: ${esc(post.location)}</span>` : ""}
            <span class="badge rating">${ratingText}</span>
            <span class="badge">Seller: ${esc(post.sellerName || "—")}</span>
          </div>

          <div class="price" style="margin:12px 0">${price}</div>

          ${isSale ? `
            <div class="row" style="gap:10px; margin:8px 0 6px 0; flex-wrap:wrap">
              <button id="addToCartBtn" class="btn">Add to cart</button>
              <button id="buyNowBtn" class="btn success">Buy</button>
            </div>
            <div class="small" style="opacity:.8">You can review your cart in the Buy page.</div>
          ` : ""}

          <div class="row" style="gap:10px; margin:10px 0 4px 0; flex-wrap:wrap">
            <button id="chatBuyerBtn" class="btn">Chat with the buyer</button>
          </div>
          <div class="small" style="opacity:.8">Open a direct chat linked to this item.</div>

          <p class="p">${esc(post.description || "")}</p>

          <div class="card" style="padding:14px; margin-top:14px">
            <div class="h2" style="margin:0 0 10px 0" data-i18n="item_rate_seller">Rate the seller</div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
              <select id="rateStars" class="input" style="max-width:140px">
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </select>
              <button id="rateBtn" class="btn">Submit</button>
              <span class="p" style="opacity:.75">Your rating updates the seller score.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const btn = $("#rateBtn");
    btn.onclick = () => submitRating(post.userId);

    if (isSale){
      const addBtn = $("#addToCartBtn");
      const buyBtn = $("#buyNowBtn");
      if (addBtn) addBtn.onclick = ()=> addToCart(post);
      if (buyBtn) buyBtn.onclick = ()=>{ addToCart(post); location.href = "/pages/buy.html"; };
    }


    // chat with seller/buyer (opens direct chat thread)
    const chatBtn = $("#chatBuyerBtn");
    if (chatBtn){
      chatBtn.onclick = ()=>{
        if (!API.token){
          toast("Please sign in to chat");
          location.href = "/pages/auth.html";
          return;
        }
        location.href = `/pages/chat.html?withUserId=${post.userId}&postId=${post.id}`;
      };
    }

    applyI18n();
  }catch(e){
    wrap.innerHTML = `<div class="p">Failed to load item.</div>`;
  }
}

render();
