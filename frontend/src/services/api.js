// // // const API_URL = "http://localhost:8000";


// // // // ============================================================
// // // // GENERIC API REQUEST
// // // // ============================================================

// // // export async function apiRequest(endpoint, options = {}) {
// // //     // Always get the latest token from localStorage
// // //     const token = localStorage.getItem("access_token");

// // //     const headers = {
// // //         "Content-Type": "application/json",
// // //         ...(options.headers || {}),
// // //     };

// // //     // Automatically attach JWT if available
// // //     if (token) {
// // //         headers.Authorization = `Bearer ${token}`;
// // //     }

// // //     const response = await fetch(`${API_URL}${endpoint}`, {
// // //         ...options,
// // //         headers,
// // //         credentials: "include",
// // //     });

// // //     // Safely parse response
// // //     let data = {};

// // //     try {
// // //         data = await response.json();
// // //     } catch {
// // //         data = {};
// // //     }

// // //     if (!response.ok) {
// // //         let message = "Something went wrong";

// // //         if (typeof data.detail === "string") {
// // //             message = data.detail;
// // //         } else if (Array.isArray(data.detail)) {
// // //             message = data.detail
// // //                 .map((item) => item.msg || item.message || "")
// // //                 .filter(Boolean)
// // //                 .join(", ");
// // //         } else if (data.detail) {
// // //             message = JSON.stringify(data.detail);
// // //         }

// // //         // If backend says token is invalid/expired,
// // //         // remove the old token.
// // //         if (
// // //             response.status === 401 &&
// // //             typeof data.detail === "string" &&
// // //             data.detail.toLowerCase().includes("token")
// // //         ) {
// // //             localStorage.removeItem("access_token");
// // //         }

// // //         throw new Error(message);
// // //     }

// // //     return data;
// // // }


// // // // ============================================================
// // // // LOGIN
// // // // ============================================================

// // // export async function loginUser(email, password) {
// // //     return apiRequest("/auth/login", {
// // //         method: "POST",
// // //         body: JSON.stringify({
// // //             email,
// // //             password,
// // //         }),
// // //     });
// // // }


// // // // ============================================================
// // // // REGISTER
// // // // ============================================================

// // // export async function registerUser(name, email, password) {
// // //     return apiRequest("/auth/register", {
// // //         method: "POST",
// // //         body: JSON.stringify({
// // //             name,
// // //             email,
// // //             password,
// // //         }),
// // //     });
// // // }


// // // // ============================================================
// // // // CREATE INTERVIEW
// // // // ============================================================

// // // export async function createInterview(interviewData) {
// // //     return apiRequest("/interviews/", {
// // //         method: "POST",
// // //         body: JSON.stringify(interviewData),
// // //     });
// // // }


// // // // ============================================================
// // // // KNOWLEDGE BASE / RAG
// // // // ============================================================

// // // /**
// // //  * Save text into the RAG knowledge base.
// // //  *
// // //  * sourceType examples:
// // //  * - resume
// // //  * - job_description
// // //  * - project
// // //  * - notes
// // //  * - interview_preferences
// // //  *
// // //  * interviewId:
// // //  * - null for user-level knowledge such as resume
// // //  * - current interview ID for interview-specific knowledge
// // //  */
// // // export async function saveKnowledgeText(
// // //     sourceType,
// // //     sourceName,
// // //     content,
// // //     interviewId = null
// // // ) {
// // //     return apiRequest("/knowledge/text", {
// // //         method: "POST",
// // //         body: JSON.stringify({
// // //             source_type: sourceType,
// // //             source_name: sourceName,
// // //             content,
// // //             interview_id: interviewId,
// // //         }),
// // //     });
// // // }


