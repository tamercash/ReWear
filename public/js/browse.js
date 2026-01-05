import { API, $, toast, loadMe, requireAuth, resolveImageUrl, PLACEHOLDER_IMG, starsLabel } from "../js/api.js";
import { t, tCategory, tTrade } from "../js/i18n.js";

let me = null;
let favIds = new Set();

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function priceLabel(p){
  if (p.tradeType === "free") return tTrade("free");
  if (p.tradeType === "exchange") return tTrade("exchange");
  const amt = Number(p.price||0).toFixed(2);
  return `${amt} ${t("currency_jod","JOD")}`;
}

function heartSvg(filled){
  return filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.4-9.9-9C.1 8.2 2.6 5 6.1 5c2 0 3.1 1.1 3.9 2 0 0 1.4-2 4-2 3.5 0 6 3.2 4 7-2.3 4.6-10 9-10 9z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.4-9.9-9C.1 8.2 2.6 5 6.1 5c2 0 3.1 1.1 3.9 2 0 0 1.4-2 4-2 3.5 0 6 3.2 4 7-2.3 4.6-10 9-10 9z"/></svg>`;
}

function card(p){
  const img = resolveImageUrl(p.imageUrl);
  const rating = starsLabel(p.sellerRating);
  const cat = p.categoryName ? tCategory(p.categoryName) : t("uncategorized","Uncategorized");
  const trade = tTrade(p.tradeType);
  const fav = favIds.has(Number(p.id));
  return `
  <article class="card product" data-id="${p.id}">
    <img alt="item" src="${img}" onerror="this.src='${PLACEHOLDER_IMG}'"/>
    <div>
      <p class="title">${escapeHtml(p.title)}</p>
      <div class="meta">
        <span class="badge">${cat}</span>
        <span class="badge">${trade}</span>
        ${p.size ? `<span class="badge">${t("size_label","Size")}: ${escapeHtml(p.size)}</span>` : ""}
        <span class="badge rating">${rating}</span>
        <span class="badge">${t("seller_label","Seller")}: ${escapeHtml(p.sellerName)}</span>
      </div>
      <p class="p">${escapeHtml(p.description || "").slice(0,120)}${(p.description||"").length>120?"…":""}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;justify-content:space-between">
      <button class="icon-btn fav-btn ${fav?"on":""}" title="${t("nav_favorites","Favorites")}" data-fav="${p.id}">
        ${heartSvg(fav)}
      </button>
      <div class="price">${priceLabel(p)}</div>
      <button class="btn view-btn" data-view="${p.id}">${t("common_view","View")}</button>
    </div>
  </article>`;
}

async function loadFavIds(){
  favIds = new Set();
  if (!API.token) return;
  try{
    const { posts } = await API.request("/api/favorites");
    favIds = new Set((posts||[]).map(x=>Number(x.id)));
  }catch{}
}

async function loadCategories(){
  const { categories } = await API.request("/api/categories");
  const opts = categories.map(c => `<option value="${c.id}">${tCategory(c.name)}</option>`).join("");
  $("#categoryId").innerHTML = `<option value="">${t("browse_all","All")}</option>` + opts;

  // If user came from Home quick filter (?category=Jackets)
  const url = new URL(location.href);
  const catName = url.searchParams.get("category");
  if (catName){
    const match = (categories||[]).find(c => String(c.name).toLowerCase() === String(catName).toLowerCase());
    if (match) $("#categoryId").value = String(match.id);
  }
}

async function search(){
  const params = new URLSearchParams();
  const q = $("#q").value.trim();
  const categoryId = $("#categoryId").value;
  const tradeType = $("#tradeType").value;
  const size = $("#size").value.trim();
  const locationTxt = $("#location").value.trim();

  if (q) params.set("q", q);
  if (categoryId) params.set("categoryId", categoryId);
  if (tradeType) params.set("tradeType", tradeType);
  if (size) params.set("size", size);
  if (locationTxt) params.set("location", locationTxt);

  const { posts } = await API.request(`/api/posts?${params.toString()}`);
  $("#results").innerHTML = (posts||[]).map(card).join("") || `<div class="small">${t("browse_no_matches","No matches.")}</div>`;
}

function bind(){
  // IDs in browse.html are btnSearch / btnClear
  $("#btnSearch").addEventListener("click", search);
  $("#btnClear").addEventListener("click", ()=>{
    $("#q").value=""; $("#categoryId").value=""; $("#tradeType").value=""; $("#size").value=""; $("#location").value="";
    search();
  });

  $("#results").addEventListener("click", async (e)=>{
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn){
      // Favorites require login
      if (!API.token){
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `/pages/auth.html?next=${next}`;
        return;
      }
      const id = Number(favBtn.dataset.fav);
      try{
        const r = await API.request(`/api/favorites/${id}`, { method:"POST" });
        if (r.favorited) favIds.add(id); else favIds.delete(id);
        await search();
      }catch(err){ toast(err.message); }
      return;
    }
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn){
      location.href = `/pages/item.html?id=${Number(viewBtn.dataset.view)}`;
    }
  });
}

(async ()=>{
  // Browse should work for guests too
  me = await loadMe();
  await loadFavIds();
  await loadCategories();
  bind();
  await search();
})().catch(e=>toast(e.message));
