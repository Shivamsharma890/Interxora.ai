import { useEffect, useRef, useState } from "react";

function SpeechInput({ value, onChange }) {
  const recognitionRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      onChange(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onChange]);

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Speech recognition could not start:", error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsListening(false);
  };

  if (!supported) {
    return (
      <div>
        <p>
          Speech recognition is not supported in this browser.
        </p>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          rows={6}
        />
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Speak your answer or type it here..."
        rows={6}
      />

      {!isListening ? (
        <button type="button" onClick={startListening}>
          🎤 Start Speaking
        </button>
      ) : (
        <button type="button" onClick={stopListening}>
          ⏹ Stop Speaking
        </button>
      )}

      {isListening && <p>🔴 Listening...</p>}
    </div>
  );
}

export default SpeechInput;