// // // /**
// // //  * Upload a file into the RAG knowledge base.
// // //  *
// // //  * Example:
// // //  *
// // //  * await uploadKnowledgeDocument(
// // //  *     resumeFile,
// // //  *     "resume"
// // //  * );
// // //  *
// // //  * For an interview-specific source:
// // //  *
// // //  * await uploadKnowledgeDocument(
// // //  *     file,
// // //  *     "job_description",
// // //  *     interviewId
// // //  * );
// // //  */
// // // export async function uploadKnowledgeDocument(
// // //     file,
// // //     sourceType = "resume",
// // //     interviewId = null
// // // ) {
// // //     if (!file) {
// // //         throw new Error("No file selected");
// // //     }

// // //     const token = localStorage.getItem("access_token");

// // //     const formData = new FormData();

// // //     formData.append("file", file);
// // //     formData.append("source_type", sourceType);

// // //     // interview_id is important for interview-specific
// // //     // RAG retrieval, especially the job description.
// // //     if (
// // //         interviewId !== null &&
// // //         interviewId !== undefined
// // //     ) {
// // //         formData.append(
// // //             "interview_id",
// // //             String(interviewId)
// // //         );
// // //     }

// // //     const headers = {};

// // //     // IMPORTANT:
// // //     // Do NOT set Content-Type manually for FormData.
// // //     // Browser automatically creates:
// // //     // multipart/form-data; boundary=...
// // //     if (token) {
// // //         headers.Authorization = `Bearer ${token}`;
// // //     }

// // //     const response = await fetch(
// // //         `${API_URL}/knowledge/upload`,
// // //         {
// // //             method: "POST",
// // //             headers,
// // //             body: formData,
// // //             credentials: "include",
// // //         }
// // //     );

// // //     let data = {};

// // //     try {
// // //         data = await response.json();
// // //     } catch {
// // //         data = {};
// // //     }

// // //     if (!response.ok) {
// // //         let message =
// // //             "Unable to index knowledge source";

// // //         if (typeof data.detail === "string") {
// // //             message = data.detail;
// // //         } else if (Array.isArray(data.detail)) {
// // //             message = data.detail
// // //                 .map(
// // //                     (item) =>
// // //                         item.msg ||
// // //                         item.message ||
// // //                         ""
// // //                 )
// // //                 .filter(Boolean)
// // //                 .join(", ");
// // //         } else if (data.detail) {
// // //             message = JSON.stringify(data.detail);
// // //         }

// // //         if (response.status === 401) {
// // //             localStorage.removeItem(
// // //                 "access_token"
// // //             );
// // //         }

// // //         throw new Error(message);
// // //     }

// // //     return data;
// // // }


// // // // ============================================================
// // // // GET RAG KNOWLEDGE SOURCES
// // // // ============================================================

// // // export async function getKnowledgeSources() {
// // //     return apiRequest("/knowledge/", {
// // //         method: "GET",
// // //     });
// // // }


// // // // ============================================================
// // // // DELETE RAG KNOWLEDGE SOURCE
// // // // ============================================================

// // // /**
// // //  * Delete a knowledge source.
// // //  *
// // //  * Example:
// // //  *
// // //  * deleteKnowledgeSource("resume")
// // //  *
// // //  * or:
// // //  *
// // //  * deleteKnowledgeSource(
// // //  *     "job_description",
// // //  *     interviewId
// // //  * )
// // //  */
// // // export async function deleteKnowledgeSource(
// // //     sourceType,
// // //     interviewId = null
// // // ) {
// // //     const query =
// // //         interviewId !== null &&
// // //         interviewId !== undefined
// // //             ? `?interview_id=${encodeURIComponent(
// // //                   interviewId
// // //               )}`
// // //             : "";

// // //     return apiRequest(
// // //         `/knowledge/${encodeURIComponent(
// // //             sourceType
// // //         )}${query}`,
// // //         {
// // //             method: "DELETE",
// // //         }
// // //     );
// // // }


// // //........................new.....................
// // const API_URL =
// //     import.meta.env.VITE_API_URL ||
// //     "http://localhost:8000";


// // // ============================================================
// // // AUTH HELPERS
// // // ============================================================

