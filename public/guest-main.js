import { initializeDashboard, navigateTo } from "/page-main.js";

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle(session) {
    return `Room ${session.roomNumber}`;
  },
  metaEntries(session) {
    return [
      { label: "Room", value: `#${session.roomNumber}` },
      { label: "Guest", value: session.displayName },
      { label: "Support", value: "Tasks and front desk help" },
    ];
  },
});

document.querySelector("#tasks-button")?.addEventListener("click", () => {
  navigateTo("/guest/tasks");
});

document.querySelector("#help-button")?.addEventListener("click", () => {
  navigateTo("/guest/help");
});

document.querySelector("#microphone-button")?.addEventListener("click", () => {
  document.querySelector("#microphone-button")?.classList.toggle("microphone-button-active");
});