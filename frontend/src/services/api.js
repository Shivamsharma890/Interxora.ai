const API_URL = "http://localhost:8000";

export async function apiRequest(endpoint, options = {}) {
    // Always get the latest token from localStorage
    const token = localStorage.getItem("access_token");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    // Automatically attach JWT if available
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
        let message = "Something went wrong";

        if (typeof data.detail === "string") {
            message = data.detail;
        } else if (Array.isArray(data.detail)) {
            message = data.detail
                .map((item) => item.msg)
                .join(", ");
        } else if (data.detail) {
            message = JSON.stringify(data.detail);
        }

        // If backend says token is invalid/expired,
        // remove the old token so user can login again.
        if (
            response.status === 401 &&
            typeof data.detail === "string" &&
            data.detail.toLowerCase().includes("token")
        ) {
            localStorage.removeItem("access_token");
        }

        throw new Error(message);
    }

    return data;
}


// ===============================
// LOGIN
// ===============================

export async function loginUser(email, password) {
    return apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password,
        }),
    });
}


// ===============================
// REGISTER
// ===============================

export async function registerUser(name, email, password) {
    return apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
            name,
            email,
            password,
        }),
    });
}


// ===============================
// CREATE INTERVIEW
// ===============================

export async function createInterview(interviewData) {
    return apiRequest("/interviews/", {
        method: "POST",
        body: JSON.stringify(interviewData),
    });
}