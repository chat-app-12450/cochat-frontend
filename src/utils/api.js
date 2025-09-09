export const API_BASE_URL = process.env.REACT_APP_CHAT_API_URL; // Change for production

export const fetchWithAuth = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include", // Ensures cookies are sent with requests
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    return response.json();
};
