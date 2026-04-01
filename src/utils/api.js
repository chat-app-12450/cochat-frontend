import Cookies from "js-cookie";

export const API_BASE_URL = process.env.REACT_APP_CHAT_API_URL; // Change for production
const REFRESH_ENDPOINT = "/user/refresh";

const buildHeaders = (options = {}) => {
    const csrfToken = Cookies.get("XSRF-TOKEN");
    return {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(options.headers || {}),
    };
};

const requestJson = async (baseUrl, endpoint, options = {}, retryOnUnauthorized = true) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: buildHeaders(options),
    });

    if (response.status === 401 && retryOnUnauthorized && endpoint !== REFRESH_ENDPOINT && endpoint !== "/user/login") {
        const refreshed = await refreshSession();
        if (refreshed) {
            return requestJson(baseUrl, endpoint, options, false);
        }
    }

    return response.json();
};

const refreshSession = async () => {
    const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
    });

    return response.ok;
};

export const fetchWithAuth = async (endpoint, options = {}) => {
    // XSRF-TOKEN은 JS가 읽을 수 있게 내려온 쿠키이며,
    // 브라우저가 자동으로 보내는 인증 쿠키와 짝지어 CSRF를 막는 데 쓴다.
    return requestJson(API_BASE_URL, endpoint, options);
};

export const fetchWithAuthBase = async (baseUrl, endpoint, options = {}) => {
    return requestJson(baseUrl, endpoint, options);
};
