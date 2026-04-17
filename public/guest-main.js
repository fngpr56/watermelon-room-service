import { initializeDashboard } from "/page-main.js";

initializeDashboard({
  expectedUserType: "guest",
  resolveTitle(session) {
    return session.roomNumber || "B 172";
  },
  metaEntries() {
    return [];
  },
});

document.querySelector("#tasks-button")?.addEventListener("click", () => {
  window.location.assign("/guest/tasks");
});

document.querySelector("#help-button")?.addEventListener("click", () => {
  window.location.assign("/guest/help");
});

document.querySelector("#microphone-button")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const active = button.classList.toggle("microphone-button-active");
  button.setAttribute("aria-pressed", String(active));
});