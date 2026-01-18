"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatMessage from "@/components/ChatMessage"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, User, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress"; 
import React from "react";
import confetti from "canvas-confetti"; // 🔥 Added for success effect

export default function AssignmentChatPage() {
  const { studentId, courseId, assignmentId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [charMemory, setCharMemory] = useState(null);

  const chatEndRef = useRef(null);
  const hasGreeted = useRef(false); 
  const isGreetingInProgress = useRef(false); // 🔥 Prevents double-greeting
  const isFirstLoad = useRef(true);
  const confettiFired = useRef(false); // 🔥 Prevents repeated confetti
  const avatarPath = searchParams.get('v') || '/f1.png';
  
  const ACCENT_MAP = {
    Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
    German: ['ä', 'ö', 'ü', 'ß'],
    Italian: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'],
    Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
  };

  const [showAccents, setShowAccents] = useState(false);

  const insertAccent = (char) => {
    setInput(prev => prev + char);
    document.getElementById('chat-input')?.focus();
  };

  const [user, setUser] = useState(null); 

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  // 1. Initial Data Load (Restores session from DB)
  useEffect(() => {
    const initChat = async () => {
      try {
        setInitializing(true);

        const { data: assignData, error: aError } = await supabase
          .from("assignments")
          .select(`*, courses ( language, level )`)
          .eq("id", assignmentId)
          .single();
        if (aError) throw aError;
        setAssignment(assignData);

        const { data: subData, error: sError } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .single();
        if (sError) throw sError;
        setSubmission(subData);

        const { data: charData } = await supabase
          .from("characters")
          .select("*")
          .eq("character_id", subData.character_id)
          .eq("language", assignData.courses.language)
          .single();
        setCharMemory(charData);

        // 🔥 RESTORE HISTORY: If history exists, populate UI and lock greeting
        if (subData.chat_history && subData.chat_history.length > 0) {
          hasGreeted.current = true; 
          setMessages(subData.chat_history.map(m => ({
            user: m.role === "user",
            text: m.text
          })));
        }

      } catch (err) {
        console.error("Initialization error:", err.message);
      } finally {
        setInitializing(false);
      }
    };

    if (assignmentId && studentId) initChat();
  }, [assignmentId, studentId]);

  // 2. AI Initial Greeting Logic (Strict Double-Greeting Guard)
  useEffect(() => {
  const triggerGreeting = async () => {
    // 🛑 STOP: If loading, already greeted, or messages already exist
    if (initializing || hasGreeted.current || isGreetingInProgress.current || messages.length > 0 || (submission?.chat_history?.length > 0)) {
      return;
    }

    // Additional check: Make sure all data is loaded
    if (!assignment || !submission || !charMemory) {
      return;
    }

    isGreetingInProgress.current = true;
    hasGreeted.current = true;
    setLoading(true);

    try {
      const chatContext = {
        language: assignment.courses.language,
        level: assignment.courses.level,
        topic: assignment.topic,
        scenario: assignment.scenario,
        vocabulary: assignment.vocabulary_list,
        grammar: assignment.grammar_focus,
        difficulty: assignment.difficulty,
        exchanges: assignment.min_exchanges,
        character_id: submission.character_id,
        character_description: charMemory?.character_description || "",
        memory: charMemory?.student_personality || ""
      };

      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "START_CONVERSATION_GREETING",
          history: [], 
          context: chatContext
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.reply) throw new Error(data.error || "Greeting failed");

      const assistantMsg = { role: "assistant", text: data.reply };
      
      // Save greeting to DB
      await supabase.from("submissions").update({
        chat_history: [assistantMsg],
        status: 'in_progress'
      }).eq("id", submission.id);

      setMessages([{ user: false, text: data.reply }]);
      setSubmission(prev => ({ ...prev, chat_history: [assistantMsg] }));

    } catch (err) {
      console.error("❌ Greeting Error:", err);
      hasGreeted.current = false;
      isGreetingInProgress.current = false;
    } finally {
      setLoading(false);
      isGreetingInProgress.current = false;
    }
  };

  // Only trigger when initialization is complete and we have all data
  if (!initializing && assignment && submission && charMemory && !hasGreeted.current) {
    triggerGreeting();
  }
}, [initializing, assignment, submission, charMemory]); // ✅ Remove messages.length from dependencies

  

  // 3. Auto-scroll Logic
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // 🔥 4. Confetti Logic
  const progressValue = assignment?.min_exchanges 
    ? ((submission?.current_exchange_count || 0) / assignment.min_exchanges) * 100 
    : 0;

  useEffect(() => {
    if (progressValue >= 100 && !confettiFired.current) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#16a34a', '#fbbf24', '#3b82f6']
      });
      confettiFired.current = true;
    }
  }, [progressValue]);

  // 5. Send Message Logic (With Persistent Saves)
  const sendMessage = async () => {
  if (!input.trim() || loading) return;

  const userText = input;
  const userMsg = { role: "user", text: userText };
  
  setMessages((prev) => [...prev, { user: true, text: userText }]);
  setInput("");
  setLoading(true);

  try {
    console.log("💾 Starting save process...");
    console.log("📋 Submission ID:", submission?.id);
    console.log("📝 Current chat_history from state:", submission?.chat_history);
    
    // ✅ PHASE 1: Save user message to database IMMEDIATELY
    const historyWithUser = [...(submission?.chat_history || []), userMsg];
    console.log("📤 History with user message:", historyWithUser);

    const chatContext = {
      language: assignment.courses.language,
      level: assignment.courses.level,
      topic: assignment.topic,
      scenario: assignment.scenario,
      vocabulary: assignment.vocabulary_list,
      grammar: assignment.grammar_focus,
      difficulty: assignment.difficulty,
      exchanges: assignment.min_exchanges,
      character_id: submission.character_id,
      character_description: charMemory?.character_description || "",
      memory: charMemory?.student_personality || ""
    };

    console.log("💾 Attempting to save user message to DB...");
    const { data: userUpdateData, error: userWriteError } = await supabase
      .from("submissions")
      .update({ chat_history: historyWithUser })
      .eq("id", submission.id)
      .select(); // ✅ Add .select() to see what was saved

    if (userWriteError) {
      console.error("❌ User write error:", userWriteError);
      throw userWriteError;
    }
    
    console.log("✅ User message saved! DB returned:", userUpdateData);

    console.log("🤖 Calling AI API...");
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: historyWithUser, 
        context: chatContext 
      }),
    });

    const data = await response.json();
    console.log("🤖 AI Response:", data);
    
    const assistantMsg = { role: "assistant", text: data.reply };

    // PHASE 2: Save AI Response & Increment Count
    const finalHistory = [...historyWithUser, assistantMsg];
    const newCount = (submission?.current_exchange_count || 0) + 1;

    console.log("💾 Attempting to save AI response to DB...");
    console.log("📤 Final history:", finalHistory);
    console.log("🔢 New count:", newCount);
    console.log("📊 Status:", newCount >= assignment.min_exchanges ? 'completed' : 'in_progress');

    const { data: aiUpdateData, error: aiWriteError } = await supabase
      .from("submissions")
      .update({
        chat_history: finalHistory,
        current_exchange_count: newCount,
        status: newCount >= assignment.min_exchanges ? 'completed' : 'in_progress'
      })
      .eq("id", submission.id)
      .select(); // ✅ Add .select() to see what was saved

    if (aiWriteError) {
      console.error("❌ AI write error:", aiWriteError);
      throw aiWriteError;
    }

    console.log("✅ AI response saved! DB returned:", aiUpdateData);

    setMessages((prev) => [...prev, { user: false, text: data.reply }]);
    setSubmission(prev => ({ 
      ...prev, 
      chat_history: finalHistory, 
      current_exchange_count: newCount 
    }));

  } catch (err) {
    console.error("❌ Database Write Error:", err);
    console.error("❌ Full error object:", err);
  } finally {
    setLoading(false);
  }
};

  if (initializing) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  );

  return (
  <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50">
    <header className="flex-none bg-white border-b px-6 py-4 flex flex-col gap-3 shadow-sm z-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-bold text-gray-900">{assignment?.title}</h2>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
              Chatting with {submission?.character_id}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(progressValue, 100)}%` }} />
      </div>
    </header>

    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gray-50 scroll-smooth">
      {messages.map((msg, i) => (
        <div key={i} className={`flex w-full ${msg.user ? "justify-end" : "justify-start"}`}>
          <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${msg.user ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border ${msg.user ? "bg-black" : "bg-white"}`}>
              {msg.user ? <User className="h-5 w-5 text-white" /> : <img src={avatarPath} alt="AI" className="h-full w-full object-cover" />}
            </div>
            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm ${
              msg.user ? "bg-orange-300 text-white rounded-tr-none" : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
            }`}>
              <div className={`pl-3 font-bold uppercase ${msg.user ? "text-red-800" :"text-blue-600"}`}>
               {msg.user ? user?.user_metadata?.first_name : submission?.character_id}
               </div>
              <ChatMessage text={msg.text} isUser={msg.user} />
            </div>
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start animate-in fade-in">
          <div className="flex gap-3 items-center">
            <div className="h-9 w-9 rounded-full overflow-hidden border bg-white">
              <img src={avatarPath} alt="AI" className="h-full w-full object-cover opacity-50" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={chatEndRef} className="h-2" />
    </div>

    <footer className="flex-none p-4 bg-white border-t z-20">
      <div className="max-w-4xl mx-auto relative">
        {progressValue >= 100 ? (
          <div className="animate-in zoom-in duration-500">
            <Button 
              onClick={() => router.push(`/student/${studentId}/courses/${courseId}`)} 
              className="w-full py-8 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xl font-bold flex gap-3 shadow-xl"
            >
              <CheckCircle className="h-7 w-7" /> Finish Assignment
            </Button>
          </div>
        ) : (
          <>
            {showAccents && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border shadow-xl rounded-2xl p-2 flex gap-2 flex-wrap z-50 animate-in slide-in-from-bottom-2">
                {(ACCENT_MAP[assignment?.courses?.language] || ACCENT_MAP.Default).map((char) => (
                  <button
                    key={char}
                    onClick={() => insertAccent(char)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl font-bold text-lg border border-gray-100 transition-colors"
                  >
                    {char}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex items-center gap-2">
              <div className="flex flex-col items-center pb-2">
                <div className="text-xs uppercase text-gray-500">add accent</div>
                <button
                  onClick={() => setShowAccents(!showAccents)}
                  className={`p-2 rounded-xl border transition-all font-bold w-12 h-12 flex items-center justify-center ${
                    showAccents ? "bg-black text-white border-black" : "bg-blue-400 text-black border-blue-200 hover:border-blue-500 hover:bg-blue-600"
                  }`}
                >
                  Á
                </button>
              </div>
              <input
                id="chat-input"
                className="flex-1 bg-gray-100 border-none rounded-2xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-black outline-none text-sm"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="absolute right-2 p-2 bg-black text-white rounded-xl disabled:bg-gray-300"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </>
        )}
      </div>
    </footer>
  </div>
);
}