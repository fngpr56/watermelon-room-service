export const SESSION_STORAGE_KEY = "wrs_session_token";
export const SESSION_QUERY_PARAM = "session";
export const SESSION_HEADER_NAME = "x-wrs-session";

let socketClientLoader = null;

export function setSessionToken(sessionToken) {
  if (!sessionToken) {
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
}

export function clearSessionToken() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getSessionToken() {
  const currentUrl = new URL(window.location.href);
  const urlToken = currentUrl.searchParams.get(SESSION_QUERY_PARAM);

  if (urlToken) {
    setSessionToken(urlToken);
    return urlToken;
  }

  return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
}

function syncSessionTokenInUrl(sessionToken = getSessionToken()) {
  if (!sessionToken) {
    return;
  }

  const currentUrl = new URL(window.location.href);

  if (currentUrl.searchParams.get(SESSION_QUERY_PARAM) === sessionToken) {
    return;
  }

  currentUrl.searchParams.set(SESSION_QUERY_PARAM, sessionToken);
  window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

export function withSessionPath(pathname, sessionToken = getSessionToken()) {
  const targetUrl = new URL(pathname, window.location.origin);

  if (sessionToken) {
    targetUrl.searchParams.set(SESSION_QUERY_PARAM, sessionToken);
  } else {
    targetUrl.searchParams.delete(SESSION_QUERY_PARAM);
  }

  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

export function navigateTo(pathname, options = {}) {
  if (options.includeSession === false) {
    window.location.assign(pathname);
    return;
  }

  window.location.assign(withSessionPath(pathname, options.sessionToken));
}

export function getSessionHeaders(headers = {}) {
  const normalizedHeaders = new Headers(headers);
  const sessionToken = getSessionToken();

  if (sessionToken) {
    normalizedHeaders.set(SESSION_HEADER_NAME, sessionToken);
  }

  return normalizedHeaders;
}

export async function fetchWithSession(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: getSessionHeaders(options.headers || {}),
  });
}

async function fetchSession() {
  const response = await fetchWithSession("/api/auth/me");

  if (!response.ok) {
    clearSessionToken();
    navigateTo("/login", { includeSession: false });
    return null;
  }

  const payload = await response.json();
  return payload.session;
}

function renderMeta(entries) {
  const meta = document.querySelector("#meta");

  meta.innerHTML = entries
    .map(
      (entry) => `
        <article class="meta-card">
          <strong>${entry.label}</strong>
          <p>${entry.value}</p>
        </article>
      `
    )
    .join("");
}

async function logout() {
  try {
    await fetchWithSession("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    clearSessionToken();
    navigateTo("/login", { includeSession: false });
  }
}

export async function loadSocketClient() {
  if (window.io) {
    return window.io;
  }

  if (!socketClientLoader) {
    socketClientLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/socket.io/socket.io.js";
      script.async = true;
      script.onload = () => resolve(window.io);
      script.onerror = () => reject(new Error("Unable to load Socket.IO client"));
      document.head.append(script);
    });
  }

  return socketClientLoader;
}

export async function connectSessionSocket(options = {}) {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    throw new Error("Missing session token");
  }

  const io = await loadSocketClient();
  return io({
    ...options,
    auth: {
      ...(options.auth || {}),
      sessionToken,
    },
  });
}

export async function initializeDashboard({ expectedUserType, titlePrefix, metaEntries, resolveTitle }) {
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    navigateTo("/login", { includeSession: false });
    return null;
  }

  syncSessionTokenInUrl(sessionToken);

  const session = await fetchSession();

  if (!session || session.userType !== expectedUserType) {
    clearSessionToken();
    navigateTo("/login", { includeSession: false });
    return;
  }

  const title = document.querySelector("#page-title");
  const logoutButton = document.querySelector("#logout-button");
  const statusNode = document.querySelector("#status");

  title.textContent = typeof resolveTitle === "function" ? resolveTitle(session) : `${titlePrefix}, ${session.displayName}`;
  renderMeta(metaEntries(session));
  statusNode.textContent = "Authenticated with a signed per-tab session token.";
  statusNode.className = "status ok";

  logoutButton?.addEventListener("click", () => {
    logout();
  });

  return session;
}