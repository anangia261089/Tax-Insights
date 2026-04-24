"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  isStreaming: boolean;
}

export default function AnalysisStream({ content, isStreaming }: Props) {
  if (!content) return null;

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-gray-900 mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-gray-900 mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-900 mt-5 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B7A3] shrink-0" />
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
          ),

          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),

          // Italic
          em: ({ children }) => (
            <em className="italic text-gray-600">{children}</em>
          ),

          // Horizontal rule — visual section break
          hr: () => (
            <hr className="border-none border-t border-gray-100 my-4" />
          ),

          // Unordered list
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1.5 ml-0">{children}</ul>
          ),

          // Ordered list
          ol: ({ children }) => (
            <ol className="mb-3 space-y-2 ml-0 list-none counter-reset-[item]">{children}</ol>
          ),

          // List items — handle both ul and ol cleanly
          li: ({ children, ...props }) => {
            const isOrdered = (props as { ordered?: boolean }).ordered;
            return isOrdered ? (
              <li className="text-sm text-gray-700 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#00B7A3]/10 text-[#00B7A3] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {(props as { index?: number }).index != null
                    ? ((props as { index?: number }).index ?? 0) + 1
                    : "•"}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            ) : (
              <li className="text-sm text-gray-700 flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#00B7A3] shrink-0 mt-2" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },

          // Blockquote — used for callouts / flagged items
          blockquote: ({ children }) => (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 my-3 text-sm text-amber-900">
              {children}
            </div>
          ),

          // Tables — properly rendered like Claude desktop
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-gray-200">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-gray-700">{children}</td>
          ),

          // Inline code
          code: ({ children }) => (
            <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),

          // Code block
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs my-3">
              {children}
            </pre>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00B7A3] underline underline-offset-2 hover:text-[#009d8c]"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[#00B7A3] rounded-sm animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}
