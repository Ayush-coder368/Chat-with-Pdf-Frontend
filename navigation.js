// ChatWithPDF shared navigation helpers
document.addEventListener("DOMContentLoaded", () => {
    const homeLinks = document.querySelectorAll('[data-nav="home"]');
    homeLinks.forEach(link => link.href = "index.html");

    const dashboardLinks = document.querySelectorAll('[data-nav="dashboard"]');
    dashboardLinks.forEach(link => link.href = "dashboard.html");

    const loginLinks = document.querySelectorAll('[data-nav="login"]');
    loginLinks.forEach(link => link.href = "login.html");

    const registerLinks = document.querySelectorAll('[data-nav="register"]');
    registerLinks.forEach(link => link.href = "register.html");

    const termsLinks = document.querySelectorAll('[data-nav="terms"]');
    termsLinks.forEach(link => link.href = "terms.html");

    const privacyLinks = document.querySelectorAll('[data-nav="privacy"]');
    privacyLinks.forEach(link => link.href = "privacy.html");
});