// // const saveAuthTokens = (data) => {
// //     if (data?.access_token) {
// //         localStorage.setItem(
// //             "access_token",
// //             data.access_token
// //         );
// //     }

// //     if (data?.refresh_token) {
// //         localStorage.setItem(
// //             "refresh_token",
// //             data.refresh_token
// //         );
// //     }
// // };


// // const clearAuthTokens = () => {
// //     localStorage.removeItem("access_token");
// //     localStorage.removeItem("refresh_token");
// // };


// // // ============================================================
// // // REFRESH TOKEN STATE
// // // ============================================================

// // // Prevent multiple API requests from creating
// // // multiple refresh requests at the same time.
// // let refreshPromise = null;


// // // ============================================================
// // // REFRESH ACCESS TOKEN
// // // ============================================================

// // async function refreshAccessToken() {
// //     // If another request is already refreshing the token,
// //     // wait for the same refresh request.
// //     if (refreshPromise) {
// //         return refreshPromise;
// //     }

// //     const refreshToken =
// //         localStorage.getItem("refresh_token");

// //     if (!refreshToken) {
// //         clearAuthTokens();
// //         return null;
// //     }

// //     refreshPromise = (async () => {
// //         try {
// //             const response = await fetch(
// //                 `${API_URL}/auth/refresh`,
// //                 {
// //                     method: "POST",
// //                     headers: {
// //                         "Content-Type": "application/json",
// //                     },
// //                     body: JSON.stringify({
// //                         refresh_token: refreshToken,
// //                     }),
// //                     credentials: "include",
// //                 }
// //             );

// //             const contentType =
// //                 response.headers.get("content-type") || "";

// //             const data =
// //                 contentType.includes("application/json")
// //                     ? await response.json()
// //                     : null;

// //             if (!response.ok) {
// //                 clearAuthTokens();
// //                 return null;
// //             }

// //             // Backend rotates both tokens.
// //             saveAuthTokens(data);

// //             return data?.access_token || null;

// //         } catch (error) {
// //             clearAuthTokens();
// //             return null;

// //         } finally {
// //             refreshPromise = null;
// //         }
// //     })();

// //     return refreshPromise;
// // }


// // // ============================================================
// // // RESPONSE ERROR MESSAGE
// // // ============================================================

// // const getErrorMessage = (data) => {
// //     if (typeof data?.detail === "string") {
// //         return data.detail;
// //     }

// //     if (Array.isArray(data?.detail)) {
// //         return data.detail
// //             .map((item) => item?.msg || "Validation error")
// //             .join(", ");
// //     }

// //     if (data?.detail) {
// //         try {
// //             return JSON.stringify(data.detail);
// //         } catch {
// //             return "Something went wrong";
// //         }
// //     }

// //     return "Something went wrong";
// // };


// // // ============================================================
// // // API REQUEST
// // // ============================================================

// // export async function apiRequest(
// //     endpoint,
// //     options = {},
// //     retry = true
// // ) {
// //     const token =
// //         localStorage.getItem("access_token");

// //     const isFormData =
// //         options.body instanceof FormData;

// //     const headers = {
// //         ...(isFormData
// //             ? {}
// //             : {
// //                 "Content-Type": "application/json",
// //             }),
// //         ...(options.headers || {}),
// //     };

// //     // Always use the latest access token.
// //     if (token) {
// //         headers.Authorization =
// //             `Bearer ${token}`;
// //     }

// //     const response = await fetch(
// //         `${API_URL}${endpoint}`,
// //         {
// //             ...options,
// //             headers,
// //             credentials: "include",
// //         }
// //     );

// //     const contentType =
// //         response.headers.get("content-type") || "";

// //     const data =
// //         contentType.includes("application/json")
// //             ? await response.json()
// //             : null;


// //     // ========================================================
// //     // ACCESS TOKEN EXPIRED
// //     // ========================================================

