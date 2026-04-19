const isBrowser = typeof window !== "undefined";
const runtimeConfig = isBrowser ? window.__APP_CONFIG__ ?? {} : {};
const isDevelopment = process.env.NODE_ENV === "development";

const requireRuntimeConfig = (key) => {
  const value = runtimeConfig[key];
  if (value) {
    return value;
  }

  throw new Error(`Missing runtime config: ${key}`);
};

const resolveApiBaseUrl = (value) => {
  if (!value) {
    return value;
  }

  if (!isBrowser || /^https?:\/\//.test(value) || !value.startsWith("/")) {
    return value;
  }

  return `${window.location.origin}${value}`;
};

const resolveWsUrl = (value) => {
  if (!value) {
    return value;
  }

  if (!isBrowser || /^wss?:\/\//.test(value) || !value.startsWith("/")) {
    return value;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${value}`;
};

export const API_BASE_URL = resolveApiBaseUrl(
  isDevelopment
    ? process.env.REACT_APP_API_URL || "http://localhost:8080/api"
    : requireRuntimeConfig("API_URL")
);

export const CHAT_WS_URL = resolveWsUrl(
  isDevelopment
    ? process.env.REACT_APP_WS_URL || "ws://localhost:8080/ws/chat"
    : requireRuntimeConfig("WS_URL")
);

export const APP_DEBUG = isDevelopment
  ? process.env.REACT_APP_DEBUG || "false"
  : runtimeConfig.DEBUG || "false";
