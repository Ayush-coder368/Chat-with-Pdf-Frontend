document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const token = CW.getToken();
    const user = CW.getUser();
    if (!token || !user) {
        window.location.replace("login.html");
        return;
    }

    const $ = CW.$;
    const sidebar = $("#sidebar");
    const pdfInput = $("#pdf");
    const questionInput = $("#question");
    const sendButton = $("#send");
    const messages = $("#messages");
    const recentChats = $("#recent-chats");

    let chats = readChats();
    let activeChat = null;
    let selectedDocument = null;
    let isSending = false;

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

    function getActiveChat() {
        chats = readChats();
        const activeId = localStorage.getItem("cw_active_chat");
        return chats.find(chat => chat.id === activeId) || null;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
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
        $("#mobile-menu")?.addEventListener("click", () => {
            sidebar?.classList.add("open");
            overlay.classList.add("show");
            document.body.classList.add("sidebar-open");
        });
        closeButton?.addEventListener("click", close);
        overlay.addEventListener("click", close);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") close();
        });
    }

    function notify(message) {
        CW.toast(message);
    }

    function renderUser() {
        if ($("#name")) $("#name").textContent = user.name || "User";
        if ($("#avatar")) $("#avatar").textContent = CW.initials(user.name);
    }

    function renderEmptyState(message = "Select a PDF document and ask questions about its content.") {
        messages.innerHTML = `
            <div class="chat-empty-state" id="chat-empty-state">
                <div class="empty-chat-icon"><i data-lucide="message-square-text"></i></div>
                <h2>Start a conversation</h2>
                <p>${escapeHTML(message)}</p>
                <button class="btn btn-primary" id="empty-select-pdf" type="button">
                    <i data-lucide="file-up"></i> Choose a PDF
                </button>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
    }

    
function formatAIResponse(text) {
    let answer = String(text ?? "");

    // Remove unnecessary escaped Markdown characters
    answer = answer.replace(/\\([#*_\-`>])/g, "$1");

    // Replace unwanted HTML space entities
    answer = answer.replace(/&#x20;|&#160;|&nbsp;/gi, " ");

    // Convert Markdown into HTML
    if (window.marked) {
        return DOMPurify.sanitize(marked.parse(answer));
    }

    // Safe fallback if Markdown library is unavailable
    return escapeHTML(answer).replace(/\n/g, "<br>");
}

