import { API, $, toast, requireAuth } from "../js/api.js";

function qs(){
  const sp = new URLSearchParams(location.search);
  return Object.fromEntries(sp.entries());
}
function bubble(m, meId){
  const mine = m.fromUserId === meId;
  return `
  <div style="display:flex;justify-content:${mine?"flex-end":"flex-start"}">
    <div style="max-width:70%;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:${mine?"rgba(79,70,229,.25)":"rgba(255,255,255,.04)"}">
      <div class="small">${mine?"You":m.fromName} • ${m.createdAt}</div>
      <div>${escapeHtml(m.content)}</div>
    </div>
  </div>`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

let me = null;
let other = null;
let postId = null;

async function load(){
  const q = qs();
  other = Number(q.withUserId || 0);
  postId = q.postId ? Number(q.postId) : null;
  if (!other) throw new Error("Missing withUserId");

  const { messages } = await API.request(`/api/messages?withUserId=${other}`);
  $("#chatBox").innerHTML = messages.map(m=>bubble(m, me.id)).join("") || `<div class="small">No messages yet.</div>`;
  $("#chatWith").textContent = `With user #${other}`;
  $("#chatBox").scrollTop = $("#chatBox").scrollHeight;
}

$("#send").addEventListener("click", async ()=>{
  // Sending requires login
  if (!API.token){
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `/pages/auth.html?next=${next}`;
    return;
  }
  const content = $("#msg").value.trim();
  if (!content) return;
  try{
    await API.request("/api/messages", { method:"POST", body: JSON.stringify({ toUserId: other, content, postId }) });
    $("#msg").value="";
    await load();
  }catch(e){ toast(e.message); }
});

(async ()=>{
  me = await requireAuth();
  if (!me) return;
  await load();
})().catch(e=>toast(e.message));
