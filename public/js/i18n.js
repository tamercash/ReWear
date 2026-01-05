import { $, $all } from "./api.js";

const dict = {
  en: {
    // nav
    nav_home: "Home",
    nav_browse: "Browse",
    nav_add: "Add Post",
    nav_messages: "Messages",
    nav_notifications: "Notifications",
    nav_favorites: "Favorites",
    nav_dashboard: "Dashboard",
    nav_settings: "Settings",
    nav_help: "Help",

    // menu
    menu_settings: "Settings",
    menu_change_name: "Change Name",
    menu_change_password: "Change Password",
    menu_dashboard: "Dashboard",
    menu_help: "Help",

    // settings/profile/password
    settings_title: "Settings",
    settings_language: "Preferred language",
    settings_theme: "Theme",
    theme_dark: "Dark",
    theme_light: "Light",
    btn_save: "Save",
    profile_title: "Profile",
    profile_hint: "Update your display name.",
    profile_name: "Name",
    profile_save_name: "Save Name",
    profile_saved: "Name updated",
    password_title: "Change Password",
    password_hint: "Use a strong password.",
    password_old: "Old password",
    password_new: "New password",
    password_change_btn: "Change Password",
    password_changed: "Password changed",

    // errors
    err_name_required: "Name is required",
    err_password_fields: "Fill both password fields",
    err_password_short: "Password must be at least 6 characters",
    err_generic: "Something went wrong",

    btn_signin: "Sign in",
    btn_logout: "Logout",
    lang_label: "AR",

    // common
    common_search: "Search",
    common_clear: "Clear",
    common_view: "View",

    // home
    home_trade: "Trade. Sell. Donate.",
    home_latest: "Latest posts",
    pick_group: "Choose: Men / Women / Kids",
    pick_category: "Choose a category",

    // browse
    browse_title: "Browse",
    browse_results: "Results",
    browse_all: "All",
    browse_hint: "Use filters to narrow results. Click “View” to open the Item page.",

    // add
    add_hint: "Create a post and share it with the community.",
    add_image: "Image URL",
    add_image_hint: "Tip: Use a direct image link (.jpg/.png). Some sites block hotlinking.",

    // pages hints
    msg_hint: "Start a chat by opening an item and messaging the seller.",
    notif_hint: "See updates here. New messages create notifications.",
    fav_hint: "Saved items appear here.",
    dash_hint: "Your posts and quick actions.",
    settings_hint: "Change your language and account preferences.",
    help_title: "Help & Guide",
    item_title: "Item",

    // footer
    footer_title: "ReWear",
    footer_tagline: "A modern second‑hand marketplace.",
    footer_quick: "Quick links",
    footer_social: "Social",
    footer_note: "Built for a smoother reuse experience.",

    // categories
    cat_men: "Men",
    cat_women: "Women",
    cat_kids: "Kids",
    cat_jackets: "Jackets",
    cat_shoes: "Shoes",
    cat_bags: "Bags",
    cat_accessories: "Accessories",
    cat_jeans: "Jeans",
    cat_dresses: "Dresses",

    // trade types
    trade_any: "Any",
    trade_sale: "Sale",
    trade_exchange: "Exchange",
    trade_free: "Free",
    currency_jod: "JOD",

    // rating
    rating_label: "Rating",
    rate_seller: "Rate seller"
    ,
    // favorites
    fav_remove: "Remove",
    fav_empty: "No favorites yet.",
    fav_removed: "Removed",

    // settings
    settings_saved: "Saved.",
    settings_saved_toast: "Settings saved",
    size_label: "Size",
    seller_label: "Seller",
    uncategorized: "Uncategorized"

  },
  ar: {
    // nav
    nav_home: "الرئيسية",
    nav_browse: "تصفّح",
    nav_add: "إضافة إعلان",
    nav_messages: "الرسائل",
    nav_notifications: "الإشعارات",
    nav_favorites: "المفضلة",
    nav_dashboard: "لوحة التحكم",
    nav_settings: "الإعدادات",
    nav_help: "مساعدة",

    // menu
    menu_settings: "الإعدادات",
    menu_change_name: "تغيير الاسم",
    menu_change_password: "تغيير كلمة المرور",
    menu_dashboard: "لوحة التحكم",
    menu_help: "المساعدة",

    // settings/profile/password
    settings_title: "الإعدادات",
    settings_language: "اللغة المفضلة",
    settings_theme: "المظهر",
    theme_dark: "داكن",
    theme_light: "فاتح",
    btn_save: "حفظ",
    profile_title: "الملف الشخصي",
    profile_hint: "حدّث اسم العرض الخاص بك.",
    profile_name: "الاسم",
    profile_save_name: "حفظ الاسم",
    profile_saved: "تم تحديث الاسم",
    password_title: "تغيير كلمة المرور",
    password_hint: "استخدم كلمة مرور قوية.",
    password_old: "كلمة المرور القديمة",
    password_new: "كلمة المرور الجديدة",
    password_change_btn: "تغيير كلمة المرور",
    password_changed: "تم تغيير كلمة المرور",

    // errors
    err_name_required: "الاسم مطلوب",
    err_password_fields: "عبّئ حقول كلمة المرور",
    err_password_short: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    err_generic: "حدث خطأ ما",

    btn_signin: "تسجيل دخول",
    btn_logout: "تسجيل خروج",
    lang_label: "EN",

    // common
    common_search: "بحث",
    common_clear: "مسح",
    common_view: "عرض",

    // home
    home_trade: "بدّل. بيع. تبرّع.",
    home_latest: "أحدث الإعلانات",
    pick_group: "اختر: رجالي / نسائي / أطفال",
    pick_category: "اختر التصنيف",

    // browse
    browse_title: "تصفّح",
    browse_results: "النتائج",
    browse_all: "الكل",
    browse_hint: "استخدم الفلاتر لتحديد النتائج. اضغط “عرض” لفتح صفحة الإعلان.",

    // add
    add_hint: "أنشئ إعلان وشاركه مع المجتمع.",
    add_image: "رابط الصورة",
    add_image_hint: "نصيحة: استخدم رابط مباشر للصورة (.jpg/.png). بعض المواقع تمنع عرض الصور.",

    // pages hints
    msg_hint: "ابدأ محادثة بفتح إعلان ثم مراسلة البائع.",
    notif_hint: "ستظهر التحديثات هنا. الرسائل الجديدة تنشئ إشعارات.",
    fav_hint: "العناصر المحفوظة تظهر هنا.",
    dash_hint: "إعلاناتك وإجراءات سريعة.",
    settings_hint: "غيّر اللغة وتفضيلات الحساب.",
    help_title: "المساعدة والدليل",
    item_title: "العنصر",

    // footer
    footer_title: "ReWear",
    footer_tagline: "سوق حديث للملابس المستعملة.",
    footer_quick: "روابط سريعة",
    footer_social: "روابط التواصل",
    footer_note: "لتجربة إعادة استخدام أسهل.",

    // categories
    cat_men: "رجالي",
    cat_women: "نسائي",
    cat_kids: "أطفال",
    cat_jackets: "جاكيتات",
    cat_shoes: "أحذية",
    cat_bags: "حقائب",
    cat_accessories: "إكسسوارات",
    cat_jeans: "جينز",
    cat_dresses: "فساتين",

    // trade types
    trade_any: "أي",
    trade_sale: "بيع",
    trade_exchange: "تبادل",
    trade_free: "مجاني",
    currency_jod: "د.أ",

    // rating
    rating_label: "التقييم",
    rate_seller: "قيّم البائع"
    ,
    // favorites
    fav_remove: "إزالة",
    fav_empty: "لا توجد عناصر في المفضلة بعد.",
    fav_removed: "تمت الإزالة",

    // settings
    settings_saved: "تم الحفظ.",
    settings_saved_toast: "تم حفظ الإعدادات",
    size_label: "المقاس",
    seller_label: "البائع",
    uncategorized: "بدون تصنيف"

  }
};

