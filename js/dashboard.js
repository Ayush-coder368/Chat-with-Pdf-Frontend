document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = CW.$;
    const $$ = CW.$$;
    const token = CW.getToken();
    let user = CW.getUser();

    if (!token || !user) {
        window.location.replace("login.html");
        return;
    }

    const sidebar = $("#sidebar");
    const profilePanel = $("#profile-panel");
    const profileModal = $("#profile-modal");
    const newChatModal = $("#new-chat-modal");
    const fileInput = $("#file-input");
    const dropzone = $("#dropzone");

    let documents = [];
    let chats = readChats();
    let questionCount = 0;

    function readChats() {
        try {
            const value = JSON.parse(localStorage.getItem("cw_chats") || "[]");
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function saveChats() {
        localStorage.setItem("cw_chats", JSON.stringify(chats));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    function formatSize(bytes) {
        const size = Number(bytes || 0);
        if (!size) return "PDF";
        return size >= 1024 * 1024
            ? `${(size / (1024 * 1024)).toFixed(2)} MB`
            : `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    function formatDate(value) {
        if (!value) return "Recently added";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Recently added" : date.toLocaleDateString();
    }

    function showModal(element) {
        element?.classList.add("show");
        document.body.classList.add("modal-open");
    }

    function hideModal(element) {
        element?.classList.remove("show");
        if (!$(".modal-backdrop.show")) document.body.classList.remove("modal-open");
    }

    function setupSidebar() {
        let overlay = $("#sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("button");
            overlay.type = "button";
            overlay.id = "sidebar-overlay";
            overlay.className = "sidebar-overlay";
            overlay.setAttribute("aria-label", "Close navigation");
            document.body.appendChild(overlay);
        }

        let closeButton = $("#sidebar-close");
        if (sidebar && !closeButton) {
            closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.id = "sidebar-close";
            closeButton.className = "icon-btn sidebar-close";
            closeButton.setAttribute("aria-label", "Close sidebar");
            closeButton.innerHTML = '<i data-lucide="x"></i>';
            sidebar.querySelector(".side-brand")?.appendChild(closeButton);
        }

        const close = () => {
            sidebar?.classList.remove("open");
            overlay.classList.remove("show");
            document.body.classList.remove("sidebar-open");
        };
        const open = () => {
            sidebar?.classList.add("open");
            overlay.classList.add("show");
            document.body.classList.add("sidebar-open");
        };

        $("#mobile-menu")?.addEventListener("click", open);
        closeButton?.addEventListener("click", close);
        overlay.addEventListener("click", close);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") close();
        });
    }

    function renderUser() {
        const firstName = (user.name || "Student").trim().split(/\s+/)[0];
        if ($("#welcome-name")) $("#welcome-name").textContent = firstName;
        if ($("#profile-name")) $("#profile-name").textContent = user.name || "Student";
        if ($("#panel-name")) $("#panel-name").textContent = user.name || "Student";
        if ($("#panel-email")) $("#panel-email").textContent = user.email || "";
        if ($("#avatar")) $("#avatar").textContent = CW.initials(user.name);
        if ($("#panel-avatar")) $("#panel-avatar").textContent = CW.initials(user.name);

        if ($("#stat-profile")) {
            $("#stat-profile").textContent = user.course && user.branch ? "Complete" : "Basic";
        }
        if ($("#academic-context")) {
            $("#academic-context").textContent = user.course && user.branch
                ? `${user.course} · ${user.branch}${user.year ? ` · ${user.year}` : ""}`
                : "Add your course and branch";
        }
    }

    function renderDocuments() {
        const list = $("#file-list");
        if (!list) return;

        if (!documents.length) {
            list.innerHTML = '<div class="empty">Your uploaded PDFs will appear here.</div>';
        } else {
            list.innerHTML = documents.map(doc => {
                const id = doc._id || doc.id;
                const status = doc.status || "ready";
                return `
                    <div class="file-row" data-document-id="${escapeHTML(id)}">
                        <span class="file-icon"><i data-lucide="file-text"></i></span>
                        <div class="file-meta">
                            <strong title="${escapeHTML(doc.fileName || "Untitled PDF")}">${escapeHTML(doc.fileName || "Untitled PDF")}</strong>
                            <small>${formatSize(doc.fileSize)} · ${formatDate(doc.createdAt || doc.uploadedAt)}</small>
                            <small class="document-status status-${escapeHTML(status)}">${escapeHTML(status)}</small>
                        </div>
                        <div class="file-actions">
                            <button class="icon-btn open-document" type="button" data-id="${escapeHTML(id)}" title="Open PDF chat" aria-label="Open PDF chat">
                                <i data-lucide="message-square"></i>
                            </button>
                            <button class="icon-btn remove-file" type="button" data-id="${escapeHTML(id)}" title="Delete PDF" aria-label="Delete PDF">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>`;
            }).join("");
        }

        if ($("#doc-count")) {
            $("#doc-count").textContent = `${documents.length} file${documents.length === 1 ? "" : "s"}`;
        }
        if ($("#stat-uploads")) $("#stat-uploads").textContent = documents.length;
        if (window.lucide) window.lucide.createIcons();
    }

    function renderChats() {
        const list = $("#chat-list");
        if (!list) return;

        chats = readChats();
        if (!chats.length) {
            list.innerHTML = '<div class="empty">No conversations yet.<br>Upload a PDF to start.</div>';
        } else {
            list.innerHTML = chats.map(chat => `
                <button class="chat-item chat-item-button" type="button" data-chat-id="${escapeHTML(chat.id)}">
                    <strong>${escapeHTML(chat.name || chat.title || "New Chat")}</strong>
                    <div class="muted chat-item-meta">
                        ${escapeHTML(formatDate(chat.updatedAt || chat.createdAt))} · ${Number(chat.questions || 0)} questions
                    </div>
                </button>
            `).join("");
        }
        if ($("#stat-chats")) $("#stat-chats").textContent = chats.length;
    }

    async function loadDashboardData() {
        try {
            const result = await CW.api("/pdf");
            documents = Array.isArray(result.documents) ? result.documents : [];
        } catch (error) {
            CW.toast(error.message);
            documents = [];
        }

        // Count persisted question-answer records per document.
        const historyResults = await Promise.allSettled(
            documents.filter(doc => doc._id || doc.id).map(doc =>
                CW.api(`/chat/history/${encodeURIComponent(doc._id || doc.id)}`)
            )
        );
        questionCount = historyResults.reduce((total, item) => {
            return total + (item.status === "fulfilled" && Array.isArray(item.value.chats)
                ? item.value.chats.length : 0);
        }, 0);

        if ($("#stat-questions")) $("#stat-questions").textContent = questionCount;
        renderDocuments();
        renderChats();
    }

    function openChatForDocument(document) {
        const documentId = document._id || document.id;
        let chat = chats.find(item => item.documentId === documentId);

        if (!chat) {
            const name = (document.fileName || "PDF conversation").replace(/\.pdf$/i, "");
            chat = {
                id: `chat_${Date.now()}`,
                name,
                title: name,
                documentId,
                documentName: document.fileName || "Document.pdf",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                questions: 0
            };
            chats.unshift(chat);
            saveChats();
        }

        localStorage.setItem("cw_active_chat", chat.id);
        window.location.href = "chat.html";
    }

    // Load profile from database so edits from another session are reflected.
    async function loadProfile() {
        try {
            const result = await CW.api("/user/profile");
            if (result.user) {
                user = result.user;
                CW.setUser(user);
                renderUser();
            }
        } catch (error) {
            console.warn("Could not refresh profile:", error.message);
        }
    }

    renderUser();
    renderChats();
    setupSidebar();
    loadDashboardData();
    loadProfile();

    // Sidebar navigation links close the mobile drawer after navigation/scroll.
    $$("[data-scroll]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            const target = document.getElementById(link.dataset.scroll);
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
            $("#sidebar")?.classList.remove("open");
            $("#sidebar-overlay")?.classList.remove("show");
            document.body.classList.remove("sidebar-open");
        });
    });

    // Profile panel.
    $("#profile-trigger")?.addEventListener("click", () => {
        profilePanel?.classList.toggle("show");
    });
    $("#side-profile")?.addEventListener("click", event => {
        event.preventDefault();
        profilePanel?.classList.add("show");
    });
    document.addEventListener("click", event => {
        if (profilePanel?.classList.contains("show") &&
            !profilePanel.contains(event.target) &&
            !$("#profile-trigger")?.contains(event.target) &&
            !$("#side-profile")?.contains(event.target)) {
            profilePanel.classList.remove("show");
        }
    });

    $("#edit-profile")?.addEventListener("click", () => {
        const form = $("#profile-form");
        if (!form) return;
        ["name", "email", "course", "branch", "year", "college"].forEach(key => {
            if (form.elements[key]) form.elements[key].value = user[key] || "";
        });
        if (form.elements.academicMode) {
            form.elements.academicMode.checked = localStorage.getItem("cw_academic_mode") === "1";
        }
        showModal(profileModal);
        profilePanel?.classList.remove("show");
    });

    $$("[data-close]").forEach(button => {
        button.addEventListener("click", () => {
            hideModal(document.getElementById(button.dataset.close));
        });
    });

    [profileModal, newChatModal].forEach(modal => {
        modal?.addEventListener("click", event => {
            if (event.target === modal) hideModal(modal);
        });
    });

    $("#profile-form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const payload = Object.fromEntries(new FormData(form).entries());
        delete payload.academicMode;

        try {
            const result = await CW.api("/user/profile", {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            user = result.user || { ...user, ...payload };
            CW.setUser(user);
            localStorage.setItem("cw_academic_mode", form.elements.academicMode?.checked ? "1" : "0");
            renderUser();
            hideModal(profileModal);
            CW.toast("Profile updated successfully.");
        } catch (error) {
            CW.toast(error.message);
        }
    });

    $("#logout")?.addEventListener("click", CW.logout);

    $("#clear-history")?.addEventListener("click", async () => {
        if (!window.confirm("Clear all saved conversations? This removes chat messages but does not delete PDFs.")) return;

        const requests = documents.filter(doc => doc._id || doc.id).map(doc =>
            CW.api(`/chat/history/${encodeURIComponent(doc._id || doc.id)}`, { method: "DELETE" })
        );

        const results = await Promise.allSettled(requests);
        chats = [];
        saveChats();
        localStorage.removeItem("cw_active_chat");
        renderChats();

        const failed = results.filter(item => item.status === "rejected").length;
        CW.toast(failed ? "Local conversations cleared; some server histories could not be cleared." : "Chat history cleared.");
    });

    $("#chat-list")?.addEventListener("click", event => {
        const button = event.target.closest("[data-chat-id]");
        if (!button) return;
        localStorage.setItem("cw_active_chat", button.dataset.chatId);
        window.location.href = "chat.html";
    });

    $("#file-list")?.addEventListener("click", async event => {
        const openButton = event.target.closest(".open-document");
        const deleteButton = event.target.closest(".remove-file");

        if (openButton) {
            const document = documents.find(item => String(item._id || item.id) === openButton.dataset.id);
            if (document) openChatForDocument(document);
        }

        if (deleteButton) {
            const id = deleteButton.dataset.id;
            const document = documents.find(item => String(item._id || item.id) === id);
            if (!document || !window.confirm(`Delete "${document.fileName}"?`)) return;

            deleteButton.disabled = true;
            try {
                await CW.api(`/pdf/${encodeURIComponent(id)}`, { method: "DELETE" });
                documents = documents.filter(item => String(item._id || item.id) !== id);
                chats = readChats().filter(chat => chat.documentId !== id);
                saveChats();
                renderDocuments();
                renderChats();
                CW.toast("PDF deleted.");
            } catch (error) {
                deleteButton.disabled = false;
                CW.toast(error.message);
            }
        }
    });

    $("#new-chat")?.addEventListener("click", () => {
        const form = $("#new-chat-form");
        if (!form || !newChatModal) {
            // Fallback if the modal is not present in the page.
            window.location.href = "chat.html";
            return;
        }
        form.reset();
        showModal(newChatModal);
        $("#chat-name")?.focus();
    });

    $("#new-chat-form")?.addEventListener("submit", event => {
        event.preventDefault();
        const name = $("#chat-name")?.value.trim();
        if (!name) {
            CW.toast("Please enter a chat name.");
            return;
        }

        const chat = {
            id: `chat_${Date.now()}`,
            name,
            title: name,
            documentId: null,
            documentName: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            questions: 0
        };
        chats = readChats();
        chats.unshift(chat);
        saveChats();
        localStorage.setItem("cw_active_chat", chat.id);
        hideModal(newChatModal);
        window.location.href = "chat.html";
    });

    function validatePDF(file) {
        if (!file) return "Choose a PDF first.";
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            return "Please select a PDF file.";
        }
        if (file.size > 10 * 1024 * 1024) return "PDF size cannot exceed 10 MB.";
        return null;
    }

    async function uploadPDF(file) {
        const error = validatePDF(file);
        if (error) {
            CW.toast(error);
            return;
        }

        const status = $("#file-status");
        const chooseButton = $("#choose-file");
        const formData = new FormData();
        formData.append("pdf", file);

        if (status) status.textContent = `Uploading ${file.name}...`;
        if (chooseButton) chooseButton.disabled = true;

        try {
            const result = await CW.api("/pdf/upload", {
                method: "POST",
                body: formData
            });
            if (!result.document) throw new Error("The server did not return the uploaded document.");

            if (status) status.textContent = `${file.name} uploaded and processed successfully.`;
            CW.toast("PDF uploaded successfully.");
            await loadDashboardData();
            const uploaded = result.document;
            openChatForDocument(uploaded);
        } catch (error) {
            if (status) status.textContent = error.message;
            CW.toast(error.message);
        } finally {
            if (chooseButton) chooseButton.disabled = false;
            if (fileInput) fileInput.value = "";
        }
    }

    $("#choose-file")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => uploadPDF(fileInput.files?.[0]));

    if (dropzone) {
        ["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => {
            event.preventDefault();
            dropzone.classList.add("drag");
        }));
        ["dragleave", "drop"].forEach(type => dropzone.addEventListener(type, event => {
            event.preventDefault();
            dropzone.classList.remove("drag");
        }));
        dropzone.addEventListener("drop", event => uploadPDF(event.dataTransfer?.files?.[0]));
    }
});
