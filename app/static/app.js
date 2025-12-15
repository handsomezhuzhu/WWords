const translations = {
  zh: {
    title: "AI 单词本",
    subtitle: "借助 AI 补全和艾宾浩斯记忆的双语单词管理。",
    login: "登录",
    register: "注册",
    toggleTheme: "切换主题",
    toggleLang: "中 / EN",
    addWord: "添加单词",
    english: "英文",
    chinese: "中文",
    pos: "词性",
    definition: "定义",
    examples: "例句",
    save: "保存",
    complete: "AI 补全",
    myWords: "我的单词",
    review: "背单词",
    mode: "模式",
    count: "数量",
    start: "开始",
    dashboard: "工作台",
    language: "语言",
    theme: "主题",
    light: "浅色",
    dark: "深色",
  },
  en: {},
};

const i18nElements = document.querySelectorAll("[data-i18n]");
let currentLang = localStorage.getItem("lang") || "en";
let currentTheme = localStorage.getItem("theme") || "light";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function applyLang(lang) {
  const map = translations[lang] || {};
  i18nElements.forEach((el) => {
    const key = el.dataset.i18n;
    if (map[key]) {
      el.textContent = map[key];
    }
  });
  localStorage.setItem("lang", lang);
}

const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(currentTheme);
  });
}

const langToggle = document.getElementById("lang-toggle");
if (langToggle) {
  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "zh" : "en";
    applyLang(currentLang);
  });
}

applyTheme(currentTheme);
applyLang(currentLang);

// Dashboard interactions
const addForm = document.getElementById("add-word-form");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const payload = Object.fromEntries(formData.entries());
    const token = localStorage.getItem("token");
    const res = await fetch("/words/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      location.reload();
    } else {
      alert("Failed to save word");
    }
  });
}

const completeButton = document.getElementById("ai-complete");
if (completeButton) {
  completeButton.addEventListener("click", async () => {
    const formData = new FormData(addForm);
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/words/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    document.getElementById("completion-output").textContent = JSON.stringify(
      data,
      null,
      2
    );
    addForm.english.value = data.english;
    addForm.chinese.value = data.chinese;
    addForm.part_of_speech.value = data.part_of_speech;
    addForm.definition.value = data.definition;
    addForm.examples.value = data.examples.join("\n");
  });
}

const reviewForm = document.getElementById("start-review");
if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(reviewForm);
    const payload = Object.fromEntries(formData.entries());
    payload.count = Number(payload.count);
    const token = localStorage.getItem("token");
    const res = await fetch("/review/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const items = await res.json();
    const container = document.getElementById("review-area");
    container.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<p>${item.question}</p>`;
      const known = document.createElement("button");
      known.className = "btn";
      known.textContent = "👍";
      known.onclick = () => submitResult(item.id, true, card);
      const fuzzy = document.createElement("button");
      fuzzy.className = "btn ghost";
      fuzzy.textContent = "🤔";
      fuzzy.onclick = () => submitResult(item.id, false, card);
      const answer = document.createElement("div");
      answer.textContent = item.answer;
      card.appendChild(answer);
      card.appendChild(known);
      card.appendChild(fuzzy);
      container.appendChild(card);
    });
  });
}

async function submitResult(id, remembered, card) {
  const token = localStorage.getItem("token");
  await fetch(`/review/${id}/result?remembered=${remembered}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  card.remove();
}

// capture token when logging in via form submission
const loginForm = document.querySelector('form[action="/auth/token"]');
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const res = await fetch("/auth/token", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      window.location.href = "/dashboard";
    } else {
      alert("Login failed");
    }
  });
}

const registerForm = document.querySelector('form[action="/auth/register"]');
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    if (res.ok) {
      alert("Registered! Now login.");
    } else {
      alert("Registration failed");
    }
  });
}
