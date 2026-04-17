import { fetchWithSession, initializeDashboard, navigateTo } from "/page-main.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "can",
  "extra",
  "for",
  "get",
  "i",
  "me",
  "my",
  "need",
  "of",
  "please",
  "room",
  "send",
  "some",
  "the",
  "to",
  "up",
  "with",
  "would",
  "you",
]);

const NUMBER_WORDS = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["couple", 2],
  ["pair", 2],
]);

await initializeDashboard({
  expectedUserType: "guest",
  resolveTitle(session) {
    return String(session.roomNumber || "172");
  },
  metaEntries() {
    return [];
  },
});

const statusNode = document.querySelector("#status");
const guestMessageForm = document.querySelector("#guest-message-form");
const guestMessageInput = document.querySelector("#guest-message-input");
const guestMessageSubmitButton = document.querySelector("#guest-message-submit");
const guestItemSelect = document.querySelector("#guest-item-select");
const guestQuantitySelect = document.querySelector("#guest-quantity-select");
const guestFormStatus = document.querySelector("#guest-form-status");

let requestCatalog = [];
let suggestedItemId = "";
let suggestedQuantity = null;

if (statusNode) {
  statusNode.textContent = "";
  statusNode.className = "sr-only";
}

function setFormStatus(message, tone = "") {
  if (!guestFormStatus) {
    return;
  }

  guestFormStatus.textContent = message;
  guestFormStatus.className = `guest-form-status ${tone}`.trim();
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singularizeToken(token) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (/(ches|shes|sses|xes|zes)$/.test(token) && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenizeSearchText(value) {
  return normalizeSearchText(value)
    .split(" ")
    .map(singularizeToken)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function parseQuantityFromText(value) {
  const digitMatch = String(value || "").match(/\b(\d{1,3})\b/);

  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const tokens = normalizeSearchText(value).split(" ");

  for (const token of tokens) {
    if (NUMBER_WORDS.has(token)) {
      return NUMBER_WORDS.get(token);
    }
  }

  if (/\b(a|an)\b/i.test(String(value || ""))) {
    return 1;
  }

  return null;
}

function scoreCatalogItem(item, requestTokens, normalizedRequest) {
  const nameTokens = tokenizeSearchText(item.name);
  const categoryTokens = tokenizeSearchText(item.category);
  const unitTokens = tokenizeSearchText(item.unit);
  const normalizedName = normalizeSearchText(item.name);

  let score = 0;

  if (normalizedName && normalizedRequest.includes(normalizedName)) {
    score += 12;
  }

  for (const token of requestTokens) {
    if (nameTokens.includes(token)) {
      score += 5;
      continue;
    }

    if (categoryTokens.includes(token)) {
      score += 2;
      continue;
    }

    if (unitTokens.includes(token)) {
      score += 1;
    }
  }

  if (nameTokens.length > 0 && nameTokens.every((token) => requestTokens.includes(token))) {
    score += 4;
  }

  return score;
}

function findBestCatalogMatch(text) {
  const normalizedRequest = normalizeSearchText(text);
  const requestTokens = tokenizeSearchText(text);

  if (!normalizedRequest || requestTokens.length === 0) {
    return null;
  }

  let bestItem = null;
  let bestScore = 0;

  for (const item of requestCatalog) {
    const score = scoreCatalogItem(item, requestTokens, normalizedRequest);

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore > 0 ? bestItem : null;
}

function getCatalogItemById(value) {
  return requestCatalog.find((item) => Number(item.id) === Number(value)) || null;
}

function getSelectedCatalogItem() {
  return guestItemSelect?.value ? getCatalogItemById(guestItemSelect.value) : null;
}

function renderItemOptions() {
  if (!guestItemSelect) {
    return;
  }

  const explicitValue = guestItemSelect.value;
  const currentValue = explicitValue || "";
  const autoLabel = suggestedItemId
    ? `Auto-detect item (${getCatalogItemById(suggestedItemId)?.name || "match"})`
    : "Auto-detect item";

  guestItemSelect.innerHTML = "";

  const autoOption = document.createElement("option");
  autoOption.value = "";
  autoOption.textContent = autoLabel;
  guestItemSelect.append(autoOption);

  for (const item of requestCatalog) {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = `${item.name} (${item.availableQuantity} available)`;
    option.disabled = Number(item.availableQuantity) <= 0;
    guestItemSelect.append(option);
  }

  guestItemSelect.value = currentValue;
}

function renderQuantityOptions() {
  if (!guestQuantitySelect) {
    return;
  }

  const explicitValue = guestQuantitySelect.value;
  const selectedItem = getSelectedCatalogItem();
  const fallbackItem = getCatalogItemById(suggestedItemId);
  const effectiveItem = selectedItem || fallbackItem;
  const maxQuantity = Math.max(1, Math.min(10, Number(effectiveItem?.availableQuantity) || 10));
  const autoLabel = suggestedQuantity ? `Auto quantity (${suggestedQuantity})` : "Auto quantity";

  guestQuantitySelect.innerHTML = "";

  const autoOption = document.createElement("option");
  autoOption.value = "";
  autoOption.textContent = autoLabel;
  guestQuantitySelect.append(autoOption);

  for (let quantity = 1; quantity <= maxQuantity; quantity += 1) {
    const option = document.createElement("option");
    option.value = String(quantity);
    option.textContent = String(quantity);
    guestQuantitySelect.append(option);
  }

  if (explicitValue && Number(explicitValue) <= maxQuantity) {
    guestQuantitySelect.value = explicitValue;
  }
}

function buildRequestSummary(item, quantity) {
  if (!item) {
    return "";
  }

  const finalQuantity = Number(quantity) > 0 ? Number(quantity) : 1;
  const quantityLabel = finalQuantity === 1 ? item.unit : `${item.unit}s`;
  return `Please bring ${item.name} (${finalQuantity} ${quantityLabel}).`;
}

function syncSuggestions() {
  const currentText = guestMessageInput?.value || "";
  const matchedItem = findBestCatalogMatch(currentText);
  const parsedQuantity = parseQuantityFromText(currentText);

  suggestedItemId = matchedItem ? String(matchedItem.id) : "";
  suggestedQuantity = parsedQuantity && parsedQuantity > 0 ? parsedQuantity : null;

  renderItemOptions();
  renderQuantityOptions();

  if (currentText.trim() && matchedItem) {
    const quantityLabel = suggestedQuantity ? ` x${suggestedQuantity}` : "";
    setFormStatus(`Detected ${matchedItem.name}${quantityLabel}. You can override it below.`, "ok");
    return;
  }

  if (currentText.trim()) {
    setFormStatus("No direct inventory match detected yet. You can pick the item manually below.");
    return;
  }

  setFormStatus("");
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

async function loadRequestCatalog() {
  try {
    const payload = await requestJson("/api/requests/catalog");
    requestCatalog = payload.items || [];
    renderItemOptions();
    renderQuantityOptions();
    syncSuggestions();
  } catch (error) {
    setFormStatus("Item suggestions could not be loaded. Text requests still work.");
  }
}

guestMessageInput?.addEventListener("input", () => {
  syncSuggestions();
});

guestItemSelect?.addEventListener("change", () => {
  renderQuantityOptions();

  if (guestItemSelect.value) {
    const item = getSelectedCatalogItem();
    setFormStatus(item ? `Selected ${item.name}.` : "");
    return;
  }

  syncSuggestions();
});

guestQuantitySelect?.addEventListener("change", () => {
  if (!guestQuantitySelect.value) {
    syncSuggestions();
  }
});

guestMessageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const explicitItem = getSelectedCatalogItem();
  const detectedItem = getCatalogItemById(suggestedItemId);
  const effectiveItem = explicitItem || detectedItem;
  const explicitQuantity = guestQuantitySelect?.value ? Number(guestQuantitySelect.value) : null;
  const effectiveQuantity = explicitQuantity || suggestedQuantity || 1;
  const typedRequest = String(guestMessageInput?.value || "").trim();
  const fullRequest = typedRequest || buildRequestSummary(effectiveItem, effectiveQuantity);

  if (!fullRequest) {
    setFormStatus("Describe what you need or choose an item first.", "error");
    guestMessageInput?.focus();
    return;
  }

  guestMessageSubmitButton.disabled = true;

  try {
    const payload = {
      fullRequest,
      category: effectiveItem?.category || null,
      statusId: 1,
      notes: null,
      etaMinutes: null,
      inventoryItemId: explicitItem ? explicitItem.id : null,
      quantityRequested: explicitQuantity || suggestedQuantity || null,
    };

    const response = await requestJson("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const requestLabel = response.item?.inventoryMatch
      ? `${response.item.inventoryMatch.quantityRequested} ${response.item.inventoryMatch.name}`
      : "your request";

    setFormStatus(`Created ${requestLabel}. Open Tasks to review it.`, "ok");

    if (guestMessageInput) {
      guestMessageInput.value = "";
      guestMessageInput.blur();
    }

    if (guestItemSelect) {
      guestItemSelect.value = "";
    }

    if (guestQuantitySelect) {
      guestQuantitySelect.value = "";
    }

    suggestedItemId = "";
    suggestedQuantity = null;
    await loadRequestCatalog();
  } catch (error) {
    setFormStatus(error.message || "Request could not be created.", "error");
  } finally {
    guestMessageSubmitButton.disabled = false;
  }
});

document.querySelector("#tasks-button")?.addEventListener("click", () => {
  navigateTo("/guest/tasks");
});

document.querySelector("#help-button")?.addEventListener("click", () => {
  navigateTo("/guest/help");
});

document.querySelector("#microphone-button")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const active = button.classList.toggle("microphone-button-active");
  button.setAttribute("aria-pressed", String(active));
});

await loadRequestCatalog();