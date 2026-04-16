const form = document.querySelector("#login-form");
const statusNode = document.querySelector("#status");
const submitButton = document.querySelector("#submit-button");

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

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

    setStatus("Login successful. Redirecting...", "ok");
    window.location.assign(payload.redirectTo || "/login");
  } catch {
    setStatus("Unable to reach the server", "error");
  } finally {
    submitButton.disabled = false;
  }
});