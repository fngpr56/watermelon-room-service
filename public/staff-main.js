import { connectSessionSocket, fetchWithSession, initializeDashboard } from "/page-main.js";

const session = await initializeDashboard({
  expectedUserType: "staff",
  titlePrefix: "Hello",
  metaEntries(currentSession) {
    return [
      { label: "Staff", value: currentSession.displayName },
      { label: "Email", value: currentSession.email },
      { label: "Role", value: currentSession.role },
    ];
  },
});

const form = document.querySelector("#staff-form");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-staff-button");
const resetButton = document.querySelector("#reset-staff-button");
const staffStatusNode = document.querySelector("#staff-status");
const staffCountNode = document.querySelector("#staff-count");
const staffTableBody = document.querySelector("#staff-table-body");
const idField = document.querySelector("#staff-id");
const passwordField = document.querySelector("#password");
const togglePasswordButton = document.querySelector("#staff-toggle-password-button");

const roomForm = document.querySelector("#room-form");
const roomFormTitle = document.querySelector("#room-form-title");
const roomSubmitButton = document.querySelector("#submit-room-button");
const roomResetButton = document.querySelector("#reset-room-button");
const roomStatusNode = document.querySelector("#room-status");
const roomCountNode = document.querySelector("#room-count");
const roomTableBody = document.querySelector("#room-table-body");
const roomIdField = document.querySelector("#room-id");
const roomPasswordField = document.querySelector("#roomPassword");

const conversationListNode = document.querySelector("#conversation-list");
const conversationCountNode = document.querySelector("#conversation-count");
const conversationTitleNode = document.querySelector("#conversation-title");
const conversationSubtitleNode = document.querySelector("#conversation-subtitle");
const conversationThreadNode = document.querySelector("#conversation-thread");
const conversationForm = document.querySelector("#conversation-form");
const conversationMessageField = document.querySelector("#conversation-message");
const conversationSubmitButton = document.querySelector("#conversation-submit-button");
const conversationRefreshButton = document.querySelector("#conversation-refresh-button");
const conversationStatusNode = document.querySelector("#conversation-status");

let staffUsers = [];
let rooms = [];
let conversations = [];
let activeConversationId = null;
let currentConversation = null;
let conversationPollHandle = null;
let conversationSocket = null;

function setStatus(node, message, tone = "") {
  node.textContent = message;
  node.className = `status ${tone}`.trim();
}

function escapeEmpty(value) {
  return value || "-";
}

function formatDateTime(value) {
  return value ? value.replace("T", " ") : "-";
}

function formatCompactDateTime(value) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function resetStaffPasswordVisibility() {
  passwordField.type = "password";

  if (!togglePasswordButton) {
    return;
  }

  togglePasswordButton.textContent = "Show";
  togglePasswordButton.setAttribute("aria-label", "Show password");
}

function resetStaffForm() {
  form.reset();
  idField.value = "";
  submitButton.textContent = "Create staff user";
  formTitle.textContent = "Create staff user";
  passwordField.required = true;
  resetStaffPasswordVisibility();
  setStatus(staffStatusNode, "");
}

function resetRoomForm() {
  roomForm.reset();
  roomIdField.value = "";
  roomSubmitButton.textContent = "Create room";
  roomFormTitle.textContent = "Create room";
  roomPasswordField.required = true;
  setStatus(roomStatusNode, "");
}

function populateStaffForm(staffUser) {
  idField.value = String(staffUser.id);
  form.firstName.value = staffUser.firstName;
  form.lastName.value = staffUser.lastName;
  form.mailAddress.value = staffUser.mailAddress;
  form.password.value = "";
  form.birthday.value = staffUser.birthday || "";
  form.phoneNumber.value = staffUser.phoneNumber || "";
  form.role.value = staffUser.role;
  form.dateStart.value = staffUser.dateStart;
  form.completedRequest.value = String(staffUser.completedRequest);
  submitButton.textContent = "Update staff user";
  formTitle.textContent = `Edit ${staffUser.firstName} ${staffUser.lastName}`;
  passwordField.required = false;
  resetStaffPasswordVisibility();
  setStatus(staffStatusNode, "Editing staff user. Leave password blank to keep the current password.", "ok");
}

