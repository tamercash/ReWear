import { API, $, toast, requireAuth, resolveImageUrl, PLACEHOLDER_IMG, starsLabel } from "../js/api.js";
import { t, tCategory, tTrade } from "../js/i18n.js";

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function priceLabel(p){
  if (p.tradeType === "free") return tTrade("free");
  if (p.tradeType === "exchange") return tTrade("exchange");
  return `${Number(p.price||0).toFixed(2)} ${t("currency_jod","JOD")}`;
}
function card(p){
  const img = resolveImageUrl(p.imageUrl);
  const cat = p.categoryName ? tCategory(p.categoryName) : t("uncategorized","Uncategorized");
  const trade = tTrade(p.tradeType);
  const rating = starsLabel(p.sellerRating);
  return `
  <article class="card product">
    <img alt="item" src="${img}" onerror="this.src='${PLACEHOLDER_IMG}'"/>
    <div>
      <p class="title">${escapeHtml(p.title)}</p>
      <div class="meta">
        <span class="badge">${cat}</span>
        <span class="badge">${trade}</span>
        <span class="badge rating">${rating}</span>
        <span class="badge">${t("seller_label","Seller")}: ${escapeHtml(p.sellerName)}</span>
      </div>
      <p class="p">${escapeHtml(p.description || "").slice(0,120)}${(p.description||"").length>120?"…":""}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;justify-content:space-between">
      <div class="price">${priceLabel(p)}</div>
      <button class="btn" data-view="${p.id}">${t("common_view","View")}</button>
      <button class="btn ghost" data-unfav="${p.id}">${t("fav_remove","Remove")}</button>
    </div>
  </article>`;
}

(async ()=>{
  // Favorites require login
  const me = await requireAuth();
  if (!me) return;

  const { posts } = await API.request("/api/favorites");
  $("#favList").innerHTML = (posts||[]).map(card).join("") || `<div class="small">${t("fav_empty","No favorites yet.")}</div>`;

  $("#favList").addEventListener("click", async (e)=>{
    const v = e.target.closest("[data-view]");
    if (v){
      location.href = `/pages/item.html?id=${Number(v.dataset.view)}`;
      return;
    }
    const b = e.target.closest("[data-unfav]");
    if (b){
      const id = Number(b.dataset.unfav);
      try{
        await API.request(`/api/favorites/${id}`, { method:"POST" });
        toast(t("fav_removed","Removed"));
        location.reload();
      }catch(err){ toast(err.message); }
    }
  });
})().catch(e=>toast(e.message));