export function getLang(){
  // prefer explicit lang, else settings.lang, else default en
  try{
    const direct = localStorage.getItem("lang");
    if (direct) return direct;
    const s = JSON.parse(localStorage.getItem("rewear_settings")||"{}");
    if (s && s.lang) return s.lang;
  }catch{}
  return "en";
}

export function t(key, fallback=""){
  const lang = getLang();
  const table = dict[lang] || dict.en;
  return (table && table[key]) || (dict.en && dict.en[key]) || fallback || key;
}

export function tCategory(name){
  const key = "cat_" + String(name||"").toLowerCase();
  return t(key, name);
}

export function tTrade(type){
  const map = {
    any: "trade_any",
    sale: "trade_sale",
    exchange: "trade_exchange",
    free: "trade_free"
  };
  return t(map[type] || "trade_any", type);
}

function applyI18nInternal(){
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

  $all("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key, el.textContent);
  });

  $all("[data-i18n-ph]").forEach(el=>{
    const key = el.getAttribute("data-i18n-ph");
    el.setAttribute("placeholder", t(key, el.getAttribute("placeholder")||""));
  });

  const btn = document.querySelector("#langToggle");
  if (btn) btn.textContent = t("lang_label", (lang === "ar" ? "EN" : "AR"));
}

export function applyI18n(){ applyI18nInternal(); }

export function setLang(lang){
  localStorage.setItem("lang", lang);
  try{
    const s = JSON.parse(localStorage.getItem("rewear_settings")||"{}");
    s.lang = lang;
    localStorage.setItem("rewear_settings", JSON.stringify(s));
  }catch{}
  applyI18nInternal();
}

export function initLanguageToggle(){
  const btn = document.querySelector("#langToggle");
  if (!btn) return;
  btn.addEventListener("click", ()=>{
    const next = getLang() === "en" ? "ar" : "en";
    setLang(next);
  });
  applyI18nInternal();
}
