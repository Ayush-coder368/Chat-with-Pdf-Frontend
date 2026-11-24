
// ==========================================
// ChatWithPDF - Authentication
// ==========================================

// Local backend URL.
// For deployment, replace this with your deployed backend URL.
const API_URL = "https://backendforchatwithpdf236.vercel.app/api/auth";


document.addEventListener("DOMContentLoaded", () => {

    const authForm = document.getElementById("auth-form");

    // If the authentication form does not exist, stop.
    if (!authForm) return;

    const mode = authForm.dataset.mode;
    const isRegister = mode === "register";

    // ==========================================
    // Password Visibility Toggle
    // ==========================================

    const togglePassword = document.getElementById("toggle-password");
    const passwordInput = authForm.querySelector('[name="password"]');

    if (togglePassword && passwordInput) {

        togglePassword.addEventListener("click", () => {

            const isPassword = passwordInput.type === "password";

            passwordInput.type = isPassword ? "text" : "password";

            if (window.lucide) {
                lucide.createIcons();
            }

        });

    }


    // ==========================================
    // Authentication Form Submission
    // ==========================================

    authForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const formData = new FormData(authForm);

        const email = formData.get("email")?.trim();
        const password = formData.get("password");

        if (!email || !password) {
            CW.toast("Please enter email and password.", "error");
            return;
        }


        // ==========================================
        // Registration Validation
        // ==========================================

        if (isRegister) {

            const name = formData.get("name")?.trim();
            const confirmPassword = formData.get("confirmPassword");

            if (!name) {
                CW.toast("Please enter your name.", "error");
                return;
            }

            if (password.length < 6) {
                CW.toast("Password must contain at least 6 characters.", "error");
                return;
            }

            if (password !== confirmPassword) {
                CW.toast("Passwords do not match.", "error");
                return;
            }

        }


        // ==========================================
        // Prepare Request Payload
        // ==========================================

        let payload;

        if (isRegister) {

            payload = {
                name: formData.get("name")?.trim(),
                email,
                password,
                course: formData.get("course"),
                branch: formData.get("branch"),
                year: formData.get("year"),
                college: formData.get("college")
            };

        } else {

            payload = {
                email,
                password
            };

        }


        // ==========================================
        // API Request
        // ==========================================

        const submitButton = authForm.querySelector('[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {

            const endpoint = isRegister ? "register" : "login";

            const response = await fetch(`${API_URL}/${endpoint}`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)

            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.message || "Authentication failed.");
            }


            // ==========================================
            // Save Authentication Data
            // ==========================================

            if (result.token) {

                localStorage.setItem("cw_token", result.token);

            }

            if (result.user) {

                CW.setUser(result.user);

            }


            // ==========================================
            // Success Message and Redirect
            // ==========================================

            if (isRegister) {

                CW.toast("Account created successfully!", "success");

            } else {

                CW.toast("Login successful!", "success");

            }

            setTimeout(() => {

                window.location.href = "dashboard.html";

            }, 700);


        } catch (error) {

            console.error("Authentication Error:", error);

            CW.toast(error.message || "Something went wrong.", "error");

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
            }

        }

    });

});
