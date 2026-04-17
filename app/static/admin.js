document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const usersSummary = document.getElementById("users-summary");
    const searchForm = document.getElementById("user-search-form");
    const createUserForm = document.getElementById("create-user-form");
    const usersTableBody = document.querySelector("#users-table tbody");
    let currentQuery = "";

    loadUsers();
    loadConfig();

    async function loadUsers(query = currentQuery) {
        currentQuery = query;
        try {
            const search = new URLSearchParams({
                page: "1",
                page_size: "50"
            });
            if (query) search.set("q", query);
            const res = await fetch(`/admin/users?${search.toString()}`, { headers });
            if (!res.ok) throw new Error("Failed to load users");
            const payload = await res.json();
            const users = payload.items || [];
            usersTableBody.innerHTML = "";
            if (usersSummary) {
                usersSummary.textContent = `共 ${payload.total ?? users.length} 个用户`;
            }
            users.forEach(user => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td>
                        <select data-field="preferred_language">
                            <option value="en" ${user.preferred_language === "en" ? "selected" : ""}>English</option>
                            <option value="zh" ${user.preferred_language === "zh" ? "selected" : ""}>中文</option>
                        </select>
                    </td>
                    <td>
                        <select data-field="preferred_theme">
                            <option value="light" ${user.preferred_theme === "light" ? "selected" : ""}>Light</option>
                            <option value="dark" ${user.preferred_theme === "dark" ? "selected" : ""}>Dark</option>
                        </select>
                    </td>
                    <td>${user.is_admin ? "Yes" : "No"}</td>
                    <td>
                        <label class="checkbox-row compact-row">
                            <input data-field="is_admin" type="checkbox" ${user.is_admin ? "checked" : ""}>
                            <span>管理员</span>
                        </label>
                    </td>
                    <td>
                        <input data-field="password" type="text" placeholder="留空则不修改">
                    </td>
                    <td>
                        <button class="btn ghost small" onclick="saveUser(${user.id}, this)">Save</button>
                        <button class="btn danger small" onclick="deleteUser(${user.id})">Delete</button>
                    </td>
                `;
                usersTableBody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
        }
    }

    async function loadConfig() {
        try {
            const res = await fetch("/admin/ai-config", { headers });
            if (!res.ok) return; // Maybe no config yet
            const config = await res.json();
            const form = document.getElementById("ai-config-form");
            if (config.provider) form.provider.value = config.provider;
            if (config.api_url) form.api_url.value = config.api_url;
            if (config.model) form.model.value = config.model;
            if (typeof config.temperature === "number") form.temperature.value = config.temperature;
            if (config.api_key_configured) {
                form.api_key.value = "";
                form.api_key.placeholder = config.api_key_masked || "API key already configured";
            }
        } catch (e) {
            console.error(e);
        }
    }

    const configForm = document.getElementById("ai-config-form");
    if (configForm) {
        configForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(configForm);
            const payload = {
                provider: formData.get("provider"),
                api_key: formData.get("api_key"),
                api_url: formData.get("api_url"),
                model: formData.get("model"),
                temperature: Number(formData.get("temperature") || 0)
            };

            const res = await fetch("/admin/ai-config", {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Saved!");
                loadConfig();
            } else {
                alert("Failed to save config");
            }
        });
    }

    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            await loadUsers((formData.get("query") || "").toString().trim());
        });
    }

    const clearSearchBtn = document.getElementById("clear-search-btn");
    if (clearSearchBtn && searchForm) {
        clearSearchBtn.addEventListener("click", async () => {
            searchForm.reset();
            await loadUsers("");
        });
    }

    if (createUserForm) {
        createUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(createUserForm);
            const payload = {
                email: formData.get("email"),
                password: formData.get("password"),
                preferred_language: formData.get("preferred_language"),
                preferred_theme: formData.get("preferred_theme"),
                is_admin: formData.get("is_admin") === "on"
            };

            const res = await fetch("/admin/users", {
                method: "POST",
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("User created");
                createUserForm.reset();
                loadUsers();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.detail || "Failed to create user");
            }
        });
    }

    window.saveUser = async (id, button) => {
        const row = button.closest("tr");
        const payload = {
            preferred_language: row.querySelector('[data-field="preferred_language"]').value,
            preferred_theme: row.querySelector('[data-field="preferred_theme"]').value,
            is_admin: row.querySelector('[data-field="is_admin"]').checked,
            password: row.querySelector('[data-field="password"]').value.trim()
        };

        if (!payload.password) {
            delete payload.password;
        }

        const res = await fetch(`/admin/users/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("User updated");
            loadUsers();
        } else {
            const errorData = await res.json().catch(() => ({}));
            alert(errorData.detail || "Failed to update user");
        }
    };

    window.deleteUser = async (id) => {
        if (!confirm("Are you sure?")) return;
        const res = await fetch(`/admin/users/${id}`, {
            method: "DELETE",
            headers
        });
        if (res.ok) {
            loadUsers();
        } else {
            const errorData = await res.json().catch(() => ({}));
            alert(errorData.detail || "Failed to delete user");
        }
    };
});
