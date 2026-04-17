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
    const wordId = addForm.dataset.editingId; // Check if we are editing
    
    let url = "/words/";
    let method = "POST";
    
    if (wordId) {
        url = `/words/${wordId}`;
        method = "PUT";
    }

    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      location.reload();
    } else {
      const errorData = await res.json();
      alert(errorData.detail || "Failed to save word");
    }
  });
}

// Add Cancel Edit button logic if needed, or just let user clear form manually. 
// For better UX, we can add a "Cancel" button that appears when editing.

window.editWord = async function(id) {
    // 1. Fetch word details (we can get from the table row data if we stored it, or fetch from API)
    // To be safe and simple, let's fetch from API list or find in DOM if we rendered full data.
    // For now, let's just populate from the table row since all data seems visible, 
    // BUT 'examples' and 'phonetics' might be hidden or truncated.
    // Better to fetch single word if we had an endpoint, or filter from the list we already have if we stored it in JS variable.
    // Since we used server-side rendering (Jinja2), the data is in the HTML.
    
    // Let's assume the user clicks edit, we can grab data from the row 
    // OR we can add a data-attribute to the row with full JSON.
    // Let's implement a simple fetch-from-row for now, assuming all needed data is in columns.
    // Actually, 'definition' is in the table. 'examples' might not be fully there.
    // Let's add a `data-examples` attribute to the row in the template.
    
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;
    
    const english = row.children[0].textContent;
    const chinese = row.children[1].textContent;
    const pos = row.children[2].textContent;
    const definition = row.children[3].textContent;
    // Find the hidden div in the examples cell (index 4)
    const examplesDiv = row.children[4].querySelector('.examples-data');
    const examples = examplesDiv ? examplesDiv.textContent : "";

    // Populate Form
    addForm.english.value = english;
    addForm.chinese.value = chinese;
    addForm.part_of_speech.value = pos;
    addForm.definition.value = definition;
    addForm.examples.value = examples;

    // Set Editing State
    addForm.dataset.editingId = id;
    
    // Change Submit Button Text
    const submitBtn = addForm.querySelector('button[type="submit"]');
    submitBtn.textContent = "Update Word";
    
    // Add Cancel Button if not exists
    if (!document.getElementById("cancel-edit-btn")) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.id = "cancel-edit-btn";
        cancelBtn.className = "btn ghost danger";
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.marginLeft = "0.5rem";
        cancelBtn.onclick = () => {
            addForm.reset();
            delete addForm.dataset.editingId;
            submitBtn.textContent = "Save";
            cancelBtn.remove();
        };
        submitBtn.parentNode.appendChild(cancelBtn);
    }
    
    // Scroll to form
    addForm.scrollIntoView({ behavior: "smooth" });
};

const completeButton = document.getElementById("ai-complete");
if (completeButton) {
  completeButton.addEventListener("click", async () => {
    const formData = new FormData(addForm);
    const english = formData.get("english").trim();
    const chinese = formData.get("chinese").trim();
    
    let payload = {};
    if (english) {
        payload = { word: english, direction: "en_to_zh" };
    } else if (chinese) {
        payload = { word: chinese, direction: "zh_to_en" };
    } else {
        alert("Please enter a word (English or Chinese)");
        return;
    }

    // Set loading state
    const originalText = completeButton.innerHTML;
    completeButton.disabled = true;
    completeButton.innerHTML = `<span class="spinner"></span> AI Completing...`;
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch("/words/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || "AI Completion failed");
        }
        const data = await res.json();
        document.getElementById("completion-output").textContent = JSON.stringify(
          data,
          null,
          2
        );
        // Map complex response to simple form fields for now
        addForm.english.value = data.word;
        if (data.partsOfSpeech && data.partsOfSpeech.length > 0) {
            addForm.chinese.value = data.partsOfSpeech.map(p => p.meaningZh).join("; ");
            addForm.part_of_speech.value = data.partsOfSpeech.map(p => p.pos).join(", ");
            addForm.definition.value = data.partsOfSpeech.map(p => `${p.pos}: ${p.meaningEn}`).join("\n");
        }
        if (data.examples && data.examples.length > 0) {
            addForm.examples.value = data.examples.map(e => `${e.sentenceEn}\n${e.sentenceZh}`).join("\n\n");
        }
    } catch (e) {
        console.error(e);
        alert(e.message || "AI Completion failed");
    } finally {
        // Restore button state
        completeButton.disabled = false;
        completeButton.innerHTML = originalText;
    }
  });
}

