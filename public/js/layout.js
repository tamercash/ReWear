import { $, $all, loadMe, setActiveNav, API, toast } from "./api.js";
import { initLanguageToggle, applyI18n } from "./i18n.js";

function iconSvg(name){
  const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    home: `<svg viewBox="0 0 24 24" ${common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>`,
    browse: `<svg viewBox="0 0 24 24" ${common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
    add: `<svg viewBox="0 0 24 24" ${common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
    messages: `<svg viewBox="0 0 24 24" ${common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`,
    notifications: `<svg viewBox="0 0 24 24" ${common}><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M9.5 21a2.5 2.5 0 0 0 5 0"/></svg>`,
    favorites: `<svg viewBox="0 0 24 24" ${common}><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z"/></svg>`,
    dashboard: `<svg viewBox="0 0 24 24" ${common}><path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v6h-8z"/><path d="M3 17h8v4H3z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" ${common}><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3H9l-.3 2.4a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1L9 21h6l.3-2.4a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z"/></svg>`,
    help: `<svg viewBox="0 0 24 24" ${common}><path d="M12 18h.01"/><path d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.7-1.9 1.2-1.9 2.6v.5"/><circle cx="12" cy="12" r="10"/></svg>`,
  };
  return icons[name] || '';
}

function decorateNav(){
  const links = $all('.nav-links a[data-nav]');
  links.forEach(a=>{
    if (a.querySelector('.nav-ic')) return;
    const href = (a.getAttribute('href')||'').toLowerCase();
    let key = 'help';
    if (href === '/' || href.endsWith('/index.html')) key = 'home';
    else if (href.includes('browse')) key = 'browse';
    else if (href.includes('add-post')) key = 'add';
    else if (href.includes('messages')) key = 'messages';
    else if (href.includes('notifications')) key = 'notifications';
    else if (href.includes('favorites')) key = 'favorites';
    else if (href.includes('dashboard')) key = 'dashboard';
    else if (href.includes('settings')) key = 'settings';
    else if (href.includes('help')) key = 'help';

    const span = document.createElement('span');
    span.className = 'nav-ic';
    span.innerHTML = iconSvg(key);
    a.prepend(span);
  });
}



function initSettingsDropdown(){
  const dd = $("#settingsDropdown");
  const btn = $("#settingsBtn");
  const menu = $("#settingsMenu");
  if (!dd || !btn || !menu) return;

  const close = ()=>{
    dd.classList.remove("open");
    menu.setAttribute("aria-hidden","true");
  };

  btn.addEventListener("click",(e)=>{
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dd.classList.toggle("open");
    menu.setAttribute("aria-hidden", String(!isOpen));
  });

  document.addEventListener("click", close);
  document.addEventListener("keydown",(e)=>{
    if (e.key === "Escape") close();
  });
}

export async function initLayout(){
  initLanguageToggle();
  applyI18n();
  initSettingsDropdown();
  const user = await loadMe();
  setActiveNav();
  decorateNav();

  // user badge
  const userEl = $("#navUser");
  const loginBtn = $("#btnLogin");
  const logoutBtn = $("#btnLogout");

  if (userEl) userEl.textContent = user ? `Hi, ${user.name || user.email || "User"}` : "Guest";
  if (loginBtn) loginBtn.style.display = user ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = user ? "inline-flex" : "none";

  if (logoutBtn) {
    logoutBtn.addEventListener("click", ()=>{
      API.token = null;
      toast("Logged out");
      location.href="/";
    });
  }

  // notifications badge
  const badge = $("#notifBadge");
  if (badge && user){
    try{
      const { notifications } = await API.request("/api/notifications");
      const unread = notifications.filter(n=>!n.isRead).length;
      badge.textContent = unread ? String(unread) : "";
      badge.style.display = unread ? "inline-flex" : "none";
    }catch{}
  }

  return user;
}
