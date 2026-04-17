console.log("guest-tasks.js loaded");
import { initializeDashboard } from "/page-main.js";

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle(session) {
    return `Room B ${session.roomNumber}`;
  },
  metaEntries() {
    return [];
  },
});

const listNode = document.querySelector("#request-list");

const detailTitle = document.querySelector("#detail-title");
const detailStatus = document.querySelector("#detail-status");
const detailEta = document.querySelector("#detail-eta");
const detailNotes = document.querySelector("#detail-notes");

const taskOverlay = document.querySelector("#task-overlay");
const closeOverlayButton = document.querySelector("#close-overlay-button");

const mobileDetailTitle = document.querySelector("#mobile-detail-title");
const mobileDetailStatus = document.querySelector("#mobile-detail-status");
const mobileDetailEta = document.querySelector("#mobile-detail-eta");
const mobileDetailNotes = document.querySelector("#mobile-detail-notes");

const sendButton = document.querySelector("#send-button");
const messageInput = document.querySelector("#message-input");
const mobileSendButton = document.querySelector("#mobile-send-button");
const mobileMessageInput = document.querySelector("#mobile-message-input");

let requests = [];
let activeRequestId = null;

function isMobileView() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function openOverlay() {
  if (taskOverlay) {
    taskOverlay.hidden = false;
  }
}

function closeOverlay() {
  if (taskOverlay) {
    taskOverlay.hidden = true;
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

function formatMinutes(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value} min`;
}

function statusClass(label = "") {
  const value = String(label).toLowerCase();

  if (value.includes("received")) return "status-received";
  if (value.includes("progress")) return "status-in-progress";
  if (value.includes("delivered")) return "status-delivered";

  return "status-received";
}

function truncateText(value, maxLength = 24) {
  const text = String(value || "").trim();

  if (!text) {
    return "Request";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function setDetail(item) {
  const title = item ? item.fullRequest || "Request" : "Select a request";
  const statusText = item ? item.status?.label || "—" : "—";
  const statusClassName = item ? `status-pill ${statusClass(item.status?.label)}` : "status-pill";
  const etaText = item ? formatMinutes(item.etaMinutes) : "—";
  const notesText = item ? item.notes || "No notes." : "Choose a request on the left to view full details.";

  if (detailTitle) detailTitle.textContent = title;
  if (detailStatus) {
    detailStatus.textContent = statusText;
    detailStatus.className = statusClassName;
  }
  if (detailEta) detailEta.textContent = etaText;
  if (detailNotes) detailNotes.textContent = notesText;

  if (mobileDetailTitle) mobileDetailTitle.textContent = title;
  if (mobileDetailStatus) {
    mobileDetailStatus.textContent = statusText;
    mobileDetailStatus.className = statusClassName;
  }
  if (mobileDetailEta) mobileDetailEta.textContent = etaText;
  if (mobileDetailNotes) mobileDetailNotes.textContent = notesText;
}

function renderList() {
  if (!listNode) {
    return;
  }

  listNode.innerHTML = "";

  if (!requests.length) {
    listNode.innerHTML = `<div class="empty-list">No requests yet.</div>`;
    setDetail(null);
    return;
  }

  for (const item of requests) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "request-item";

    if (String(item.id) === String(activeRequestId)) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <p class="request-title">${truncateText(item.fullRequest)}</p>
      <div class="request-meta">
        <span class="status-pill ${statusClass(item.status?.label)}">${item.status?.label || "—"}</span>
        <span class="request-time">${formatMinutes(item.etaMinutes)}</span>
      </div>
    `;

    button.addEventListener("click", () => {
      activeRequestId = item.id;
      renderList();
      setDetail(item);

      if (isMobileView()) {
        openOverlay();
      }
    });

    listNode.append(button);
  }
}

async function loadRequests() {
  const payload = await requestJson("/api/requests");
  requests = payload.items || [];
  activeRequestId = requests[0]?.id || null;
  renderList();
  setDetail(requests[0] || null);
}

function clearMessageInputs() {
  if (messageInput) {
    messageInput.value = "";
  }

  if (mobileMessageInput) {
    mobileMessageInput.value = "";
  }
}

document.getElementById("back-home-button")?.addEventListener("click", () => {
  location.href = "/guest";
});

document.querySelector("#open-help-button")?.addEventListener("click", () => {
  window.location.assign("/guest/help");
});

closeOverlayButton?.addEventListener("click", () => {
  closeOverlay();
});

taskOverlay?.addEventListener("click", (event) => {
  if (event.target === taskOverlay) {
    closeOverlay();
  }
});

sendButton?.addEventListener("click", () => {
  clearMessageInputs();
});

mobileSendButton?.addEventListener("click", () => {
  clearMessageInputs();
});

window.addEventListener("resize", () => {
  if (!isMobileView()) {
    closeOverlay();
  }
});

await loadRequests();
closeOverlay();