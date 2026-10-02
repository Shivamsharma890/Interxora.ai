import json
from typing import Optional
import os
from AI.client import client
from AI.prompts import build_interview_system_prompt
from AI.rag import build_rag_context

MODEL = os.getenv("LLM_MODEL", "gemini-3.1-flash-lite")


def _personalized_instruction(rag_context: str) -> str:
    if not rag_context:
        return ""

    return f"""
PERSONALIZATION CONTEXT FROM THE CANDIDATE KNOWLEDGE BASE:

{rag_context}

Use this context only when it is relevant to the current interview.
Rules:
- Prefer concrete details from the retrieved context.
- Ask about real skills, projects, technologies, responsibilities and job requirements when relevant.
- Use previous interview performance to target repeated weak areas with useful follow-ups.
- Never invent employers, projects, skills, education, responsibilities or achievements.
- Never reveal or unnecessarily quote the retrieved context.
- Ignore retrieved information that is unrelated to the current role.
"""


def generate_first_question(
    role: str,
    interview_type: str,
    difficulty: str,
    user_id: Optional[int] = None,
    db=None,
    interview_id: Optional[int] = None,
) -> str:
    system_prompt = build_interview_system_prompt(
        role=role,
        interview_type=interview_type,
        difficulty=difficulty,
    )

    rag_context = ""
    if db is not None and user_id is not None:
        rag_context = build_rag_context(
            db,
            user_id=user_id,
            interview_id=interview_id,
            query=(
                f"target role {role}; interview type {interview_type}; difficulty {difficulty}; "
                "resume skills projects job requirements previous interview weaknesses"
            ),
            top_k=6,
        )

    system_prompt += _personalized_instruction(rag_context)

    response = client.models.generate_content(
        model=MODEL,
        contents=(
            "Begin the interview with exactly one question. "
            "Personalize it from the candidate context when useful."
        ),
        config={"system_instruction": system_prompt},
    )
    return response.text.strip()


def generate_next_question(
    role: str,
    interview_type: str,
    difficulty: str,
    previous_question: str,
    candidate_answer: str,
    user_id: Optional[int] = None,
    db=None,
    interview_id: Optional[int] = None,
) -> str:
    system_prompt = build_interview_system_prompt(
        role=role,
        interview_type=interview_type,
        difficulty=difficulty,
    )

    rag_context = ""
    if db is not None and user_id is not None:
        rag_context = build_rag_context(
            db,
            user_id=user_id,
            interview_id=interview_id,
            query=(
                f"role {role}; interview {interview_type}; difficulty {difficulty}; "
                f"previous question {previous_question}; candidate answer {candidate_answer}; "
                "resume projects skills job requirements previous weaknesses"
            ),
            top_k=6,
        )

    system_prompt += _personalized_instruction(rag_context)

    response = client.models.generate_content(
        model=MODEL,
        contents=f"""
The candidate has just answered an interview question.

Previous question:
{previous_question}

Candidate answer:
{candidate_answer}

Generate the NEXT interview question.

Rules:
- Ask exactly one question.
- Keep it relevant to the target role and interview type.
- Use the candidate's answer to choose the next difficulty or follow-up.
- Use retrieved candidate context when it materially improves relevance.
- If the answer is strong, increase difficulty slightly.
- If the answer is weak or incomplete, ask a focused follow-up that tests the missing area.
- Do not provide the answer.
- Do not provide feedback.
- Return only the question.
""",
        config={"system_instruction": system_prompt},
    )
    return response.text.strip()


def evaluate_answer(question: str, answer: str) -> dict:
    response = client.models.generate_content(
        model=MODEL,
        contents=f"""
Evaluate the candidate's interview answer.

Question:
{question}

Candidate Answer:
{answer}

Return ONLY valid JSON:
{{
  "ai_feedback": "One concise, specific and actionable sentence.",
  "score": 0
}}

The score must be an integer from 0 to 10.
""",
    )

    raw = response.text.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]

    result = json.loads(raw.strip())
    if not isinstance(result, dict):
        raise ValueError("AI evaluation returned invalid data")
    return result


def _clean_json_response(text: str) -> str:
    raw = (text or "").strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return raw.strip()


def _unique_text_items(values, limit=3):
    result = []
    seen = set()
    for value in values if isinstance(values, list) else []:
        text = str(value or "").strip()
        key = " ".join(text.lower().split())
        if text and key not in seen:
            seen.add(key)
            result.append(text)
        if len(result) >= limit:
            break
    return result