// //     if (
// //         response.status === 401 &&
// //         retry &&
// //         endpoint !== "/auth/login" &&
// //         endpoint !== "/auth/refresh"
// //     ) {
// //         const newAccessToken =
// //             await refreshAccessToken();

// //         if (newAccessToken) {
// //             // Retry the original request exactly once.
// //             return apiRequest(
// //                 endpoint,
// //                 options,
// //                 false
// //             );
// //         }

// //         // Refresh failed.
// //         clearAuthTokens();

// //         throw new Error(
// //             "Your session has expired. Please login again."
// //         );
// //     }


// //     // ========================================================
// //     // OTHER ERRORS
// //     // ========================================================

// //     if (!response.ok) {
// //         const message =
// //             getErrorMessage(data);

// //         throw new Error(message);
// //     }


// //     // ========================================================
// //     // SUCCESS
// //     // ========================================================

// //     return data;
// // }


// // // ============================================================
// // // LOGIN
// // // ============================================================

// // export async function loginUser(
// //     email,
// //     password
// // ) {
// //     return apiRequest(
// //         "/auth/login",
// //         {
// //             method: "POST",
// //             body: JSON.stringify({
// //                 email,
// //                 password,
// //             }),
// //         },
// //         false
// //     );
// // }


// // // ============================================================
// // // REGISTER
// // // ============================================================

// // export async function registerUser(
// //     name,
// //     email,
// //     password
// // ) {
// //     return apiRequest(
// //         "/auth/register",
// //         {
// //             method: "POST",
// //             body: JSON.stringify({
// //                 name,
// //                 email,
// //                 password,
// //             }),
// //         },
// //         false
// //     );
// // }


// // // ============================================================
// // // CREATE INTERVIEW
// // // ============================================================

// // export async function createInterview(
// //     interviewData
// // ) {
// //     return apiRequest(
// //         "/interviews/",
// //         {
// //             method: "POST",
// //             body: JSON.stringify(
// //                 interviewData
// //             ),
// //         }
// //     );
// // }


// // // ============================================================
// // // KNOWLEDGE BASE / RAG
// // // ============================================================

// // export async function saveKnowledgeText(
// //     sourceType,
// //     sourceName,
// //     content,
// //     interviewId = null
// // ) {
// //     return apiRequest(
// //         "/knowledge/text",
// //         {
// //             method: "POST",
// //             body: JSON.stringify({
// //                 source_type: sourceType,
// //                 source_name: sourceName,
// //                 content,
// //                 interview_id: interviewId,
// //             }),
// //         }
// //     );
// // }


// // // ============================================================
// // // UPLOAD KNOWLEDGE DOCUMENT
// // // ============================================================

// // export async function uploadKnowledgeDocument(
// //     file,
// //     sourceType = "resume",
// //     interviewId = null
// // ) {
// //     const formData =
// //         new FormData();

// //     formData.append(
// //         "file",
// //         file
// //     );

// //     formData.append(
// //         "source_type",
// //         sourceType
// //     );

// //     if (
// //         interviewId !== null &&
// //         interviewId !== undefined
// //     ) {
// //         formData.append(
// //             "interview_id",
// //             String(interviewId)
// //         );
// //     }

// //     return apiRequest(
// //         "/knowledge/upload",
// //         {
// //             method: "POST",
// //             body: formData,
// //         }
// //     );
// // }


// // // ============================================================
// // // GET KNOWLEDGE SOURCES
// // // ============================================================

// // export async function getKnowledgeSources() {
// //     return apiRequest(
// //         "/knowledge/",
// //         {
// //             method: "GET",
// //         }
// //     );
// // }


// // // ============================================================
// // // DELETE KNOWLEDGE SOURCE
// // // ============================================================

// // export async function deleteKnowledgeSource(
// //     sourceType,
// //     interviewId = null
// // ) {
// //     const query =
// //         interviewId !== null &&
// //         interviewId !== undefined
// //             ? `?interview_id=${encodeURIComponent(
// //                 interviewId
// //             )}`
// //             : "";

