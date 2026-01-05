import { API, $, toast } from "../js/api.js";

$("#btnLogin")?.addEventListener("click", async (e)=>{ e?.preventDefault?.();
  try{
    const email = $("#liEmail").value.trim();
    const password = $("#liPass").value;
    const { token } = await API.request("/api/auth/login", { method:"POST", body: JSON.stringify({ email, password }) });
    API.token = token;
    toast("Welcome back");
    location.href="/";
  }catch(e){
    $("#liMsg").textContent = e.message;
  }
});

$("#btnSignup")?.addEventListener("click", async (e)=>{ e?.preventDefault?.();
  try{
    const password = $("#suPass").value;
    const confirmPassword = $("#suPass2").value;
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const phone = $("#suContact").value.trim();
    // Must start with +962 and contain digits only (Jordan country code)
    const phoneRe = /^\+962[0-9]{9}$/;
    if (!phoneRe.test(phone)) {
      throw new Error("Phone number must start with +962 and contain 9 digits after it");
    }

    const payload = {
      name: $("#suName").value.trim(),
      location: $("#suLocation").value.trim(),
      email: $("#suEmail").value.trim(),
      password,
      contact: phone
    };
    const { token } = await API.request("/api/auth/signup", { method:"POST", body: JSON.stringify(payload) });
    API.token = token;
    toast("Account created");
    location.href="/";
  }catch(e){
    $("#suMsg").textContent = e.message;
  }
});


// Forgot password (simple reset for demo)
$("#btnForgot")?.addEventListener("click", async (e)=>{ e?.preventDefault?.();
  const msg = $("#fpMsg");
  try{
    const email = ($("#fpEmail")?.value || "").trim();
    const p1 = $("#fpPass")?.value || "";
    const p2 = $("#fpPass2")?.value || "";
    if (!email) throw new Error("Email is required");
    if (p1.length < 6) throw new Error("Password must be at least 6 characters");
    if (p1 !== p2) throw new Error("Passwords do not match");
    await API.request("/api/auth/reset-password", { method:"POST", body: JSON.stringify({ email, newPassword: p1 }) });
    if (msg) msg.textContent = "Password updated. You can sign in now.";
    toast("Password updated");
    location.hash = "#login";
  }catch(err){
    if (msg) msg.textContent = err.message;
  }
});
