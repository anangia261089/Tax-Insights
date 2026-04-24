"use client";

interface Props {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