// //     return apiRequest(
// //         `/knowledge/${encodeURIComponent(
// //             sourceType
// //         )}${query}`,
// //         {
// //             method: "DELETE",
// //         }
// //     );
// // }


// //..............................new1..................................
// // ============================================================
// // API CONFIGURATION
// // ============================================================

// const API_URL = (
//     import.meta.env.VITE_API_URL ||
//     "http://localhost:8000"
// ).replace(/\/$/, "");


// // ============================================================
// // AUTH TOKEN HELPERS
// // ============================================================

// function saveAuthTokens(data) {
//     if (data?.access_token) {
//         localStorage.setItem(
//             "access_token",
//             data.access_token
//         );
//     }

//     if (data?.refresh_token) {
//         localStorage.setItem(
//             "refresh_token",
//             data.refresh_token
//         );
//     }
// }


// function clearAuthTokens() {
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("refresh_token");
// }


// // ============================================================
// // ERROR MESSAGE HELPER
// // ============================================================

// function getErrorMessage(data, fallback = "Something went wrong") {
//     if (typeof data?.detail === "string") {
//         return data.detail;
//     }

//     if (Array.isArray(data?.detail)) {
//         return data.detail
//             .map(
//                 (item) =>
//                     item?.msg ||
//                     item?.message ||
//                     ""
//             )
//             .filter(Boolean)
//             .join(", ");
//     }

//     if (data?.detail) {
//         try {
//             return JSON.stringify(data.detail);
//         } catch {
//             return fallback;
//         }
//     }

//     if (typeof data?.message === "string") {
//         return data.message;
//     }

//     return fallback;
// }


// // ============================================================
// // REFRESH TOKEN STATE
// // ============================================================

// // Prevent multiple API requests from refreshing the token
// // simultaneously when several requests receive 401 together.
// let refreshPromise = null;


// // ============================================================
// // REFRESH ACCESS TOKEN
// // ============================================================

// async function refreshAccessToken() {
//     const refreshToken =
//         localStorage.getItem("refresh_token");

//     if (!refreshToken) {
//         clearAuthTokens();

//         throw new Error(
//             "Your session has expired. Please login again."
//         );
//     }

//     // If another request is already refreshing the token,
//     // wait for that same request instead of creating another one.
//     if (refreshPromise) {
//         return refreshPromise;
//     }

//     refreshPromise = (async () => {
//         try {
//             const response = await fetch(
//                 `${API_URL}/auth/refresh`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type":
//                             "application/json",
//                     },
//                     credentials: "include",
//                     body: JSON.stringify({
//                         refresh_token:
//                             refreshToken,
//                     }),
//                 }
//             );

//             let data = {};

//             try {
//                 data = await response.json();
//             } catch {
//                 data = {};
//             }

//             if (!response.ok) {
//                 clearAuthTokens();

//                 throw new Error(
//                     getErrorMessage(
//                         data,
//                         "Your session has expired. Please login again."
//                     )
//                 );
//             }

//             if (!data?.access_token) {
//                 clearAuthTokens();

//                 throw new Error(
//                     "Unable to refresh your session. Please login again."
//                 );
//             }

//             // Backend rotates both access and refresh tokens.
//             saveAuthTokens(data);

//             return data.access_token;
//         } catch (error) {
//             clearAuthTokens();
//             throw error;
//         } finally {
//             refreshPromise = null;
//         }
//     })();

//     return refreshPromise;
// }


// // ============================================================
// // RESPONSE PARSER
// // ============================================================

// async function parseResponse(response) {
//     const contentType =
//         response.headers.get("content-type") || "";

//     if (
//         contentType
//             .toLowerCase()
//             .includes("application/json")
//     ) {
//         try {
//             return await response.json();
//         } catch {
//             return null;
//         }
//     }

//     return null;
// }


// // ============================================================
// // GENERIC API REQUEST
// // ============================================================

// export async function apiRequest(
//     endpoint,
//     options = {},
//     retry = true
// ) {
//     const token =
//         localStorage.getItem("access_token");

