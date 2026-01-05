import { $, toast, applyTheme, getSettings, setSettings, API, loadMe } from "../js/api.js";
import { setLang, getLang, t } from "../js/i18n.js";

const saved = getSettings();

function init(){
  // preferences
  const langEl = $("#lang");
  const themeEl = $("#theme");
  if (langEl) langEl.value = saved.lang || getLang();
  if (themeEl) themeEl.value = saved.theme || "dark";

  $("#save")?.addEventListener("click", ()=>{
    const lang = $("#lang").value;
    const theme = $("#theme").value;
    const next = { ...saved, lang, theme };
    setSettings(next);
    setLang(lang);
    applyTheme();
    const msg = $("#msg");
    if (msg) msg.textContent = t("settings_saved","Saved.");
    toast(t("settings_saved_toast","Settings saved"));
  });

  // profile + password (requires login)
  loadMe().then(({user} = {})=>{
    if (user && $("#nameInput")) $("#nameInput").value = user.name || "";
    if (user && $("#emailInput")) $("#emailInput").value = user.email || "";
    if (user && $("#phoneInput")) $("#phoneInput").value = user.contact || "";
  }).catch(()=>{});

  $("#saveNameBtn")?.addEventListener("click", async ()=>{
    const name = ($("#nameInput")?.value || "").trim();
    if (!name) return toast(t("err_name_required","Name is required"));
    try{
      await API.request("/api/me", { method:"PUT", body: JSON.stringify({ name }) });
      toast(t("profile_saved","Name updated"));
    }catch(err){
      toast(err?.message || t("err_generic","Something went wrong"));
    }
  });

  $("#changePassBtn")?.addEventListener("click", async ()=>{
    const oldPassword = $("#oldPass")?.value || "";
    const newPassword = $("#newPass")?.value || "";
    if (!oldPassword || !newPassword) return toast(t("err_password_fields","Fill both password fields"));
    if (newPassword.length < 6) return toast(t("err_password_short","Password must be at least 6 characters"));
    try{
      await API.request("/api/me/password", { method:"PUT", body: JSON.stringify({ oldPassword, newPassword }) });
      $("#oldPass").value = "";
      $("#newPass").value = "";
      toast(t("password_changed","Password changed"));
    }catch(err){
      toast(err?.message || t("err_generic","Something went wrong"));
    }
  });
  // change email / phone
  $("#saveAccountBtn")?.addEventListener("click", async ()=>{
    const email = ($("#emailInput")?.value || "").trim();
    const contact = ($("#phoneInput")?.value || "").trim();
    const msg = $("#accountMsg");
    if (!email && !contact) return toast("Nothing to save");

    // basic email check
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return toast("Invalid email");
    }
    // phone must start with +962 and contain 9 digits after it
    if (contact && !/^\+962[0-9]{9}$/.test(contact)){
      return toast("Phone number must start with +962 and contain 9 digits after it");
    }

    try{
      if (email) await API.request("/api/me/email", { method:"PUT", body: JSON.stringify({ email }) });
      if (contact) await API.request("/api/me/contact", { method:"PUT", body: JSON.stringify({ contact }) });
      if (msg) msg.textContent = "Saved.";
      toast("Account updated");
    }catch(e){
      if (msg) msg.textContent = e.message;
      toast(e.message);
    }
  });

}

init();