// Review Logic
let reviewQueue = [];
let currentReviewIndex = 0;

const reviewForm = document.getElementById("start-review");
if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(reviewForm);
    const payload = Object.fromEntries(formData.entries());
    payload.count = Number(payload.count);
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch("/review/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) throw new Error("Failed to start review");
        
        reviewQueue = await res.json();
        currentReviewIndex = 0;
        
        if (reviewQueue.length === 0) {
            document.getElementById("review-area").innerHTML = "<p>No words to review right now! Great job!</p>";
            return;
        }
        
        renderCurrentCard();
    } catch(e) {
        alert(e.message);
    }
  });
}

function renderCurrentCard() {
    const container = document.getElementById("review-area");
    container.innerHTML = "";
    
    if (currentReviewIndex >= reviewQueue.length) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">🎉 Review Complete!</h3>
                <p>You have reviewed ${reviewQueue.length} words.</p>
                <button class="btn" onclick="location.reload()">Back to Dashboard</button>
            </div>`;
        return;
    }
    
    const item = reviewQueue[currentReviewIndex];
    const card = document.createElement("div");
    card.className = "card";
    
    // Hint Logic
    let hintHtml = "";
    if (item.examples && item.examples.length > 0) {
        hintHtml = `
        <div class="hint-section" style="margin: 1.5rem 0;">
            <button class="btn ghost small" id="hint-btn">💡 Hint: English Example</button>
            <p id="hint-text" class="hidden" style="color: var(--muted); font-style: italic; margin-top: 0.5rem; border-left: 3px solid var(--accent); padding-left: 1rem;"></p>
        </div>`;
    }
    
    card.innerHTML = `
        <div class="review-content" style="text-align: center; padding: 1rem 0;">
            <p class="question" style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; color: var(--text);">${item.question}</p>
            ${hintHtml}
            <div id="answer-section" class="hidden">
                <hr style="margin: 2rem 0; border: 0; border-top: 1px solid var(--border);">
                <p class="answer" style="font-size: 1.5rem; color: var(--accent); margin-bottom: 2rem; font-weight: 600;">${item.answer}</p>
                <div class="actions" style="justify-content: center; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn danger" onclick="submitReview(0)">Don't know (0)</button>
                    <button class="btn warning" onclick="submitReview(1)">Unclear (1)</button>
                    <button class="btn success" onclick="submitReview(2)">I know it (2)</button>
                </div>
            </div>
            <button id="show-answer-btn" class="btn full-width" style="margin-top: 2rem; padding: 1rem; font-size: 1.1rem;">Show Answer</button>
        </div>
    `;
    
    container.appendChild(card);
    
    // Bind Events
    const showAnswerBtn = card.querySelector("#show-answer-btn");
    const answerSection = card.querySelector("#answer-section");
    const hintBtn = card.querySelector("#hint-btn");
    const hintText = card.querySelector("#hint-text");
    
    if (showAnswerBtn) {
        showAnswerBtn.onclick = () => {
            if (answerSection) answerSection.classList.remove("hidden");
            showAnswerBtn.classList.add("hidden");
        };
    }
    
    if(hintBtn) {
        hintBtn.onclick = () => {
            // Pick a random example
            const example = item.examples[Math.floor(Math.random() * item.examples.length)];
            hintText.textContent = example.sentenceEn; // Show English sentence as hint
            hintText.classList.remove("hidden");
            hintBtn.classList.add("hidden");
        };
    }
}

window.submitReview = async function(grade) {
    const item = reviewQueue[currentReviewIndex];
    const token = localStorage.getItem("token");
    
    try {
        await fetch(`/review/${item.id}/result`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ grade: grade })
        });
        
        currentReviewIndex++;
        renderCurrentCard();
        
    } catch (e) {
        console.error(e);
        alert("Failed to submit result");
    }
};

// capture token when logging in via form submission
const loginForm = document.getElementById("login-form");
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
      // Cookie is set by server, just redirect
      window.location.href = "/dashboard";
    } else {
      alert("Login failed");
    }
  });
}

const registerForm = document.getElementById("register-form");
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
      window.location.href = "/login";
    } else {
      alert("Registration failed");
    }
  });
}
