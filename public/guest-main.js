import { initializeDashboard } from "/page-main.js";

initializeDashboard({
  expectedUserType: "guest",
  titlePrefix: "Welcome",
  metaEntries(session) {
    return [
      { label: "Room", value: `#${session.roomNumber}` },
      { label: "Guest", value: session.displayName },
      { label: "Access", value: "Guest portal" },
    ];
  },
});