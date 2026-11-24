(() => {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const API_URL = "https://backendforchatwithpdf236.vercel.app/api";

    function getToken() {
        return localStorage.getItem("cw_token");
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem("cw_user") || "null");
        } catch {
            return null;
        }
    }

    function setUser(user) {
        localStorage.setItem("cw_user", JSON.stringify(user));
    }

    function clearAuth() {
        localStorage.removeItem("cw_user");
        localStorage.removeItem("cw_token");
    }

    function initials(name) {
        return String(name || "User")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join("")
            .toUpperCase() || "U";
    }

    function toast(message) {
        let element = $("#toast");
        if (!element) {
            element = document.createElement("div");
            element.id = "toast";
            element.className = "toast";
            document.body.appendChild(element);
        }

        element.textContent = String(message || "");
        element.classList.add("show");
        window.clearTimeout(element._hideTimer);
        element._hideTimer = window.setTimeout(() => {
            element.classList.remove("show");
        }, 2800);
    }

    async function api(endpoint, options = {}) {
        const headers = new Headers(options.headers || {});
        const token = getToken();

        if (token) headers.set("Authorization", `Bearer ${token}`);

        // Do not set Content-Type for FormData; the browser must add its boundary.
        const isFormData = options.body instanceof FormData;
        if (options.body && !isFormData && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        let response;
        try {
            response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });
        } catch (error) {
            throw new Error("Cannot connect to the backend. Check that the Node.js server is running.");
        }

        const contentType = response.headers.get("content-type") || "";
        let result = {};
        if (contentType.includes("application/json")) {
            try {
                result = await response.json();
            } catch {
                result = {};
            }
        } else {
            const text = await response.text().catch(() => "");
            result = { message: text || `Request failed (${response.status})` };
        }

        if (response.status === 401) {
            clearAuth();
            window.location.replace("login.html");
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok || result.success === false) {
            throw new Error(result.message || `Request failed (${response.status})`);
        }

        return result;
    }

    async function logout() {
        try {
            if (getToken()) {
                await fetch(`${API_URL}/auth/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
            }
        } catch (error) {
            console.warn("Logout request could not be completed:", error);
        } finally {
            clearAuth();
            localStorage.removeItem("cw_active_chat");
            window.location.replace("login.html");
        }
    }

    window.CW = {
        $,
        $$,
        API_URL,
        getToken,
        getUser,
        setUser,
        clearAuth,
        initials,
        toast,
        api,
        logout
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (window.lucide) window.lucide.createIcons();
    });
})();
