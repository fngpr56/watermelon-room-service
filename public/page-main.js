async function fetchSession() {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    window.location.assign("/login");
    return null;
  }

  const payload = await response.json();
  return payload.session;
}

function renderMeta(entries) {
  const meta = document.querySelector("#meta");

  meta.innerHTML = entries
    .map(
      (entry) => `
        <article class="meta-card">
          <strong>${entry.label}</strong>
          <p>${entry.value}</p>
        </article>
      `
    )
    .join("");
}

async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  window.location.assign("/login");
}

export async function initializeDashboard({ expectedUserType, titlePrefix, metaEntries }) {
  const session = await fetchSession();

  if (!session || session.userType !== expectedUserType) {
    window.location.assign("/login");
    return;
  }

  const title = document.querySelector("#page-title");
  const logoutButton = document.querySelector("#logout-button");
  const statusNode = document.querySelector("#status");

  title.textContent = `${titlePrefix}, ${session.displayName}`;
  renderMeta(metaEntries(session));
  statusNode.textContent = "Authenticated with a signed HTTP-only session cookie.";
  statusNode.className = "status ok";

  logoutButton?.addEventListener("click", () => {
    logout();
  });
}