function addMessage(type, text) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${type}`;

    const avatar = document.createElement("span");
    avatar.className = "avatar";

    if (type === "ai") {
        avatar.innerHTML = '<i data-lucide="bot"></i>';
    } else {
        avatar.textContent = CW.initials(user.name);
    }

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    const heading = document.createElement("strong");
    heading.textContent = type === "ai" ? "AI Assistant" : "You";

    const content = document.createElement("div");
    content.className = "message-content";

    if (type === "ai") {
        content.innerHTML = formatAIResponse(text);
    } else {
        content.textContent = String(text ?? "");
    }

    bubble.append(heading, content);
    wrapper.append(avatar, bubble);
    messages.appendChild(wrapper);

    if (window.lucide) {
        window.lucide.createIcons();
    }

    messages.scrollTop = messages.scrollHeight;
}


    function setDocumentUI(document) {
        selectedDocument = document || null;
        const filename = document?.fileName || activeChat?.documentName || "No PDF selected";
        if ($("#selected-pdf-name")) $("#selected-pdf-name").textContent = filename;
        $("#document-chip")?.classList.toggle("active", Boolean(document));
        if (questionInput) {
            questionInput.disabled = !document;
            questionInput.placeholder = document
                ? "Ask anything about this PDF..."
                : "Select a PDF to start asking questions...";
        }
        if (sendButton) sendButton.disabled = !document || isSending;
    }

    function renderHistory(chatsFromServer) {
        messages.innerHTML = "";
        if (!Array.isArray(chatsFromServer) || chatsFromServer.length === 0) {
            addMessage("ai", `I've loaded ${selectedDocument.fileName}. Ask me anything about its contents.`);
            return;
        }

        chatsFromServer.forEach(item => {
            if (item.question) addMessage("user", item.question);
            if (item.answer) addMessage("ai", item.answer);
        });
    }

    async function loadHistory(documentId) {
        const result = await CW.api(`/chat/history/${encodeURIComponent(documentId)}`);
        renderHistory(result.chats || []);
    }

    function renderRecentChats() {
        if (!recentChats) return;
        chats = readChats();
        const activeId = activeChat?.id;

        if (!chats.length) {
            recentChats.innerHTML = '<div class="empty">No conversations yet.</div>';
            return;
        }

        recentChats.innerHTML = "";
        chats.forEach(chat => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "recent-chat-item";
            button.classList.toggle("active", chat.id === activeId);

            const icon = document.createElement("i");
            icon.setAttribute("data-lucide", "message-square");
            const label = document.createElement("span");
            label.textContent = chat.name || chat.title || "New Chat";
            button.append(icon, label);

            button.addEventListener("click", async () => {
                localStorage.setItem("cw_active_chat", chat.id);
                await loadActiveChat();
                renderRecentChats();
                closeSidebar();
            });
            recentChats.appendChild(button);
        });
        if (window.lucide) window.lucide.createIcons();
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        $("#sidebar-overlay")?.classList.remove("show");
        document.body.classList.remove("sidebar-open");
    }

    async function loadActiveChat() {
        activeChat = getActiveChat();
        selectedDocument = null;
        setDocumentUI(null);

        if ($("#chat-title")) {
            $("#chat-title").textContent = activeChat?.name || activeChat?.title || "New Conversation";
        }

        if (!activeChat) {
            renderEmptyState("Create a conversation, then select a PDF to begin.");
            return;
        }

        if (!activeChat.documentId) {
            renderEmptyState();
            return;
        }

        renderEmptyState("Loading your PDF and previous messages...");
        try {
            const result = await CW.api(`/pdf/${encodeURIComponent(activeChat.documentId)}`);
            const document = result.document;
            if (!document) throw new Error("The selected PDF could not be found.");
            if (document.status !== "ready") throw new Error(`This PDF is currently ${document.status || "not ready"}.`);

            activeChat.documentName = document.fileName;
            saveChats();
            setDocumentUI(document);
            await loadHistory(activeChat.documentId);
        } catch (error) {
            setDocumentUI(null);
            renderEmptyState(`${error.message} Select another PDF or upload it again.`);
            notify(error.message);
        }
    }

    function createChat(name) {
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
        localStorage.setItem("cw_chats", JSON.stringify(chats));
        localStorage.setItem("cw_active_chat", chat.id);
        return chat;
    }

    function openNewChatDialog() {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop show";
        backdrop.id = "chat-name-dialog";
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title">
                <div class="modal-head">
                    <h2 id="chat-dialog-title">Create New Chat</h2>
                    <button class="icon-btn" type="button" data-dialog-close aria-label="Close dialog"><i data-lucide="x"></i></button>
                </div>
                <form id="chat-name-form">
                    <div class="form-group">
                        <label for="new-chat-name">Chat name</label>
                        <input class="input" id="new-chat-name" maxlength="60" placeholder="e.g. Biology Notes" required>
                    </div>
                    <div class="form-actions"><button class="btn btn-primary" type="submit">Create Chat</button></div>
                </form>
            </div>`;
        document.body.appendChild(backdrop);
        if (window.lucide) window.lucide.createIcons();

        const close = () => backdrop.remove();
        backdrop.querySelector("[data-dialog-close]").addEventListener("click", close);
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) close();
        });
        const input = $("#new-chat-name", backdrop);
        input.focus();
        $("#chat-name-form", backdrop).addEventListener("submit", async event => {
            event.preventDefault();
            const name = input.value.trim();
            if (!name) {
                notify("Please enter a chat name.");
                input.focus();
                return;
            }
            createChat(name);
            close();
            await loadActiveChat();
            renderRecentChats();
            notify("New chat created.");
        });
    }

    async function uploadSelectedPDF(file) {
        if (!file) return;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            notify("Please select a PDF file.");
            pdfInput.value = "";
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            notify("PDF size cannot exceed 10 MB.");
            pdfInput.value = "";
            return;
        }

        if (!activeChat) {
            activeChat = createChat(file.name.replace(/\.pdf$/i, ""));
            if ($("#chat-title")) $("#chat-title").textContent = activeChat.name;
        }

        const formData = new FormData();
        formData.append("pdf", file);

        [$("#select-pdf"), $("#attach"), $("#empty-select-pdf")].forEach(button => {
            if (button) button.disabled = true;
        });
        notify("Uploading and processing PDF...");

        try {
            const result = await CW.api("/pdf/upload", {
                method: "POST",
                body: formData
            });
            const document = result.document;
            if (!document || !(document.id || document._id)) {
                throw new Error("Upload succeeded but the server did not return a document ID.");
            }

            activeChat.documentId = String(document.id || document._id);
            activeChat.documentName = document.fileName || file.name;
            activeChat.updatedAt = new Date().toISOString();
            saveChats();
            setDocumentUI({
                ...document,
                _id: activeChat.documentId,
                fileName: activeChat.documentName,
                status: document.status || "ready"
            });
            renderRecentChats();
            await loadHistory(activeChat.documentId);
            notify("PDF uploaded successfully.");
        } catch (error) {
            console.error("PDF upload error:", error);
            notify(error.message);
        } finally {
            if (pdfInput) pdfInput.value = "";
            [$("#select-pdf"), $("#attach"), $("#empty-select-pdf")].forEach(button => {
                if (button) button.disabled = false;
            });
        }
    }

    async function sendQuestion() {
        const question = questionInput?.value.trim();
        if (!question || isSending) return;
        if (!selectedDocument || !activeChat?.documentId) {
            notify("Please select a PDF first.");
            return;
        }

        isSending = true;
        if (sendButton) sendButton.disabled = true;
        addMessage("user", question);
        questionInput.value = "";

        const loading = document.createElement("div");
        loading.className = "msg ai";
        loading.textContent = "AI is thinking...";
        messages.appendChild(loading);
        messages.scrollTop = messages.scrollHeight;

        try {
            const result = await CW.api("/chat/ask", {
                method: "POST",
                body: JSON.stringify({
                    documentId: activeChat.documentId,
                    question
                })
            });
            loading.remove();
            addMessage("ai", result.answer || "No answer was returned.");

            activeChat.questions = Number(activeChat.questions || 0) + 1;
            activeChat.updatedAt = new Date().toISOString();
            saveChats();
            renderRecentChats();
        } catch (error) {
            loading.remove();
            addMessage("ai", `I couldn't answer that question: ${error.message}`);
            console.error("Chat request error:", error);
        } finally {
            isSending = false;
            if (sendButton) sendButton.disabled = !selectedDocument;
            questionInput?.focus();
        }
    }

    setupSidebar();
    renderUser();

    $("#logout")?.addEventListener("click", CW.logout);
    $("#new-chat")?.addEventListener("click", openNewChatDialog);

    // Event delegation: this button is recreated when the empty state is rendered.
    messages?.addEventListener("click", event => {
        if (event.target.closest("#empty-select-pdf")) pdfInput?.click();
    });

    [$("#select-pdf"), $("#attach")].forEach(button => {
        button?.addEventListener("click", () => pdfInput?.click());
    });

    pdfInput?.addEventListener("change", () => uploadSelectedPDF(pdfInput.files?.[0]));
    sendButton?.addEventListener("click", sendQuestion);
    questionInput?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendQuestion();
        }
    });

    loadActiveChat().then(renderRecentChats);
});
