import { initializeDashboard } from "/page-main.js";

initializeDashboard({
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
  window.location.assign("/guest/tasks");
});

document.querySelector("#help-button")?.addEventListener("click", () => {
  window.location.assign("/guest/help");
});

document.querySelector("#microphone-button")?.addEventListener("click", () => {
  document.querySelector("#microphone-button")?.classList.toggle("microphone-button-active");
});