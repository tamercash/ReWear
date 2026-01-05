import { API, $, toast, loadMe, requireAuth } from "../js/api.js";

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function priceLabel(p){
  if (p.tradeType === "free") return "Free";
  if (p.tradeType === "exchange") return "Exchange";
  return `${Number(p.price||0).toFixed(2)} JOD`;
}
function card(p){
  const img = resolveImageUrl(p.imageUrl);
  return `
  <article class="card product">
    <img alt="item" src="${img}" onerror="this.src='${PLACEHOLDER_IMG}'"/>
    <div>
      <p class="title">${escapeHtml(p.title)}</p>
      <div class="meta">
        <span class="badge">${p.categoryName || "Uncategorized"}</span>
        <span class="badge">${p.tradeType.toUpperCase()}</span>
        <span class="badge">${priceLabel(p)}</span>
      </div>
      <p class="small">Created: ${p.createdAt}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;justify-content:space-between">
      <a class="btn" href="/pages/browse.html?post=${p.id}">View</a>
    </div>
  </article>`;
}

(async ()=>{
  const me = await loadMe();
  if (!requireAuth(me)) return;

  const { posts } = await API.request(`/api/posts?userId=${me.id}`);
  $("#myPosts").innerHTML = posts.map(card).join("") || `<div class="small">No posts yet.</div>`;

  $("#btnRate").addEventListener("click", async ()=>{
    try{
      const payload = {
        rateeId: Number($("#rateeId").value),
        stars: Number($("#stars").value),
        comment: $("#comment").value.trim()
      };
      await API.request("/api/ratings", { method:"POST", body: JSON.stringify(payload) });
      $("#rateMsg").textContent = "Saved.";
      toast("Rating submitted");
    }catch(e){
      $("#rateMsg").textContent = e.message;
    }
  });
})().catch(e=>toast(e.message));