def generate_final_feedback(
    role: str,
    interview_type: str,
    difficulty: str,
    questions_and_answers: str,
    overall_score: float,
    user_id: Optional[int] = None,
    db=None,
    interview_id: Optional[int] = None,
) -> str:
    system_prompt = build_interview_system_prompt(
        role=role,
        interview_type=interview_type,
        difficulty=difficulty,
    )

    rag_context = ""
    if db is not None and user_id is not None:
        rag_context = build_rag_context(
            db,
            user_id=user_id,
            interview_id=interview_id,
            query=(
                f"role {role}; interview performance; resume; job description; "
                "previous interview strengths weaknesses improvement areas"
            ),
            top_k=6,
        )
    system_prompt += _personalized_instruction(rag_context)

    response = client.models.generate_content(
        model=MODEL,
        contents=f"""
You are an expert interview assessor and practical career coach evaluating ONE completed interview.

Role: {role}
Interview Type: {interview_type}
Difficulty: {difficulty}

Interview Questions and Candidate Answers:
{questions_and_answers}

OFFICIAL INTERVIEW SCORE: {overall_score}%
The backend calculated this score. Use exactly {overall_score} as overall_score.

Produce a professional report that feels specific to THIS interview. Every narrative field must be grounded in the actual questions and answers above. Do not write generic filler. Do not reuse the same sentence or idea across multiple fields.

Return ONLY valid JSON with this structure:
{{
  "overall_score": {overall_score},
  "headline": "A short interview-specific headline.",
  "summary": "A concise 2-3 sentence executive assessment based on the strongest evidence from this interview.",
  "strengths": ["Specific strength supported by an answer.", "Another distinct strength.", "A third distinct strength."],
  "improvements": ["Specific weakness supported by an answer.", "Another distinct improvement area.", "A third distinct improvement area."],
  "communication": {{"score": 8, "label": "Strong", "feedback": "A concise evidence-based communication assessment."}},
  "technical": {{"score": 8, "label": "Strong", "feedback": "A concise evidence-based technical assessment."}},
  "answer_pattern": "Describe the candidate's actual response pattern across this interview and how that pattern affected answer quality.",
  "coaching_focus": "Name the single highest-value skill to improve next, based on the weakest meaningful evidence.",
  "coach_tip": "Give one concrete action the candidate can apply in the next interview. It must be different from every improvement item and recommendation.",
  "framework": {{"name": "STAR or another suitable framework", "when_to_use": "Explain when this framework is useful for the candidate's next practice."}},
  "next_practice": "Give one specific practice exercise tied to the candidate's actual weakness.",
  "recommendation": "Give one concise next-step recommendation that adds new information rather than repeating the coach tip.",
  "final_takeaway": "One memorable sentence summarizing the most important lesson from this interview."
}}

Rules:
- overall_score must equal {overall_score}.
- communication.score and technical.score must be integers from 0 to 10 and must reflect answer quality, not camera or speech metrics.
- strengths and improvements must contain exactly 3 distinct items.
- Use concrete evidence from the candidate's answers. If a weakness cannot be supported, do not invent it.
- Do not invent employers, projects, technologies, qualifications, achievements, metrics, or resume facts.
- If no resume or job description was supplied for this interview, never claim that a specific experience came from the candidate's resume or job description.
- Do not automatically recommend STAR. Use STAR only when behavioral or experience-based answers genuinely need Situation, Task, Action and Result structure. For technical or conceptual answers, choose a more appropriate structure such as definition-example-trade-off, problem-approach-result, or concept-implementation-complexity.
- Do not use phrases such as "practice more", "be confident", "communicate clearly", or "use STAR" unless the actual evidence specifically supports that advice.
- coach_tip, next_practice, recommendation, coaching_focus and final_takeaway must not repeat one another.
- The summary must not simply restate the score.
- Avoid repeating the same paragraph or template wording used for other interviews.
- Keep the report concise, professional, actionable and human-readable.
""",
        config={"system_instruction": system_prompt},
    )

    result = json.loads(_clean_json_response(response.text))
    if not isinstance(result, dict):
        raise ValueError("Gemini returned invalid final feedback")

    result["overall_score"] = overall_score
    result["strengths"] = _unique_text_items(result.get("strengths"), 3)
    result["improvements"] = _unique_text_items(result.get("improvements"), 3)

    if len(result["strengths"]) < 3:
        result["strengths"] += ["Review the question-level evidence for additional strengths."] * (3 - len(result["strengths"]))
    if len(result["improvements"]) < 3:
        result["improvements"] += ["Use the lowest-scoring response as the next focused practice target."] * (3 - len(result["improvements"]))

    framework = result.get("framework")
    if not isinstance(framework, dict):
        result["framework"] = {
            "name": "Answer-specific structure",
            "when_to_use": "Choose a structure that matches the question type instead of applying one framework to every answer.",
        }

    return json.dumps(result, ensure_ascii=False)