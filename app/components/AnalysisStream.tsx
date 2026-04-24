"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  content: string;
  isStreaming: boolean;
}

export default function AnalysisStream({ content, isStreaming }: Props) {
  if (!content) return null;

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00B7A3] rounded-full shrink-0" />
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-3 ml-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-[#00B7A3] mt-1 shrink-0">-</span>
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <div className="bg-amber-50 border-l-3 border-amber-400 rounded-r-lg px-4 py-3 my-3 text-sm text-amber-900">
              {children}
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[#00B7A3] rounded-sm animate-pulse ml-0.5" />
      )}
    </div>
  );
}