//     const requestOptions = {
//         ...options,
//     };

//     const body = requestOptions.body;

//     // Copy headers so the original object is not modified.
//     const headers = {
//         ...(requestOptions.headers || {}),
//     };

//     // --------------------------------------------------------
//     // CONTENT-TYPE
//     // --------------------------------------------------------
//     //
//     // FormData MUST NOT have Content-Type manually set.
//     // The browser automatically adds the multipart boundary.
//     //

//     if (body instanceof FormData) {
//         delete headers["Content-Type"];
//         delete headers["content-type"];
//     } else if (
//         body !== undefined &&
//         body !== null &&
//         !headers["Content-Type"] &&
//         !headers["content-type"]
//     ) {
//         headers["Content-Type"] =
//             "application/json";
//     }

//     // --------------------------------------------------------
//     // ACCESS TOKEN
//     // --------------------------------------------------------

//     if (token) {
//         headers.Authorization =
//             `Bearer ${token}`;
//     }

//     requestOptions.headers = headers;

//     // Always send cookies as well.
//     requestOptions.credentials = "include";

//     let response;

//     try {
//         response = await fetch(
//             `${API_URL}${endpoint}`,
//             requestOptions
//         );
//     } catch (error) {
//         throw new Error(
//             "Unable to connect to the server. Please check your backend."
//         );
//     }

//     const data = await parseResponse(response);

//     // ========================================================
//     // SUCCESS
//     // ========================================================

//     if (response.ok) {
//         return data;
//     }

//     // ========================================================
//     // ACCESS TOKEN EXPIRED
//     // ========================================================

//     if (
//         response.status === 401 &&
//         retry &&
//         endpoint !== "/auth/login" &&
//         endpoint !== "/auth/refresh"
//     ) {
//         try {
//             // Get a fresh access token.
//             const newAccessToken =
//                 await refreshAccessToken();

//             // ------------------------------------------------
//             // RETRY ORIGINAL REQUEST
//             // ------------------------------------------------

//             const retryHeaders = {
//                 ...(options.headers || {}),
//                 Authorization:
//                     `Bearer ${newAccessToken}`,
//             };

//             const retryOptions = {
//                 ...options,
//                 headers: retryHeaders,
//                 credentials: "include",
//             };

//             // FormData must not receive a manual Content-Type.
//             if (
//                 retryOptions.body instanceof FormData
//             ) {
//                 delete retryOptions.headers[
//                     "Content-Type"
//                 ];

//                 delete retryOptions.headers[
//                     "content-type"
//                 ];
//             }

//             return await apiRequest(
//                 endpoint,
//                 retryOptions,
//                 false
//             );
//         } catch (refreshError) {
//             clearAuthTokens();

//             throw new Error(
//                 refreshError?.message ||
//                     "Your session has expired. Please login again."
//             );
//         }
//     }

//     // ========================================================
//     // OTHER ERRORS
//     // ========================================================

//     const message = getErrorMessage(
//         data,
//         `Request failed with status ${response.status}`
//     );

//     throw new Error(message);
// }


// // ============================================================
// // LOGIN
// // ============================================================

// export async function loginUser(
//     email,
//     password
// ) {
//     return apiRequest(
//         "/auth/login",
//         {
//             method: "POST",
//             body: JSON.stringify({
//                 email,
//                 password,
//             }),
//         },
//         false
//     );
// }


// // ============================================================
// // REGISTER
// // ============================================================

// export async function registerUser(
//     name,
//     email,
//     password
// ) {
//     return apiRequest(
//         "/auth/register",
//         {
//             method: "POST",
//             body: JSON.stringify({
//                 name,
//                 email,
//                 password,
//             }),
//         },
//         false
//     );
// }


// // ============================================================
// // LOGOUT
// // ============================================================

// export async function logoutUser() {
//     const refreshToken =
//         localStorage.getItem("refresh_token");