function populateRoomForm(room) {
  roomIdField.value = String(room.id);
  roomForm.roomNumber.value = String(room.roomNumber);
  roomForm.owner.value = room.owner || "";
  roomForm.password.value = "";
  roomForm.dateIn.value = room.dateIn || "";
  roomForm.dateOut.value = room.dateOut || "";
  roomSubmitButton.textContent = "Update room";
  roomFormTitle.textContent = `Edit room ${room.roomNumber}`;
  roomPasswordField.required = false;
  setStatus(roomStatusNode, "Editing room. Leave password blank to keep the current password.", "ok");
}

function createActionButton(label, className, onClick, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.disabled = Boolean(options.disabled);

  if (options.title) {
    button.title = options.title;
  }

  button.addEventListener("click", onClick);
  return button;
}

function renderStaffTable() {
  staffTableBody.innerHTML = "";

  if (staffUsers.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-state";
    cell.textContent = "No staff users found.";
    row.append(cell);
    staffTableBody.append(row);
    staffCountNode.textContent = "0 users";
    return;
  }

  staffCountNode.textContent = `${staffUsers.length} user${staffUsers.length === 1 ? "" : "s"}`;

  for (const staffUser of staffUsers) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = `${staffUser.firstName} ${staffUser.lastName}`;
    row.append(nameCell);

    const emailCell = document.createElement("td");
    emailCell.textContent = staffUser.mailAddress;
    row.append(emailCell);

    const roleCell = document.createElement("td");
    roleCell.textContent = staffUser.role;
    row.append(roleCell);

    const phoneCell = document.createElement("td");
    phoneCell.textContent = escapeEmpty(staffUser.phoneNumber);
    row.append(phoneCell);

    const startCell = document.createElement("td");
    startCell.textContent = staffUser.dateStart;
    row.append(startCell);

    const completedCell = document.createElement("td");
    completedCell.textContent = String(staffUser.completedRequest);
    row.append(completedCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "table-actions";
    const isCurrentUser = Number(staffUser.id) === Number(session.staffId);
    actionsCell.append(
      createActionButton("Edit", "secondary table-button", () => populateStaffForm(staffUser)),
      createActionButton("Delete", "danger table-button", () => deleteStaffUser(staffUser), {
        disabled: isCurrentUser,
        title: isCurrentUser ? "You cannot delete your own active staff account." : "Delete this staff user",
      })
    );
    row.append(actionsCell);

    staffTableBody.append(row);
  }
}

