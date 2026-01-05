import { API, $, toast, loadMe, requireAuth } from "../js/api.js";

function row(n){
  const badge = n.isRead ? `<span class="badge">Read</span>` : `<span class="badge" style="color:white;border-color:rgba(255,255,255,.2)">New</span>`;
  return `
    <div class="card card-pad">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800">${n.type.toUpperCase()}</div>
          <div class="p">${n.message}</div>
          <div class="small">${n.createdAt}</div>
        </div>
        <div class="row" style="justify-content:flex-end">
          ${badge}
          ${n.isRead ? "" : `<button class="btn" data-read="${n.id}">Mark read</button>`}
        </div>
      </div>
    </div>`;
}

(async ()=>{
  const me = await loadMe();
  if (!requireAuth(me)) return;

  const { notifications } = await API.request("/api/notifications");
  $("#notifList").innerHTML = notifications.map(row).join("") || `<div class="small">No notifications.</div>`;

  document.querySelectorAll("[data-read]").forEach(b=>{
    b.addEventListener("click", async (e)=>{
      const id = Number(e.currentTarget.dataset.read);
      try{
        await API.request(`/api/notifications/${id}/read`, { method:"POST" });
        toast("Done");
        location.reload();
      }catch(err){ toast(err.message); }
    });
  });
})().catch(e=>toast(e.message));
