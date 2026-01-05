import { $, resolveImageUrl, PLACEHOLDER_IMG, toast } from "./api.js";

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

function money(n){
  const v = Number(n || 0);
  return `${v.toFixed(2)} JOD`;
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

function render(){
  const wrap = $("#cartWrap");
  const sum = $("#cartSummary");
  const cart = getCart();

  if (!wrap || !sum) return;

  if (!cart.length){
    wrap.innerHTML = `<div class="p" style="opacity:.85">Your cart is empty.</div>`;
    sum.innerHTML = `<a class="btn primary" href="/pages/browse.html">Browse items</a>`;
    return;
  }

  wrap.innerHTML = cart.map(item => {
    const img = resolveImageUrl(item.imageUrl);
    const qty = Math.max(1, Number(item.qty || 1));
    const line = Number(item.price || 0) * qty;
    return `
      <div class="card" style="padding:12px; margin:10px 0">
        <div style="display:flex; gap:12px; align-items:center">
          <img src="${img}" alt="item" style="width:74px; height:74px; object-fit:cover; border-radius:12px" onerror="this.src='${PLACEHOLDER_IMG}'"/>
          <div style="flex:1; min-width:0">
            <div class="h2" style="margin:0 0 6px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(item.title || "Item")}</div>
            <div class="small" style="opacity:.85">${money(item.price)} × ${qty} = <b>${money(line)}</b></div>
            <div style="display:flex; gap:10px; align-items:center; margin-top:10px; flex-wrap:wrap">
              <label class="small" style="opacity:.85">Qty</label>
              <input class="input" type="number" min="1" value="${qty}" data-qty="${esc(item.id)}" style="width:90px"/>
              <button class="btn danger" data-remove="${esc(item.id)}" type="button">Remove</button>
              <a class="btn" href="/pages/item.html?id=${encodeURIComponent(item.id)}">View</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const total = cart.reduce((acc, x)=> acc + (Number(x.price||0) * Math.max(1, Number(x.qty||1))), 0);
  sum.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px">
      <div class="h2" style="margin:0">Total: ${money(total)}</div>
      <div class="row" style="gap:10px; flex-wrap:wrap">
        <button id="clearCart" class="btn" type="button">Clear cart</button>
        <button id="checkout" class="btn success" type="button">Buy</button>
      </div>
    </div>
  `;

  // qty updates
  wrap.querySelectorAll("input[data-qty]").forEach(inp => {
    inp.addEventListener("change", ()=>{
      const id = inp.getAttribute("data-qty");
      const next = Math.max(1, Number(inp.value || 1));
      const c = getCart();
      const it = c.find(x => String(x.id) === String(id));
      if (it){ it.qty = next; saveCart(c); render(); }
    });
  });

  // remove
  wrap.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-remove");
      const c = getCart().filter(x => String(x.id) !== String(id));
      saveCart(c);
      render();
    });
  });

  const clearBtn = $("#clearCart");
  if (clearBtn) clearBtn.onclick = ()=>{ saveCart([]); render(); };

  const checkoutBtn = $("#checkout");
  if (checkoutBtn) checkoutBtn.onclick = ()=>{
    toast("Purchase placed (demo)");
    saveCart([]);
    render();
  };
}

render();
