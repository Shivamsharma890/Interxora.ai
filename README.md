# Interxora.ai

<p align="center">
  <strong>AI-Powered Interview Practice & Performance Platform</strong>
</p>

<p align="center">
  <em>Personalized interviews. Intelligent evaluation. Data-driven improvement.</em>
</p>

<p align="center">

![React](https://img.shields.io/badge/React.js-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-Vector_Search-336791?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Gemini-LLM-4285F4?style=for-the-badge&logo=google&logoColor=white)
![RAG](https://img.shields.io/badge/RAG-Generative_AI-7C3AED?style=for-the-badge)

</p>

### AI-Powered Interview Practice & Performance Platform

Interxora.ai is a full-stack AI interview platform that simulates realistic technical and behavioral interviews, personalizes questions using a candidate's resume and target job description, evaluates answers using LLMs, and generates a detailed interview performance report.

It combines modern full-stack development with Generative AI, Retrieval-Augmented Generation (RAG), vector search, authentication, real-time interview interaction, and persistent performance tracking.

---

### AI-Powered Interview Practice & Performance Platform

Interxora.ai is a full-stack AI interview platform that simulates realistic technical and behavioral interviews, personalizes questions using a candidate's resume and target job description, evaluates answers using LLMs, and generates a detailed interview performance report.

It combines modern full-stack development with Generative AI, Retrieval-Augmented Generation (RAG), vector search, authentication, real-time interview interaction, and persistent performance tracking.

---

## 🚀 What is Interxora.ai?

Interxora.ai is designed to provide a personalized AI-powered interview experience instead of relying on a fixed set of generic questions.

A candidate can:

- Create an account or sign in with Google
- Upload/provide their resume
- Provide a target job description
- Start a personalized AI interview
- Answer questions through an interactive interview interface
- Use speech input
- Practice with a timed interview session
- Receive AI-powered answer evaluation
- Get a final performance report
- Review previous interviews and performance from the dashboard

---

# ✨ Core Features

## 🔐 Authentication & Security

- JWT-based authentication
- Google OAuth
- User registration and login
- Logout and re-login
- Forgot password
- Password reset through email
- Gmail SMTP integration
- Password validation
- Refresh-token handling
- Enumeration-safe forgot-password response
- Environment-based secret management

---

## 🧠 AI Interview Generation

The interview engine dynamically generates interview questions using an LLM.

Questions can be personalized according to:

- Candidate resume
- Target job description
- Interview type
- Difficulty
- Interview context

Instead of using only predefined questions, Interxora.ai generates questions dynamically according to the candidate's profile and target role.

---

# 🎯 Resume + Job Description Personalization

One of the main features of Interxora.ai is personalized interview generation.

The system combines:

```text
Candidate Resume
        +
Job Description
        ↓
Document Processing
        ↓
Embeddings
        ↓
PostgreSQL + pgvector
        ↓
Semantic Retrieval
        ↓
Relevant Context
        ↓
LLM
        ↓
Personalized Interview
