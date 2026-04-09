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

export const API_BASE_URL = isDevelopment
  ? process.env.REACT_APP_API_URL || "http://localhost:8080/api"
  : requireRuntimeConfig("API_URL");

export const CHAT_WS_URL = isDevelopment
  ? process.env.REACT_APP_WS_URL || "ws://localhost:8080/ws/chat"
  : requireRuntimeConfig("WS_URL");

export const APP_DEBUG = isDevelopment
  ? process.env.REACT_APP_DEBUG || "false"
  : runtimeConfig.DEBUG || "false";
