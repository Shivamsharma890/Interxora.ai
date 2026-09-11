from AI.interview_engine import generate_first_question


question = generate_first_question(
    role="Python Full Stack Developer",
    interview_type="Technical",
    difficulty="Medium"
)

print("\nAI QUESTION:")
print(question)