# ChatWithPDF Frontend

Frontend pages excluding the existing home page.

## Pages
- `login.html` — sign-in page
- `register.html` — registration + student academic context
- `dashboard.html` — uploads, history, stats, profile management
- `chat.html` — PDF chat interface
- `terms.html` — Terms of Use
- `privacy.html` — Privacy Policy
- `css/app.css` — shared styling
- `js/common.js` — shared helpers
- `js/auth.js` — demo authentication flow
- `js/dashboard.js` — dashboard/profile/upload interactions
- `js/chat.js` — chat UI interactions

## Demo behavior
This frontend uses `localStorage` so it can be opened without a backend. It is intentionally a frontend prototype. Do not use localStorage as production authentication.

## Backend integration points
Replace the localStorage operations with `fetch()` calls to your Node.js API. Typical endpoints:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
PUT  /api/users/me
POST /api/documents/upload
GET  /api/documents
DELETE /api/documents/:id
GET  /api/chats
POST /api/chats
GET  /api/chats/:id
POST /api/chats/:id/messages

Your Node.js server can then call the FastAPI AI service for PDF extraction, retrieval, and LLM responses.