//     try {
//         if (refreshToken) {
//             const response = await fetch(
//                 `${API_URL}/auth/logout`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type":
//                             "application/json",
//                     },
//                     credentials: "include",
//                     body: JSON.stringify({
//                         refresh_token:
//                             refreshToken,
//                     }),
//                 }
//             );

//             // We intentionally do not throw here.
//             // Local logout should still happen even if
//             // the backend logout request fails.
//             if (!response.ok) {
//                 console.warn(
//                     "Backend logout request failed."
//                 );
//             }
//         }
//     } catch (error) {
//         console.warn(
//             "Logout request failed:",
//             error
//         );
//     } finally {
//         clearAuthTokens();
//         localStorage.removeItem("user");
//     }
// }


// // ============================================================
// // CREATE INTERVIEW
// // ============================================================

// export async function createInterview(
//     interviewData
// ) {
//     return apiRequest(
//         "/interviews/",
//         {
//             method: "POST",
//             body: JSON.stringify(
//                 interviewData
//             ),
//         }
//     );
// }


// // ============================================================
// // KNOWLEDGE BASE / RAG
// // ============================================================

// /**
//  * Save text into the RAG knowledge base.
//  *
//  * sourceType examples:
//  * - resume
//  * - job_description
//  * - project
//  * - notes
//  * - interview_preferences
//  *
//  * interviewId:
//  * - null for user-level knowledge
//  * - current interview ID for interview-specific knowledge
//  */

// export async function saveKnowledgeText(
//     sourceType,
//     sourceName,
//     content,
//     interviewId = null
// ) {
//     return apiRequest(
//         "/knowledge/text",
//         {
//             method: "POST",
//             body: JSON.stringify({
//                 source_type: sourceType,
//                 source_name: sourceName,
//                 content,
//                 interview_id:
//                     interviewId,
//             }),
//         }
//     );
// }


// // ============================================================
// // UPLOAD KNOWLEDGE DOCUMENT
// // ============================================================

// /**
//  * Upload resume / document into the RAG knowledge base.
//  *
//  * Example:
//  *
//  * await uploadKnowledgeDocument(
//  *     resumeFile,
//  *     "resume",
//  *     interviewId
//  * );
//  */

// export async function uploadKnowledgeDocument(
//     file,
//     sourceType = "resume",
//     interviewId = null
// ) {
//     if (!file) {
//         throw new Error(
//             "No file selected"
//         );
//     }

//     const formData = new FormData();

//     formData.append(
//         "file",
//         file
//     );

//     formData.append(
//         "source_type",
//         sourceType
//     );

//     // Important for interview-specific RAG.
//     if (
//         interviewId !== null &&
//         interviewId !== undefined
//     ) {
//         formData.append(
//             "interview_id",
//             String(interviewId)
//         );
//     }

//     return apiRequest(
//         "/knowledge/upload",
//         {
//             method: "POST",
//             body: formData,
//         }
//     );
// }


// // ============================================================
// // GET KNOWLEDGE SOURCES
// // ============================================================

// export async function getKnowledgeSources() {
//     return apiRequest(
//         "/knowledge/",
//         {
//             method: "GET",
//         }
//     );
// }


// // ============================================================
// // DELETE KNOWLEDGE SOURCE
// // ============================================================

// export async function deleteKnowledgeSource(
//     sourceType,
//     interviewId = null
// ) {
//     const query =
//         interviewId !== null &&
//         interviewId !== undefined
//             ? `?interview_id=${encodeURIComponent(
//                   interviewId
//               )}`
//             : "";

//     return apiRequest(
//         `/knowledge/${encodeURIComponent(
//             sourceType
//         )}${query}`,
//         {
//             method: "DELETE",
//         }
//     );
// }


//............................new2.............................
const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000";

let refreshPromise = null;


// ============================================================
// AUTH TOKEN HELPERS
// ============================================================

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


