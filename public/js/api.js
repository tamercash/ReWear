import { initLanguageToggle, applyI18n } from "./i18n.js";

const SETTINGS_KEY = "rewear_settings";
const TOKEN_KEY = "rewear_token";

export const API = {
  get token(){ return localStorage.getItem(TOKEN_KEY); },
  set token(v){ v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); },
  async request(path, opts={}){
    const headers = { ...(opts.headers||{}) };
    // Only set JSON headers when body is not FormData
    const isForm = (typeof FormData !== "undefined") && (opts.body instanceof FormData);
    if (!isForm && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (API.token) headers.Authorization = `Bearer ${API.token}`;
    const res = await fetch(path, { ...opts, headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json().catch(()=> ({})) : await res.text().catch(()=> "");
    if (!res.ok) {
      const msg = (data && typeof data === "object" && data.error) ? data.error : `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }
};

export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return [...root.querySelectorAll(sel)]; }


export function setActiveNav(){
  const path = location.pathname;
  document.querySelectorAll("a[data-nav]").forEach(a=>{
    const href = a.getAttribute("href") || "";
    const active = href && (path === href || (href.endsWith("index.html") && path === "/") || (href === "/" && path === "/"));
    a.classList.toggle("active", active);
  });
}

export function toast(msg){
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = String(msg || "");
  document.body.appendChild(el);
  requestAnimationFrame(()=> el.classList.add("show"));
  setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=> el.remove(), 250); }, 2200);
}

export function getSettings(){
  try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }catch{ return {}; }
}
export function setSettings(obj){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj || {}));
}

export function getTheme(){
  const s = getSettings();
  return s.theme || localStorage.getItem("rewear_theme") || "dark";
}

export function applyTheme(){
  const theme = getTheme();
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}

export const PLACEHOLDER_IMG = "/assets/items/placeholder.svg";

export function resolveImageUrl(url){
  if (!url) return PLACEHOLDER_IMG;
  const s = String(url);
  if (s.startsWith("http://") || s.startsWith("https://")) return `/api/image-proxy?url=${encodeURIComponent(s)}`;
  return s;
}

export function starsLabel(v){
  const n = Number(v);
  if (!Number.isFinite(n) || n<=0) return "—";
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return "★★★★★".slice(0, clamped) + "☆☆☆☆☆".slice(0, 5-clamped) + ` ${n.toFixed(1)}`;
}

// ---- Auth helpers ----
export async function loadMe(){
  if (!API.token) return null;
  try{
    const data = await API.request("/api/me");
    // Server may return { user: {...} } or a flat user object
    return data?.user ?? data ?? null;
  }catch(err){
    // Don't auto-logout on random 401s; just treat as not logged in.
    if (err.status === 401) return null;
    throw err;
  }
}

export async function requireAuth(){
  if (!API.token){
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `/pages/auth.html?next=${next}`;
    return null;
  }
  // Token exists; avoid forcing logout on transient /me failures.
  const me = await loadMe();
  return me || { id: null, name: "User" };
}

export function logout(){
  // Only remove our keys; never clear all storage.
  localStorage.removeItem(TOKEN_KEY);
  location.href = "/pages/auth.html";
}

export async function initLayout(){
  try{
    applyTheme();
    initLanguageToggle();
    applyI18n();
  }catch{}
  // logout button
  const btn = document.querySelector("[data-logout]");
  if (btn){
    btn.addEventListener("click", (e)=>{ e.preventDefault(); logout(); });
  }
  // user chip
  try{
    const me = await loadMe();
    const chip = document.querySelector("[data-userchip]");
    if (chip){
      chip.textContent = me ? `Hi, ${me.name}` : "Guest";
    }
    // show/hide auth-only links
    document.querySelectorAll("[data-auth-only]").forEach(el=>{
      el.style.display = me ? "" : "none";
    });
    document.querySelectorAll("[data-guest-only]").forEach(el=>{
      el.style.display = me ? "none" : "";
    });
  }catch{}
}

// Boot on all pages
if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", ()=> initLayout());
}else{
  initLayout();
}