function renderRoomTable() {
  roomTableBody.innerHTML = "";

  if (rooms.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "No rooms found.";
    row.append(cell);
    roomTableBody.append(row);
    roomCountNode.textContent = "0 rooms";
    return;
  }

  roomCountNode.textContent = `${rooms.length} room${rooms.length === 1 ? "" : "s"}`;

  for (const room of rooms) {
    const row = document.createElement("tr");

    const roomNumberCell = document.createElement("td");
    roomNumberCell.textContent = String(room.roomNumber);
    row.append(roomNumberCell);

    const ownerCell = document.createElement("td");
    ownerCell.textContent = escapeEmpty(room.owner);
    row.append(ownerCell);

    const dateInCell = document.createElement("td");
    dateInCell.textContent = formatDateTime(room.dateIn);
    row.append(dateInCell);

    const dateOutCell = document.createElement("td");
    dateOutCell.textContent = formatDateTime(room.dateOut);
    row.append(dateOutCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "table-actions";
    actionsCell.append(
      createActionButton("Edit", "secondary table-button", () => populateRoomForm(room)),
      createActionButton("Delete", "danger table-button", () => deleteRoom(room))
    );
    row.append(actionsCell);

    roomTableBody.append(row);
  }
}

function renderConversationList() {
  conversationListNode.innerHTML = "";

  if (conversations.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "tile empty-list-state";
    emptyState.textContent = "No guest conversations yet.";
    conversationListNode.append(emptyState);
    conversationCountNode.textContent = "0 conversations";
    return;
  }

  conversationCountNode.textContent = `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`;

  for (const conversation of conversations) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation-item ${activeConversationId === conversation.id ? "active" : ""}`.trim();
    button.addEventListener("click", () => {
      loadConversationDetails(conversation.id);
    });

    const header = document.createElement("div");
    header.className = "conversation-item-header";

    const title = document.createElement("strong");
    title.textContent = conversation.roomDisplayName;
    header.append(title);

    const roomLabel = document.createElement("span");
    roomLabel.className = "conversation-item-tag";
    roomLabel.textContent = `Room ${conversation.roomNumber}`;
    header.append(roomLabel);

    const preview = document.createElement("p");
    preview.className = "conversation-preview";
    preview.textContent = conversation.lastMessagePreview || "No messages yet.";

    const meta = document.createElement("div");
    meta.className = "conversation-item-meta";
    meta.textContent = [
      conversation.assignedStaffName ? `Assigned: ${conversation.assignedStaffName}` : "Unassigned",
      `${conversation.messageCount} message${conversation.messageCount === 1 ? "" : "s"}`,
      formatCompactDateTime(conversation.lastMessageAt),
    ].join(" • ");

    button.append(header, preview, meta);
    conversationListNode.append(button);
  }
}

function renderConversationThread(payload) {
  conversationThreadNode.innerHTML = "";
  currentConversation = payload?.conversation || null;

  if (!currentConversation) {
    conversationTitleNode.textContent = "Select a conversation";
    conversationSubtitleNode.textContent = "Choose a guest help thread from the list to read messages.";
    const emptyState = document.createElement("div");
    emptyState.className = "empty-thread-message";
    emptyState.textContent = "No conversation selected.";
    conversationThreadNode.append(emptyState);
    updateConversationComposerState();
    return;
  }

  conversationTitleNode.textContent = `${currentConversation.roomDisplayName} conversation`;
  conversationSubtitleNode.textContent = currentConversation.assignedStaffName
    ? `Assigned to ${currentConversation.assignedStaffName}. Only front desk staff can reply.`
    : "Unassigned conversation. Only front desk staff can reply.";

  const messages = payload.messages || [];

  if (messages.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-thread-message";
    emptyState.textContent = "No messages yet.";
    conversationThreadNode.append(emptyState);
    updateConversationComposerState();
    return;
  }

  for (const message of messages) {
    const article = document.createElement("article");
    const isMine = message.senderType === "staff" && Number(message.staffId) === Number(session.staffId);
    article.className = `message-bubble ${isMine ? "mine" : "other"} ${message.senderType}`;

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
    conversationThreadNode.append(article);
  }

  conversationThreadNode.scrollTop = conversationThreadNode.scrollHeight;
  updateConversationComposerState();
}

function updateConversationComposerState() {
  const hasConversation = Boolean(currentConversation?.id);
  const canReply = hasConversation && session.role === "front_desk";

  conversationMessageField.disabled = !canReply;
  conversationSubmitButton.disabled = !canReply;

  if (!hasConversation) {
    setStatus(conversationStatusNode, "Select a conversation to reply.");
    return;
  }

  if (session.role !== "front_desk") {
    setStatus(conversationStatusNode, "Only staff with the front_desk role can answer guest questions.", "error");
    return;
  }

  setStatus(conversationStatusNode, "");
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

function getFormPayload() {
  const formData = new FormData(form);
  const payload = {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    mailAddress: String(formData.get("mailAddress") || "").trim(),
    password: String(formData.get("password") || ""),
    birthday: String(formData.get("birthday") || "").trim(),
    phoneNumber: String(formData.get("phoneNumber") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    dateStart: String(formData.get("dateStart") || "").trim(),
    completedRequest: Number(formData.get("completedRequest") || 0),
  };

  if (!payload.birthday) {
    payload.birthday = null;
  }

  if (!payload.phoneNumber) {
    payload.phoneNumber = null;
  }

  if (!payload.password) {
    delete payload.password;
  }

  return payload;
}

function getRoomPayload() {
  const formData = new FormData(roomForm);
  const payload = {
    roomNumber: Number(formData.get("roomNumber") || 0),
    owner: String(formData.get("owner") || "").trim(),
    password: String(formData.get("password") || ""),
    dateIn: String(formData.get("dateIn") || "").trim(),
    dateOut: String(formData.get("dateOut") || "").trim(),
  };

  if (!payload.owner) {
    payload.owner = null;
  }

  if (!payload.dateIn) {
    payload.dateIn = null;
  }

  if (!payload.dateOut) {
    payload.dateOut = null;
  }

  if (!payload.password) {
    delete payload.password;
  }

  return payload;
}

async function loadStaffUsers() {
  const payload = await requestJson("/api/staff");
  staffUsers = payload.items || [];
  renderStaffTable();
}

async function loadRooms() {
  const payload = await requestJson("/api/rooms");
  rooms = payload.items || [];
  renderRoomTable();
}

async function loadConversations() {
  const payload = await requestJson("/api/conversations");
  conversations = payload.items || [];
  renderConversationList();

  if (!conversations.some((item) => item.id === activeConversationId)) {
    activeConversationId = conversations[0]?.id || null;
  }

  if (!activeConversationId) {
    renderConversationThread(null);
  }
}

async function loadConversationDetails(conversationId) {
  activeConversationId = conversationId;
  renderConversationList();

  try {
    const payload = await requestJson(`/api/conversations/${conversationId}`);
    renderConversationThread(payload);
  } catch (error) {
    setStatus(conversationStatusNode, error.message, "error");
  }
}

async function refreshConversationState() {
  await loadConversations();

  if (activeConversationId) {
    await loadConversationDetails(activeConversationId);
  }
}

async function handleRealtimeConversationUpdate(payload) {
  const updatedConversationId = Number(payload?.conversation?.id || 0);
  const hadActiveConversation = Boolean(activeConversationId);

  await loadConversations();

  if (!hadActiveConversation && updatedConversationId > 0) {
    activeConversationId = updatedConversationId;
    renderConversationList();
  }

  if (updatedConversationId > 0 && Number(activeConversationId) === updatedConversationId) {
    renderConversationThread(payload);
  }
}

function startConversationPolling() {
  if (conversationPollHandle) {
    window.clearInterval(conversationPollHandle);
  }

  conversationPollHandle = window.setInterval(() => {
    refreshConversationState().catch(() => {
      // Keep the current UI visible on transient polling errors.
    });
  }, 8000);
}

async function startRealtimeConversationUpdates() {
  try {
    conversationSocket = await connectSessionSocket();
    conversationSocket.on("conversation:updated", (payload) => {
      handleRealtimeConversationUpdate(payload).catch(() => {
        // Polling remains as a fallback path if realtime refresh work fails.
      });
    });
  } catch {
    // Polling remains active if the realtime channel cannot connect.
  }
}

async function deleteStaffUser(staffUser) {
  if (Number(staffUser.id) === Number(session.staffId)) {
    setStatus(staffStatusNode, "You cannot delete your own active staff account.", "error");
    return;
  }

  const confirmed = window.confirm(`Delete ${staffUser.firstName} ${staffUser.lastName}?`);

  if (!confirmed) {
    return;
  }

  try {
    await requestJson(`/api/staff/${staffUser.id}`, {
      method: "DELETE",
    });
    setStatus(staffStatusNode, "Staff user deleted.", "ok");

    if (String(staffUser.id) === idField.value) {
      resetStaffForm();
    }

    await loadStaffUsers();
  } catch (error) {
    setStatus(staffStatusNode, error.message, "error");
  }
}

async function deleteRoom(room) {
  const confirmed = window.confirm(`Delete room ${room.roomNumber}?`);

  if (!confirmed) {
    return;
  }

  try {
    await requestJson(`/api/rooms/${room.id}`, {
      method: "DELETE",
    });
    setStatus(roomStatusNode, "Room deleted.", "ok");

    if (String(room.id) === roomIdField.value) {
      resetRoomForm();
    }

    await loadRooms();
  } catch (error) {
    setStatus(roomStatusNode, error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const staffId = idField.value;
  const payload = getFormPayload();
  const isEditing = Boolean(staffId);

  if (!isEditing && !payload.password) {
    setStatus(staffStatusNode, "Password is required when creating a staff user.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus(staffStatusNode, isEditing ? "Updating staff user..." : "Creating staff user...", "ok");

  try {
    await requestJson(isEditing ? `/api/staff/${staffId}` : "/api/staff", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setStatus(staffStatusNode, isEditing ? "Staff user updated." : "Staff user created.", "ok");
    resetStaffForm();
    await loadStaffUsers();
  } catch (error) {
    setStatus(staffStatusNode, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const roomId = roomIdField.value;
  const payload = getRoomPayload();
  const isEditing = Boolean(roomId);

  if (!isEditing && !payload.password) {
    setStatus(roomStatusNode, "Password is required when creating a room.", "error");
    return;
  }

  roomSubmitButton.disabled = true;
  setStatus(roomStatusNode, isEditing ? "Updating room..." : "Creating room...", "ok");

  try {
    await requestJson(isEditing ? `/api/rooms/${roomId}` : "/api/rooms", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setStatus(roomStatusNode, isEditing ? "Room updated." : "Room created.", "ok");
    resetRoomForm();
    await loadRooms();
  } catch (error) {
    setStatus(roomStatusNode, error.message, "error");
  } finally {
    roomSubmitButton.disabled = false;
  }
});

conversationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activeConversationId) {
    setStatus(conversationStatusNode, "Select a conversation to reply.", "error");
    return;
  }

  if (session.role !== "front_desk") {
    setStatus(conversationStatusNode, "Only front desk staff can answer guest questions.", "error");
    return;
  }

  const message = conversationMessageField.value.trim();

  if (!message) {
    setStatus(conversationStatusNode, "Reply cannot be empty.", "error");
    return;
  }

  conversationSubmitButton.disabled = true;
  setStatus(conversationStatusNode, "Sending reply...", "ok");

  try {
    const payload = await requestJson(`/api/conversations/${activeConversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    conversationMessageField.value = "";
    renderConversationThread(payload);
    await loadConversations();
    setStatus(conversationStatusNode, "Reply sent.", "ok");
  } catch (error) {
    setStatus(conversationStatusNode, error.message, "error");
  } finally {
    updateConversationComposerState();
  }
});

togglePasswordButton?.addEventListener("click", () => {
  const isHidden = passwordField.type === "password";

  passwordField.type = isHidden ? "text" : "password";
  togglePasswordButton.textContent = isHidden ? "Hide" : "Show";
  togglePasswordButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

resetButton.addEventListener("click", () => {
  resetStaffForm();
});

roomResetButton.addEventListener("click", () => {
  resetRoomForm();
});

conversationRefreshButton.addEventListener("click", async () => {
  try {
    setStatus(conversationStatusNode, "Refreshing conversations...", "ok");
    await refreshConversationState();
    setStatus(conversationStatusNode, "Conversation list refreshed.", "ok");
  } catch (error) {
    setStatus(conversationStatusNode, error.message, "error");
  }
});

if (session?.staffId) {
  await Promise.all([loadStaffUsers(), loadRooms(), loadConversations()]);

  if (activeConversationId) {
    await loadConversationDetails(activeConversationId);
  } else {
    renderConversationThread(null);
  }

  startConversationPolling();
  await startRealtimeConversationUpdates();
}

window.addEventListener("beforeunload", () => {
  if (conversationPollHandle) {
    window.clearInterval(conversationPollHandle);
  }

  if (conversationSocket) {
    conversationSocket.disconnect();
  }
});