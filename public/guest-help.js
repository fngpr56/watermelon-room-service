import { connectSessionSocket, fetchWithSession, initializeDashboard, navigateTo } from "/page-main.js";

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle() {
    return "Guest Help";
  },
  metaEntries(session) {
    return [
      { label: "Room", value: `#${session.roomNumber}` },
      { label: "Guest", value: session.displayName },
      { label: "Inbox", value: "Front desk conversation" },
    ];
  },
});

const threadNode = document.querySelector("#guest-conversation-thread");
const titleNode = document.querySelector("#guest-conversation-title");
const countNode = document.querySelector("#guest-message-count");
const form = document.querySelector("#guest-conversation-form");
const messageField = document.querySelector("#guest-message");
const submitButton = document.querySelector("#guest-conversation-submit-button");
const refreshButton = document.querySelector("#guest-conversation-refresh-button");
const statusNode = document.querySelector("#guest-conversation-status");

let pollHandle = null;
let conversationSocket = null;

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

function formatDateTime(value) {
  return value ? value.replace("T", " ") : "-";
}

function renderConversation(payload) {
  const messages = payload.messages || [];
  const conversation = payload.conversation || null;
  threadNode.innerHTML = "";
  countNode.textContent = `${messages.length} message${messages.length === 1 ? "" : "s"}`;

  if (!conversation) {
    titleNode.textContent = "Front desk conversation";
    const emptyState = document.createElement("div");
    emptyState.className = "empty-thread-message";
    emptyState.textContent = "Send a message to start the conversation.";
    threadNode.append(emptyState);
    return;
  }

  titleNode.textContent = `Front desk conversation for room ${conversation.roomNumber}`;

  if (messages.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-thread-message";
    emptyState.textContent = "No messages yet.";
    threadNode.append(emptyState);
    return;
  }

  for (const message of messages) {
    const article = document.createElement("article");
    article.className = `message-bubble ${message.senderType === "guest" ? "mine" : "other"} ${message.senderType}`;

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const sender = document.createElement("strong");
    sender.textContent = message.senderName;
    meta.append(sender);

    const timestamp = document.createElement("span");
    timestamp.textContent = formatDateTime(message.createdAt);
    meta.append(timestamp);

    const body = document.createElement("p");
    body.className = "message-body";
    body.textContent = message.message;

    article.append(meta, body);
    threadNode.append(article);
  }

  threadNode.scrollTop = threadNode.scrollHeight;
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

async function loadConversation(silent = false) {
  const payload = await requestJson("/api/conversations/current");
  renderConversation(payload);

  if (!silent) {
    setStatus(payload.conversation ? "Conversation loaded." : "Send a message to start the conversation.", payload.conversation ? "ok" : "");
  }
}

async function startRealtimeConversation() {
  try {
    conversationSocket = await connectSessionSocket();
    conversationSocket.on("conversation:updated", (payload) => {
      renderConversation(payload);
    });
  } catch {
    // Polling remains active if the realtime channel cannot connect.
  }
}

function startPolling() {
  if (pollHandle) {
    window.clearInterval(pollHandle);
  }

  pollHandle = window.setInterval(() => {
    loadConversation(true).catch(() => {
      // Keep the current thread visible when a background refresh fails.
    });
  }, 6000);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageField.value.trim();

  if (!message) {
    setStatus("Message cannot be empty.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Sending message...", "ok");

  try {
    const payload = await requestJson("/api/conversations/current/messages", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    messageField.value = "";
    renderConversation(payload);
    setStatus("Message sent.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener("click", async () => {
  try {
    setStatus("Refreshing conversation...", "ok");
    await loadConversation(true);
    setStatus("Conversation refreshed.", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#back-home-button")?.addEventListener("click", () => {
  navigateTo("/guest");
});

document.querySelector("#open-tasks-button")?.addEventListener("click", () => {
  navigateTo("/guest/tasks");
});

await loadConversation();
startPolling();
await startRealtimeConversation();

window.addEventListener("beforeunload", () => {
  if (pollHandle) {
    window.clearInterval(pollHandle);
  }

  if (conversationSocket) {
    conversationSocket.disconnect();
  }
});