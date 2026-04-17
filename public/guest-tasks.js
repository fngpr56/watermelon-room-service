import { initializeDashboard } from "/page-main.js";

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

const form = document.querySelector("#request-form");
const formTitle = document.querySelector("#request-form-title");
const requestIdField = document.querySelector("#request-id");
const statusSelect = document.querySelector("#statusId");
const submitButton = document.querySelector("#submit-request-button");
const resetButton = document.querySelector("#reset-request-button");
const statusNode = document.querySelector("#request-status");
const countNode = document.querySelector("#request-count");
const tableBody = document.querySelector("#request-table-body");

let requests = [];
let statuses = [];

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

function formatDateTime(value) {
  return value ? value.replace("T", " ") : "-";
}

function escapeEmpty(value) {
  return value || "-";
}

function getDefaultStatusId() {
  const received = statuses.find((item) => item.code === "received");
  return String(received?.id || statuses[0]?.id || "");
}

function renderStatusOptions(selectedId = getDefaultStatusId()) {
  statusSelect.innerHTML = "";

  for (const status of statuses) {
    const option = document.createElement("option");
    option.value = String(status.id);
    option.textContent = status.label;
    statusSelect.append(option);
  }

  statusSelect.value = String(selectedId || getDefaultStatusId());
}

function resetForm() {
  form.reset();
  requestIdField.value = "";
  formTitle.textContent = "Create request";
  submitButton.textContent = "Create request";

  if (statuses.length > 0) {
    renderStatusOptions();
  }

  setStatus("");
}

function populateForm(item) {
  requestIdField.value = item.id;
  form.fullRequest.value = item.fullRequest;
  form.category.value = item.category || "";
  form.statusId.value = String(item.status.id);
  form.etaMinutes.value = item.etaMinutes ?? "";
  form.notes.value = item.notes || "";
  formTitle.textContent = "Edit request";
  submitButton.textContent = "Update request";
  setStatus("Editing request record.", "ok");
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderTable() {
  tableBody.innerHTML = "";

  if (requests.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
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

    const actionsCell = document.createElement("td");
    actionsCell.className = "table-actions";
    actionsCell.append(
      createActionButton("Edit", "secondary table-button", () => populateForm(item)),
      createActionButton("Delete", "danger table-button", () => deleteRequest(item))
    );
    row.append(actionsCell);

    tableBody.append(row);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
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

async function loadStatuses() {
  const payload = await requestJson("/api/statuses");
  statuses = payload.items || [];

  if (statuses.length === 0) {
    submitButton.disabled = true;
    setStatus("No request statuses are available. Import the schema seed data first.", "error");
    return;
  }

  submitButton.disabled = false;
  renderStatusOptions();
}

async function loadRequests() {
  const payload = await requestJson("/api/requests");
  requests = payload.items || [];
  renderTable();
}

function getPayload() {
  const formData = new FormData(form);
  const rawEta = String(formData.get("etaMinutes") || "").trim();

  return {
    fullRequest: String(formData.get("fullRequest") || "").trim(),
    category: String(formData.get("category") || "").trim() || null,
    statusId: Number(formData.get("statusId") || 0),
    etaMinutes: rawEta ? Number(rawEta) : null,
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

async function deleteRequest(item) {
  const confirmed = window.confirm("Delete this request?");

  if (!confirmed) {
    return;
  }

  try {
    await requestJson(`/api/requests/${item.id}`, {
      method: "DELETE",
    });

    if (requestIdField.value === item.id) {
      resetForm();
    }

    setStatus("Request deleted.", "ok");
    await loadRequests();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const requestId = requestIdField.value;
  const isEditing = Boolean(requestId);
  const payload = getPayload();

  submitButton.disabled = true;
  setStatus(isEditing ? "Updating request..." : "Creating request...", "ok");

  try {
    await requestJson(isEditing ? `/api/requests/${requestId}` : "/api/requests", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setStatus(isEditing ? "Request updated." : "Request created.", "ok");
    resetForm();
    await loadRequests();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

resetButton.addEventListener("click", () => {
  resetForm();
});

document.querySelector("#back-home-button")?.addEventListener("click", () => {
  window.location.assign("/guest");
});

document.querySelector("#open-help-button")?.addEventListener("click", () => {
  window.location.assign("/guest/help");
});

await Promise.all([loadStatuses(), loadRequests()]);
resetForm();