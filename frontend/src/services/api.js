const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000";

let refreshPromise = null;

function saveAuthTokens(data) {
    if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
    }

    if (data?.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
    }
}


function clearAuthTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
}


function getErrorMessage(
    data,
    fallback = "Something went wrong"
) {
    if (typeof data?.detail === "string") {
        return data.detail;
    }

    if (Array.isArray(data?.detail)) {
        return data.detail
            .map(
                (item) =>
                    item?.msg ||
                    item?.message ||
                    ""
            )
            .filter(Boolean)
            .join(", ");
    }

    if (data?.detail) {
        try {
            return JSON.stringify(data.detail);
        } catch {
            return fallback;
        }
    }

    if (typeof data?.message === "string") {
        return data.message;
    }

    return fallback;
}

async function refreshAccessToken() {
    const refreshToken =
        localStorage.getItem("refresh_token");

    if (!refreshToken) {
        throw new Error(
            "No refresh token available"
        );
    }

    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const response = await fetch(
                    `${API_URL}/auth/refresh`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            refresh_token:
                                refreshToken,
                        }),
                    }
                );

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                let data = null;

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {
                    try {
                        data =
                            await response.json();
                    } catch {
                        data = null;
                    }
                }

                if (
                    !response.ok ||
                    !data?.access_token
                ) {
                    clearAuthTokens();
                    localStorage.removeItem(
                        "user"
                    );

                    throw new Error(
                        getErrorMessage(
                            data,
                            "Your session has expired. Please login again."
                        )
                    );
                }

                saveAuthTokens(data);

                return data.access_token;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return refreshPromise;
}

export async function apiRequest(
    endpoint,
    options = {},
    retry = true
) {
    const token =
        localStorage.getItem(
            "access_token"
        );

    const headers = {
        ...(options.headers || {}),
    };

    const isFormData =
        options.body instanceof FormData;

    if (
        !isFormData &&
        !headers["Content-Type"] &&
        !headers["content-type"]
    ) {
        headers["Content-Type"] =
            "application/json";
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,
                headers,
                credentials: "include",
            }
        );
    } catch {
        throw new Error(
            "Unable to connect to the server. Please make sure the backend is running."
        );
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    let data = null;

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    } else {
        try {
            const text =
                await response.text();

            data = text || null;
        } catch {
            data = null;
        }
    }

    const shouldNotRefresh =
        endpoint === "/auth/login" ||
        endpoint === "/auth/register" ||
        endpoint === "/auth/refresh" ||
        endpoint === "/auth/forgot-password" ||
        endpoint === "/auth/reset-password";

    if (
        response.status === 401 &&
        retry &&
        !shouldNotRefresh
    ) {
        try {
            await refreshAccessToken();
            return apiRequest(
                endpoint,
                options,
                false
            );
        } catch {
            clearAuthTokens();
            localStorage.removeItem(
                "user"
            );

            throw new Error(
                "Your session has expired. Please login again."
            );
        }
    }

    if (!response.ok) {
        throw new Error(
            getErrorMessage(
                data,
                response.status === 401
                    ? "Unauthorized request"
                    : `Request failed (${response.status})`
            )
        );
    }

    return data;
}

export async function loginUser(
    email,
    password
) {
    const data = await apiRequest(
        "/auth/login",
        {
            method: "POST",
            body: JSON.stringify({
                email: email
                    .trim()
                    .toLowerCase(),
                password,
            }),
        },
        false
    );
    saveAuthTokens(data);

    if (data?.user) {
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );
    }

    return data;
}

export async function registerUser(
    name,
    email,
    password
) {
    return apiRequest(
        "/auth/register",
        {
            method: "POST",
            body: JSON.stringify({
                name: name.trim(),
                email: email
                    .trim()
                    .toLowerCase(),
                password,
            }),
        },
        false
    );
}

export async function logoutUser() {
    const refreshToken =
        localStorage.getItem(
            "refresh_token"
        );

    try {
        if (refreshToken) {
            await apiRequest(
                "/auth/logout",
                {
                    method: "POST",
                    body: JSON.stringify({
                        refresh_token:
                            refreshToken,
                    }),
                },
                false
            );
        }
    } 
    
    catch {
    } 
    
    finally {
        clearAuthTokens();

        localStorage.removeItem(
            "user"
        );
        refreshPromise = null;
    }
}

export async function requestPasswordReset(
    email
) {
    return apiRequest(
        "/auth/forgot-password",
        {
            method: "POST",
            body: JSON.stringify({
                email: email
                    .trim()
                    .toLowerCase(),
            }),
        },
        false
    );
}

export async function resetPassword(
    token,
    newPassword
) {
    return apiRequest(
        "/auth/reset-password",
        {
            method: "POST",
            body: JSON.stringify({
                token: token.trim(),
                new_password:
                    newPassword,
            }),
        },
        false
    );
}

export async function createInterview(
    interviewData
) {
    return apiRequest(
        "/interviews/",
        {
            method: "POST",
            body: JSON.stringify(
                interviewData
            ),
        }
    );
}

export async function saveKnowledgeText(
    sourceType,
    sourceName,
    content,
    interviewId = null
) {
    return apiRequest(
        "/knowledge/text",
        {
            method: "POST",
            body: JSON.stringify({
                source_type:
                    sourceType,
                source_name:
                    sourceName,
                content,
                interview_id:
                    interviewId,
            }),
        }
    );
}

export async function uploadKnowledgeDocument(
    file,
    sourceType = "resume",
    interviewId = null
) {
    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "source_type",
        sourceType
    );

    if (
        interviewId !== null &&
        interviewId !== undefined
    ) {
        formData.append(
            "interview_id",
            String(interviewId)
        );
    }

    return apiRequest(
        "/knowledge/upload",
        {
            method: "POST",
            body: formData,
        }
    );
}

export async function getKnowledgeSources() {
    return apiRequest(
        "/knowledge/",
        {
            method: "GET",
        }
    );
}

export async function deleteKnowledgeSource(
    sourceType,
    interviewId = null
) {
    const query =
        interviewId !== null &&
        interviewId !== undefined
            ? `?interview_id=${encodeURIComponent(
                  interviewId
              )}`
            : "";

    return apiRequest(
        `/knowledge/${encodeURIComponent(
            sourceType
        )}${query}`,
        {
            method: "DELETE",
        }
    );
}