function getErrorMessage(data, fallback = "Something went wrong") {
    if (typeof data?.detail === "string") {
        return data.detail;
    }

    if (Array.isArray(data?.detail)) {
        return data.detail
            .map((item) => item?.msg || item?.message || "")
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

    return fallback;
}


async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
        throw new Error("No refresh token available");
    }

    if (!refreshPromise) {
        refreshPromise = (async () => {
            const response = await fetch(
                `${API_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        refresh_token: refreshToken,
                    }),
                }
            );

            const contentType =
                response.headers.get("content-type") || "";

            const data = contentType.includes("application/json")
                ? await response.json()
                : null;

            if (!response.ok || !data?.access_token) {
                clearAuthTokens();

                throw new Error(
                    getErrorMessage(
                        data,
                        "Your session has expired. Please login again."
                    )
                );
            }

            saveAuthTokens(data);

            return data.access_token;
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}


// ============================================================
// GENERIC API REQUEST
// ============================================================

export async function apiRequest(
    endpoint,
    options = {},
    retry = true
) {
    const token = localStorage.getItem("access_token");

    const headers = {
        ...(options.headers || {}),
    };

    const isFormData =
        options.body instanceof FormData;

    // Do not manually set multipart/form-data.
    // The browser automatically adds the correct boundary.
    if (
        !isFormData &&
        !headers["Content-Type"] &&
        !headers["content-type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers,
            credentials: "include",
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    // ========================================================
    // ACCESS TOKEN EXPIRED / INVALID
    // ========================================================

    if (
        response.status === 401 &&
        retry &&
        endpoint !== "/auth/login" &&
        endpoint !== "/auth/refresh"
    ) {
        try {
            await refreshAccessToken();

            return apiRequest(
                endpoint,
                options,
                false
            );
        } catch (refreshError) {
            clearAuthTokens();

            throw new Error(
                "Your session has expired. Please login again."
            );
        }
    }

    // ========================================================
    // API ERROR
    // ========================================================

    if (!response.ok) {
        throw new Error(
            getErrorMessage(
                data,
                response.status === 401
                    ? "Unauthorized request"
                    : "Something went wrong"
            )
        );
    }

    return data;
}


// ============================================================
// LOGIN
// ============================================================

export async function loginUser(
    email,
    password
) {
    const data = await apiRequest(
        "/auth/login",
        {
            method: "POST",
            body: JSON.stringify({
                email,
                password,
            }),
        },
        false
    );

    saveAuthTokens(data);

    return data;
}


// ============================================================
// REGISTER
// ============================================================

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
                name,
                email,
                password,
            }),
        }
    );
}


// ============================================================
// LOGOUT
// ============================================================

export async function logoutUser() {
    const refreshToken =
        localStorage.getItem("refresh_token");

    try {
        if (refreshToken) {
            await apiRequest(
                "/auth/logout",
                {
                    method: "POST",
                    body: JSON.stringify({
                        refresh_token: refreshToken,
                    }),
                },
                false
            );
        }
    } finally {
        clearAuthTokens();
        localStorage.removeItem("user");
    }
}


// ============================================================
// CREATE INTERVIEW
// ============================================================

export async function createInterview(
    interviewData
) {
    return apiRequest(
        "/interviews/",
        {
            method: "POST",
            body: JSON.stringify(interviewData),
        }
    );
}


// ============================================================
// KNOWLEDGE BASE / RAG
// ============================================================

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
                source_type: sourceType,
                source_name: sourceName,
                content,
                interview_id: interviewId,
            }),
        }
    );
}


export async function uploadKnowledgeDocument(
    file,
    sourceType = "resume",
    interviewId = null
) {
    const formData = new FormData();

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


// ============================================================
// LIVE INTERVIEW — FACE OBSERVATIONS
// ============================================================

export async function saveFaceObservations(
    interviewId,
    observations
) {
    return apiRequest(
        `/interviews/${interviewId}/face-observations`,
        {
            method: "PATCH",
            body: JSON.stringify({
                response_mode: "live",
                ...observations,
            }),
        }
    );
}