import { connectSessionSocket, fetchWithSession, initializeDashboard, navigateTo } from "/page-main.js";

const STAFF_ROLE_LABELS = {
  manager: "Manager",
  front_desk: "Front Desk",
  housekeeping: "Housekeeping",
  room_service: "Room Service",
  maintenance: "Maintenance",
  attendant: "Attendant",
  receptionist: "Receptionist",
  runner: "Runner",
};

const RUNNER_STATUS_LABELS = {
  received: "Received",
  in_progress: "In Progress",
  partially_delivered: "Partially Delivered",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const session = await initializeDashboard({
  expectedUserType: "staff",
  resolveTitle() {
    return "Runner queue";
  },
  metaEntries(currentSession) {
    return [
      { label: "Runner", value: currentSession.displayName },
      { label: "Email", value: currentSession.email },
      { label: "Role", value: STAFF_ROLE_LABELS[currentSession.role] || currentSession.role },
    ];
  },
});

if (!session || session.role !== "runner") {
  navigateTo("/staff");
} else {
  const statusNode = document.querySelector("#status");
  const backStaffButton = document.querySelector("#back-staff-button");
  const refreshRunnerButton = document.querySelector("#refresh-runner-button");
  const pendingCountNode = document.querySelector("#pending-count");
  const activeCountNode = document.querySelector("#active-count");
  const resolvedCountNode = document.querySelector("#resolved-count");
  const summaryPendingValueNode = document.querySelector("#summary-pending-value");
  const summaryActiveValueNode = document.querySelector("#summary-active-value");
  const summaryResolvedValueNode = document.querySelector("#summary-resolved-value");
  const pendingTableBody = document.querySelector("#pending-table-body");
  const activeTableBody = document.querySelector("#active-table-body");
  const resolvedTableBody = document.querySelector("#resolved-table-body");

  let runnerRequests = [];
  let runnerSocket = null;
  let runnerPollHandle = null;
  let runnerRefreshHandle = null;

  function setStatus(message, tone = "") {
    statusNode.textContent = message;
    statusNode.className = `status ${tone}`.trim();
  }

  function formatDateTime(value) {
    return value ? value.replace("T", " ").slice(0, 16) : "-";
  }

  function escapeEmpty(value) {
    return value || "-";
  }

  function formatStatusLabel(status) {
    return status?.label || RUNNER_STATUS_LABELS[status?.code] || status?.code || "-";
  }

  function setCount(node, count, singularLabel) {
    node.textContent = `${count} ${singularLabel}${count === 1 ? "" : "s"}`;
  }

  function renderEmptyRow(body, colSpan, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = colSpan;
    cell.className = "empty-state";
    cell.textContent = message;
    row.append(cell);
    body.append(row);
  }

  function getPendingRequests() {
    return runnerRequests.filter((request) => request.status.code === "received");
  }

  function getMyActiveRequests() {
    return runnerRequests.filter(
      (request) =>
        ["in_progress", "partially_delivered"].includes(request.status.code) &&
        Number(request.staff.id) === Number(session.staffId)
    );
  }

  function getResolvedRequests() {
    return runnerRequests
      .filter(
        (request) =>
          ["delivered", "rejected", "cancelled"].includes(request.status.code) &&
          Number(request.staff.id) === Number(session.staffId)
      )
      .slice(0, 12);
  }

  function createStatusBadge(status) {
    const badge = document.createElement("span");
    const statusCode = String(status?.code || "received").replace(/[^a-z0-9_]+/gi, "-");
    badge.className = `runner-status-badge runner-status-${statusCode}`;
    badge.textContent = formatStatusLabel(status);
    return badge;
  }

  function renderItems(items) {
    const list = document.createElement("div");
    list.className = "runner-item-list";

    for (const item of items) {
      const pill = document.createElement("span");
      pill.className = "runner-item-pill";
      pill.textContent = `${item.quantityRequested} x ${item.inventoryItem.name}`;
      list.append(pill);
    }

    return list;
  }

  function createActionButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", () => {
      button.disabled = true;
      onClick(button).catch(() => {
        button.disabled = false;
      });
    });
    return button;
  }

  function renderPendingTable() {
    const pendingRequests = getPendingRequests();
    pendingTableBody.innerHTML = "";
    setCount(pendingCountNode, pendingRequests.length, "request");

    if (pendingRequests.length === 0) {
      renderEmptyRow(pendingTableBody, 6, "No pending runner requests right now.");
      return;
    }

    for (const request of pendingRequests) {
      const row = document.createElement("tr");

      const requestedCell = document.createElement("td");
      requestedCell.textContent = formatDateTime(request.requestDate);
      row.append(requestedCell);

      const roomCell = document.createElement("td");
      roomCell.textContent = request.room.displayName;
      row.append(roomCell);

      const itemsCell = document.createElement("td");
      itemsCell.append(renderItems(request.items));
      row.append(itemsCell);

      const requestCell = document.createElement("td");
      requestCell.className = "runner-request-copy";
      requestCell.textContent = request.fullRequest;
      row.append(requestCell);

      const statusCell = document.createElement("td");
      statusCell.append(createStatusBadge(request.status));
      row.append(statusCell);

      const actionsCell = document.createElement("td");
      actionsCell.className = "table-actions";
      actionsCell.append(
        createActionButton("Accept", "primary table-button", async (button) => {
          await handleRunnerAction(request.id, "accept", "Accepting runner request...", "Runner request accepted.");
          button.disabled = false;
        }),
        createActionButton("Decline", "danger table-button", async (button) => {
          await handleRunnerAction(request.id, "decline", "Declining runner request...", "Runner request declined.");
          button.disabled = false;
        })
      );
      row.append(actionsCell);

      pendingTableBody.append(row);
    }
  }

  function renderActiveTable() {
    const activeRequests = getMyActiveRequests();
    activeTableBody.innerHTML = "";
    setCount(activeCountNode, activeRequests.length, "request");

    if (activeRequests.length === 0) {
      renderEmptyRow(activeTableBody, 5, "You do not have any active runner deliveries.");
      return;
    }

    for (const request of activeRequests) {
      const row = document.createElement("tr");

      const acceptedCell = document.createElement("td");
      acceptedCell.textContent = formatDateTime(request.updatedAt || request.requestDate);
      row.append(acceptedCell);

      const roomCell = document.createElement("td");
      roomCell.textContent = request.room.displayName;
      row.append(roomCell);

      const itemsCell = document.createElement("td");
      itemsCell.append(renderItems(request.items));
      row.append(itemsCell);

      const statusCell = document.createElement("td");
      statusCell.append(createStatusBadge(request.status));
      row.append(statusCell);

      const actionsCell = document.createElement("td");
      actionsCell.className = "table-actions";
      actionsCell.append(
        createActionButton("Mark delivered", "primary table-button", async (button) => {
          await handleRunnerAction(request.id, "complete", "Completing delivery...", "Runner delivery marked completed.");
          button.disabled = false;
        })
      );
      row.append(actionsCell);

      activeTableBody.append(row);
    }
  }

  function renderResolvedTable() {
    const resolvedRequests = getResolvedRequests();
    resolvedTableBody.innerHTML = "";
    setCount(resolvedCountNode, resolvedRequests.length, "request");

    if (resolvedRequests.length === 0) {
      renderEmptyRow(resolvedTableBody, 5, "No resolved runner requests yet.");
      return;
    }

    for (const request of resolvedRequests) {
      const row = document.createElement("tr");

      const closedCell = document.createElement("td");
      closedCell.textContent = formatDateTime(request.completeDate || request.updatedAt || request.requestDate);
      row.append(closedCell);

      const roomCell = document.createElement("td");
      roomCell.textContent = request.room.displayName;
      row.append(roomCell);

      const itemsCell = document.createElement("td");
      itemsCell.append(renderItems(request.items));
      row.append(itemsCell);

      const outcomeCell = document.createElement("td");
      outcomeCell.append(createStatusBadge(request.status));
      row.append(outcomeCell);

      const notesCell = document.createElement("td");
      notesCell.textContent = escapeEmpty(request.notes);
      row.append(notesCell);

      resolvedTableBody.append(row);
    }
  }

  function renderSummary() {
    summaryPendingValueNode.textContent = String(getPendingRequests().length);
    summaryActiveValueNode.textContent = String(getMyActiveRequests().length);
    summaryResolvedValueNode.textContent = String(getResolvedRequests().length);
  }

  function renderRunnerTables() {
    renderSummary();
    renderPendingTable();
    renderActiveTable();
    renderResolvedTable();
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

  async function loadRunnerRequests() {
    const payload = await requestJson("/api/runner/requests");
    runnerRequests = payload.items || [];
    renderRunnerTables();
  }

  function scheduleRunnerRefresh() {
    if (runnerRefreshHandle) {
      window.clearTimeout(runnerRefreshHandle);
    }

    runnerRefreshHandle = window.setTimeout(() => {
      runnerRefreshHandle = null;
      loadRunnerRequests().catch(() => {
        // Polling remains active if a realtime-triggered refresh fails.
      });
    }, 120);
  }

  async function handleRunnerAction(requestId, action, busyMessage, successMessage) {
    setStatus(busyMessage, "ok");

    try {
      await requestJson(`/api/runner/requests/${requestId}/${action}`, {
        method: "POST",
      });
      await loadRunnerRequests();
      setStatus(successMessage, "ok");
    } catch (error) {
      setStatus(error.message, "error");
      throw error;
    }
  }

  function startRunnerPolling() {
    if (runnerPollHandle) {
      window.clearInterval(runnerPollHandle);
    }

    runnerPollHandle = window.setInterval(() => {
      loadRunnerRequests().catch(() => {
        // Keep the current runner queue visible on transient refresh failures.
      });
    }, 8000);
  }

  async function startRealtimeRunnerUpdates() {
    try {
      runnerSocket = await connectSessionSocket();
      runnerSocket.on("runner:request-updated", () => {
        scheduleRunnerRefresh();
      });
    } catch {
      // Polling remains active if realtime runner updates cannot connect.
    }
  }

  backStaffButton?.addEventListener("click", () => {
    navigateTo("/staff");
  });

  refreshRunnerButton?.addEventListener("click", async () => {
    try {
      setStatus("Refreshing runner queue...", "ok");
      await loadRunnerRequests();
      setStatus("Runner queue refreshed.", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  if (session?.staffId) {
    await loadRunnerRequests();
    setStatus("Runner queue ready.", "ok");
    startRunnerPolling();
    await startRealtimeRunnerUpdates();
  }

  window.addEventListener("beforeunload", () => {
    if (runnerPollHandle) {
      window.clearInterval(runnerPollHandle);
    }

    if (runnerRefreshHandle) {
      window.clearTimeout(runnerRefreshHandle);
    }

    if (runnerSocket) {
      runnerSocket.disconnect();
    }
  });
}