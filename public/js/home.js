import { API, $, toast, resolveImageUrl, PLACEHOLDER_IMG, starsLabel } from "./api.js";
import { t, tCategory, tTrade } from "./i18n.js";

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function priceLabel(p){
  if (p.tradeType === "free") return tTrade("free");
  if (p.tradeType === "exchange") return tTrade("exchange");
  const amt = Number(p.price||0).toFixed(2);
  return `${amt} ${t("currency_jod","JOD")}`;
}

let favIds = new Set();

async function loadFavIds(){
  if (!API.token) return;
  try{
    const { posts } = await API.request("/api/favorites");
    favIds = new Set((posts||[]).map(x=>Number(x.id)));
  }catch{ /* ignore */ }
}

function heartSvg(filled){
  return filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.4-9.9-9C.1 8.2 2.6 5 6.1 5c2 0 3.1 1.1 3.9 2 0 0 1.4-2 4-2 3.5 0 6 3.2 4 7-2.3 4.6-10 9-10 9z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.4-9.9-9C.1 8.2 2.6 5 6.1 5c2 0 3.1 1.1 3.9 2 0 0 1.4-2 4-2 3.5 0 6 3.2 4 7-2.3 4.6-10 9-10 9z"/></svg>`;
}

function card(p){
  const img = resolveImageUrl(p.imageUrl);
  const rating = starsLabel(p.sellerRating);
  const price = priceLabel(p);
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
      <div class="price">${price}</div>
      <button class="btn view-btn" data-view="${p.id}">${t("common_view","View")}</button>
    </div>
  </article>`;
}

async function loadLatest(){
  const { posts } = await API.request("/api/posts");
  const latest = (posts||[]).slice(0, 12);
  $("#latest").innerHTML = latest.map(card).join("") || `<div class="small">${t("home_no_posts","No posts yet.")}</div>`;
}

function initHomeCategoryPicker(){
  const groupSel = document.getElementById("homeGroup");
  const catSel = document.getElementById("homeCategory");
  const goBtn = document.getElementById("homeGo");
  if (!groupSel || !catSel || !goBtn) return;

  // Step 1 groups
  const groups = [
    { key: "men", label: t("cat_men","Men") },
    { key: "women", label: t("cat_women","Women") },
    { key: "kids", label: t("cat_kids","Kids") },
  ];

  // Step 2 categories per group
  const map = {
    men: ["Jackets","Jeans","Shoes","Bags","Accessories"],
    women: ["Jackets","Dresses","Jeans","Shoes","Bags","Accessories"],
    kids: ["Jackets","Shoes","Bags","Accessories"],
  };

  const fill = (sel, opts, placeholder)=>{
    sel.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    sel.appendChild(ph);
    for (const o of opts){
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      sel.appendChild(op);
    }
  };

  fill(groupSel, groups.map(g=>({ value:g.key, label:g.label })), t("pick_group","Choose: Men / Women / Kids"));
  fill(catSel, [], t("pick_category","Choose a category"));
  catSel.disabled = true;

  groupSel.addEventListener("change", ()=>{
    const g = groupSel.value;
    const cats = (map[g] || []).map(name=>({ value:name, label:tCategory(name) }));
    fill(catSel, cats, t("pick_category","Choose a category"));
    catSel.disabled = !g;
  });

  goBtn.addEventListener("click", ()=>{
    const g = groupSel.value;
    const c = catSel.value;
    if (!g) return toast(t("pick_group","Choose: Men / Women / Kids"));
    if (!c) return toast(t("pick_category","Choose a category"));
    // Filter by category on browse page
    location.href = `/pages/browse.html?category=${encodeURIComponent(c)}&group=${encodeURIComponent(g)}`;
  });
}

async function boot(){
  await loadFavIds();
  await loadLatest();
  initHomeCategoryPicker();

  $("#latest").addEventListener("click", async (e)=>{
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn){
      if (!API.token){
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `/pages/auth.html?next=${next}`;
        return;
      }
      const id = Number(favBtn.dataset.fav);
      try{
        const r = await API.request(`/api/favorites/${id}`, { method:"POST" });
        if (r.favorited) favIds.add(id); else favIds.delete(id);
        await loadLatest();
      }catch(err){ toast(err.message); }
      return;
    }
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn){
      location.href = `/pages/item.html?id=${Number(viewBtn.dataset.view)}`;
    }
  });
}

boot().catch(e=>toast(e.message));
