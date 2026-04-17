import { initializeDashboard, navigateTo } from "/page-main.js";

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle(session) {
    return String(session.roomNumber || "172");
  },
  metaEntries() {
    return [];
  },
});

document.querySelector("#tasks-button")?.addEventListener("click", () => {
  navigateTo("/guest/tasks");
});

document.querySelector("#help-button")?.addEventListener("click", () => {
  navigateTo("/guest/help");
});

document.querySelector("#microphone-button")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const active = button.classList.toggle("microphone-button-active");
  button.setAttribute("aria-pressed", String(active));
});