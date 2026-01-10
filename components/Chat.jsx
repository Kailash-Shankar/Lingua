"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "../components/ChatMessage";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const chatEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input || loading) return;

    const userMessage = { role: "user", text: input };
    // Append user message to both UI and API history
    setMessages((prev) => [...prev, { user: true, text: input }]);
    setConversationHistory((prev) => [...prev, userMessage]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: [...conversationHistory, userMessage],
        }),
      });

      const data = await response.json();

      if (!data.reply || !data.history) {
        throw new Error("Invalid API response");
      }

      // Append assistant reply to messages and conversation history
      const assistantMessage = { role: "assistant", text: data.reply };
      setMessages((prev) => [...prev, { user: false, text: data.reply }]);
      setConversationHistory(data.history); // Keep history exactly as API returned

    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { user: false, text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <div className="flex flex-col h-screen p-20 bg-gray-50">
      <div className="space-y-2 h-[800px] overflow-y-auto border p-4 rounded bg-gray-100">
        {messages.map((msg, i) => (
          <div key={`${i}-${msg.user ? "u" : "b"}`} className={msg.user ? "text-right" : "text-left"}>
            <span className={`inline-block p-2 rounded ${msg.user ? "bg-orange-500 text-white" : "bg-gray-200"}`}>
              <ChatMessage text={msg.text} isUser={msg.user} />
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {loading && <div className="text-left text-gray-500 p-2">Bot is typing...</div>}

      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="bg-orange-500 text-white px-4 rounded"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
