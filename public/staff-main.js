import { initializeDashboard } from "/page-main.js";

initializeDashboard({
  expectedUserType: "staff",
  titlePrefix: "Hello",
  metaEntries(session) {
    return [
      { label: "Staff", value: session.displayName },
      { label: "Email", value: session.email },
      { label: "Role", value: session.role },
    ];
  },
});