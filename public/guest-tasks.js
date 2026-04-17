import { fetchWithSession, initializeDashboard, navigateTo } from "/page-main.js";

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle() {
    return "Guest Tasks";
  },
  metaEntries(session) {
    return [
      { label: "Room", value: `#${session.roomNumber}` },
      { label: "Guest", value: session.displayName },
      { label: "Workspace", value: "Requests" },
    ];
  },
});

const countNode = document.querySelector("#request-count");
const tableBody = document.querySelector("#request-table-body");

let requests = [];

function formatDateTime(value) {
  return value ? value.replace("T", " ") : "-";
}

function escapeEmpty(value) {
  return value || "-";
}

function renderTable() {
  tableBody.innerHTML = "";

  if (requests.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "No requests yet.";
    row.append(cell);
    tableBody.append(row);
    countNode.textContent = "0 requests";
    return;
  }

  countNode.textContent = `${requests.length} request${requests.length === 1 ? "" : "s"}`;

  for (const item of requests) {
    const row = document.createElement("tr");

    const requestedCell = document.createElement("td");
    requestedCell.textContent = formatDateTime(item.requestDate);
    row.append(requestedCell);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = escapeEmpty(item.category);
    row.append(categoryCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = item.status.label;
    row.append(statusCell);

    const etaCell = document.createElement("td");
    etaCell.textContent = item.etaMinutes === null ? "-" : `${item.etaMinutes} min`;
    row.append(etaCell);

    const notesCell = document.createElement("td");
    notesCell.textContent = escapeEmpty(item.notes);
    row.append(notesCell);

    tableBody.append(row);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetchWithSession(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

async function loadRequests() {
  const payload = await requestJson("/api/requests");
  requests = payload.items || [];
  renderTable();
}

document.querySelector("#back-home-button")?.addEventListener("click", () => {
  navigateTo("/guest");
});

document.querySelector("#open-help-button")?.addEventListener("click", () => {
  navigateTo("/guest/help");
});

await loadRequests();