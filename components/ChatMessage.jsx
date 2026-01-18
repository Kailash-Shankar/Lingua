import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ text, isUser }) {
  return (
    <div className={isUser ? "text-right" : "text-left"}>
      <div
        className={`inline-block max-w-[80%] p-3 rounded-xl ${
          isUser
            ? "bg-orange-300 text-black"
            : "bg-white text-black"
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline, children }) {
              return inline ? (
                <code className="bg-black/10 px-1 rounded">
                  {children}
                </code>
              ) : (
                <pre className="bg-black text-white p-3 rounded-lg overflow-x-auto">
                  <code>{children}</code>
                </pre>
              );
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
