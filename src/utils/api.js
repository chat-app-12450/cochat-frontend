export const API_BASE_URL = "http://localhost:8080"; // Change for production

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
