import { clearSessionToken, setSessionToken, withSessionPath } from "/page-main.js";

const form = document.querySelector("#login-form");
const statusNode = document.querySelector("#status");
const submitButton = document.querySelector("#submit-button");
const passwordInput = document.querySelector("#password");
const togglePasswordButton = document.querySelector("#toggle-password-button");

clearSessionToken();

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

togglePasswordButton?.addEventListener("click", () => {
  const isHidden = passwordInput?.type === "password";

  if (!passwordInput) {
    return;
  }

  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordButton.textContent = isHidden ? "Hide" : "Show";
  togglePasswordButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  setStatus("Signing in...", "ok");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ identifier, password }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error || "Login failed", "error");
      return;
    }

    if (!payload.sessionToken) {
      setStatus("Login failed", "error");
      return;
    }

    setSessionToken(payload.sessionToken);
    setStatus("Login successful. Redirecting...", "ok");
    window.location.assign(withSessionPath(payload.redirectTo || "/login", payload.sessionToken));
  } catch {
    setStatus("Unable to reach the server", "error");
  } finally {
    submitButton.disabled = false;
  }
});