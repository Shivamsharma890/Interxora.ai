import json
from AI.client import client
from AI.prompts import build_interview_system_prompt

def generate_first_question(role: str, interview_type: str, difficulty: str) -> str:

    system_prompt = build_interview_system_prompt(
        role=role, interview_type=interview_type, difficulty=difficulty
    )

    response = client.models.generate_content(
        # model="gemini-3.6-flash",
        model="gemini-3.1-flash-lite",
        contents="Begin the interview by asking the candidate the first question.",
        config={"system_instruction": system_prompt},
    )

    return response.text


def generate_next_question(
    role: str,
    interview_type: str,
    difficulty: str,
    previous_question: str,
    candidate_answer: str,
) -> str:

    system_prompt = build_interview_system_prompt(
        role=role, interview_type=interview_type, difficulty=difficulty
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"""
The candidate has just answered an interview question.

Previous question:
{previous_question}

Candidate's answer:
{candidate_answer}

Generate the NEXT interview question.

Rules:
- Ask only one question.
- The question must be relevant to the candidate's role.
- Consider the candidate's previous answer.
- If the answer is strong, increase the difficulty slightly.
- If the answer is weak, ask a simpler follow-up question.
- Do not provide the answer.
- Do not provide feedback.
- Return only the question.
""",
        config={"system_instruction": system_prompt},
    )

    return response.text


def evaluate_answer(question: str, answer: str) -> dict:

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"""
Evaluate the candidate's interview answer.

Question:
{question}

Candidate Answer:
{answer}

Return ONLY valid JSON in this exact format:

{{
    "ai_feedback": "Give concise and useful feedback about the answer.",
    "score": 0
}}

The score must be an integer from 0 to 10.
""",
    )

    result = json.loads(response.text)
    return result


# Final Feedback :-

# def generate_final_feedback(
#     role: str,
#     interview_type: str,
#     difficulty: str,
#     questions_and_answers: str
# ) -> str:

#     system_prompt = build_interview_system_prompt(
#         role=role,
#         interview_type=interview_type,
#         difficulty=difficulty
#     )

#     response = client.models.generate_content(
#         model="gemini-3.1-flash-lite",
#         contents=f"""
# You are evaluating a completed interview.

# Role:
# {role}

# Interview Type:
# {interview_type}

# Difficulty:
# {difficulty}

# Interview Questions and Candidate Answers:
# {questions_and_answers}

# Provide a final professional interview assessment.

# Include:
# 1. Overall performance
# 2. Key strengths
# 3. Areas for improvement
# 4. Communication assessment
# 5. Technical/role-related assessment
# 6. Final recommendation

# Give a clear overall assessment in a few well-written paragraphs.

# Return ONLY the final feedback text.
# """,
#         config={
#             "system_instruction": system_prompt
#         }
#     )

#     return response.text


def generate_final_feedback(
    role: str,
    interview_type: str,
    difficulty: str,
    questions_and_answers: str,
    overall_score: float,
) -> str:

    system_prompt = build_interview_system_prompt(
        role=role, interview_type=interview_type, difficulty=difficulty
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=f"""
You are an expert AI interview coach evaluating a completed interview.

Role:
{role}

Interview Type:
{interview_type}

Difficulty:
{difficulty}

Interview Questions and Candidate Answers:
{questions_and_answers}

OFFICIAL INTERVIEW SCORE:
{overall_score}%

IMPORTANT SCORING RULE:
The backend has already calculated the official interview score.

You MUST use exactly {overall_score}% as the overall_score.

DO NOT calculate another overall score.
DO NOT change the score.
DO NOT estimate the score.
DO NOT create a different percentage.

Your job is to explain the candidate's performance and give useful,
short and actionable coaching.

Create a concise, professional and encouraging interview performance report.

IMPORTANT:
- Do NOT write long paragraphs.
- Do NOT repeat the candidate's answers.
- Keep every piece of feedback short and actionable.
- Focus on what the candidate did well and what they should improve.
- Be honest but encouraging.
- Use simple professional language.
- Return ONLY valid JSON.
- Do NOT use Markdown.
- Do NOT add ```json or ``` around the response.

Return EXACTLY this structure:

{{
    "overall_score": {overall_score},

    "headline": "Strong Performance",

    "summary": "A short 1-2 sentence summary of the candidate's overall performance.",

    "strengths": [
        "Short specific strength",
        "Short specific strength",
        "Short specific strength"
    ],

    "improvements": [
        "Short actionable improvement",
        "Short actionable improvement",
        "Short actionable improvement"
    ],

    "communication": {{
        "score": 8,
        "label": "Strong",
        "feedback": "One short sentence about communication."
    }},

    "technical": {{
        "score": 8,
        "label": "Strong",
        "feedback": "One short sentence about technical performance."
    }},

    "coach_tip": "One highly practical interview tip personalized to this candidate.",

    "recommendation": "One short final recommendation for the candidate."
}}

RULES:

- overall_score MUST exactly equal {overall_score}.
- communication.score must be an integer from 0 to 10.
- technical.score must be an integer from 0 to 10.

- headline must be one of:
  "Outstanding Performance"
  "Strong Performance"
  "Good Performance"
  "Developing Performance"
  "Needs More Practice"

- label must be one of:
  "Excellent"
  "Strong"
  "Good"
  "Developing"
  "Needs Practice"

- strengths must contain exactly 3 items.
- improvements must contain exactly 3 items.

- Each strength/improvement should normally be under 15 words.
- summary must be under 35 words.
- communication.feedback must be under 25 words.
- technical.feedback must be under 25 words.
- coach_tip must be under 30 words.
- recommendation must be under 30 words.

- Never repeat the candidate's complete answer.
- Never write large paragraphs.
- Make every point useful and actionable.
""",
        config={"system_instruction": system_prompt},
    )

    raw_text = response.text.strip()

    # Remove Markdown code fences if Gemini adds them
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]

    elif raw_text.startswith("```"):
        raw_text = raw_text[3:]

    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    raw_text = raw_text.strip()

    try:
        result = json.loads(raw_text)

    except json.JSONDecodeError as e:
        print("AI returned invalid JSON:")
        print(raw_text)
        print("JSON error:", e)

        raise ValueError(
            "Gemini returned invalid JSON"
        )

    return json.dumps(result)