import { initializeDashboard } from "/page-main.js";

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
const statusNode = document.querySelector("#staff-status");
const countNode = document.querySelector("#staff-count");
const tableBody = document.querySelector("#staff-table-body");
const idField = document.querySelector("#staff-id");
const passwordField = document.querySelector("#password");

let staffUsers = [];

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

function escapeEmpty(value) {
  return value || "-";
}

function resetForm() {
  form.reset();
  idField.value = "";
  submitButton.textContent = "Create staff user";
  formTitle.textContent = "Create staff user";
  passwordField.required = true;
  setStatus("");
}

function populateForm(staffUser) {
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
  setStatus("Editing staff user. Leave password blank to keep the current password.", "ok");
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

  if (staffUsers.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-state";
    cell.textContent = "No staff users found.";
    row.append(cell);
    tableBody.append(row);
    countNode.textContent = "0 users";
    return;
  }

  countNode.textContent = `${staffUsers.length} user${staffUsers.length === 1 ? "" : "s"}`;

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
    actionsCell.append(
      createActionButton("Edit", "secondary table-button", () => populateForm(staffUser)),
      createActionButton("Delete", "danger table-button", () => deleteStaffUser(staffUser))
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

async function loadStaffUsers() {
  const payload = await requestJson("/api/staff");
  staffUsers = payload.items || [];
  renderTable();
}

async function deleteStaffUser(staffUser) {
  const confirmed = window.confirm(`Delete ${staffUser.firstName} ${staffUser.lastName}?`);

  if (!confirmed) {
    return;
  }

  try {
    await requestJson(`/api/staff/${staffUser.id}`, {
      method: "DELETE",
    });
    setStatus("Staff user deleted.", "ok");
    if (String(staffUser.id) === idField.value) {
      resetForm();
    }
    await loadStaffUsers();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const staffId = idField.value;
  const payload = getFormPayload();
  const isEditing = Boolean(staffId);

  if (!isEditing && !payload.password) {
    setStatus("Password is required when creating a staff user.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus(isEditing ? "Updating staff user..." : "Creating staff user...", "ok");

  try {
    await requestJson(isEditing ? `/api/staff/${staffId}` : "/api/staff", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setStatus(isEditing ? "Staff user updated." : "Staff user created.", "ok");
    resetForm();
    await loadStaffUsers();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

resetButton.addEventListener("click", () => {
  resetForm();
});

if (session?.staffId) {
  await loadStaffUsers();
}