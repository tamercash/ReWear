import { API, $, toast, requireAuth } from "../js/api.js";

function item(t){
  return `
  <a class="card card-pad" href="/pages/chat.html?withUserId=${t.otherUserId}">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:900">${t.otherName}</div>
        <div class="p">${t.lastMessage || ""}</div>
      </div>
      <div class="small">${t.lastAt}</div>
    </div>
  </a>`;
}


(async ()=>{
  // Messages require login
  const me = await requireAuth();
  if (!me) return;

  const { threads } = await API.request("/api/messages/threads");
  $("#threads").innerHTML = threads.map(item).join("") || `<div class="small">No messages yet. Browse items and message a seller.</div>`;
})().catch(e=>toast(e.message));
