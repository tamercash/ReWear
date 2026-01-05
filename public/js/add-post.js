import { $, API, PLACEHOLDER_IMG, loadMe, requireAuth, resolveImageUrl, toast } from "../js/api.js";
import { t, tCategory } from "../js/i18n.js";

let me = null;

async function loadCategories(){
  const { categories } = await API.request("/api/categories");
  $("#categoryId").innerHTML = `<option value="">Select</option>` + categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}

$("#btnCreate").addEventListener("click", async ()=>{
  if (!requireAuth(me)) return;
  try{
    const payload = {
      title: $("#title").value.trim(),
      imageUrl: $("#imageUrl").value.trim(),
      categoryId: $("#categoryId").value || null,
      tradeType: $("#tradeType").value,
      price: Number($("#price").value || 0),
      size: $("#size").value.trim(),
      condition: $("#condition").value.trim(),
      location: $("#location").value.trim(),
      description: $("#description").value.trim(),
    };
    const { post } = await API.request("/api/posts", { method:"POST", body: JSON.stringify(payload) });
    toast("Post created");
    location.href = `/pages/browse.html?post=${post.id}`;
  }catch(e){
    $("#msg").textContent = e.message;
  }
});

(async ()=>{
  me = await loadMe();
  requireAuth(me);
  await loadCategories();
})().catch(e=>toast(e.message));
