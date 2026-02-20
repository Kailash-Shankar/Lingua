"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatMessage from "@/components/ChatMessage"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, User, CheckCircle, MessageCircle, FlaskConical, User2, UserCircle2Icon, UserCheckIcon, UserCircle } from "lucide-react";
import React from "react";
import confetti from "canvas-confetti";

export default function TeacherDemoChatPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Refs ---
  const chatEndRef = useRef(null);
  const hasGreeted = useRef(false);
  const isGreetingInProgress = useRef(false);
  const confettiFired = useRef(false);

  // --- State Management ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [charDescription, setCharDescription] = useState(""); // New state for character description
  const [exchangeCount, setExchangeCount] = useState(0);
  const [showAccents, setShowAccents] = useState(false);
  const [user, setUser] = useState(null);

  const avatarPath = searchParams.get('v') || '/f1.png';
  const characterName = searchParams.get('char') || "AI Character";
  
  const ACCENT_MAP = {
    Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
    German: ['ä', 'ö', 'ü', 'ß'],
    Italian: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'],
    Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 1. Fetch Assignment & Character Data
  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        setInitializing(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // Fetch Assignment
        const { data: assignData } = await supabase
        .from("assignments")
        .select(`*, courses!assignments_course_id_fkey ( language, level )`) 
        .eq("id", assignmentId)
        .single();
        
        if (assignData) {
          setAssignment(assignData);

          // Fetch Character Description specifically
          const { data: charData } = await supabase
            .from("characters")
            .select("character_description")
            .eq("character_id", characterName)
            .eq("language", assignData.courses.language)
            .single();

          if (charData) {
            setCharDescription(charData.character_description);
          }
        }

      } catch (err) {
        console.error("Demo Initialization error:", err.message);
      } finally {
        setInitializing(false);
      }
    };
    if (assignmentId) fetchDemoData();
  }, [assignmentId, characterName]);

  // 2. AI Greeting logic
  useEffect(() => {
    const triggerGreeting = async () => {
      if (initializing || hasGreeted.current || isGreetingInProgress.current || !assignment) return;
      
      isGreetingInProgress.current = true;
      hasGreeted.current = true;
      setLoading(true);

      try {
        const response = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "START_CONVERSATION_GREETING",
            history: [], 
            context: {
              language: assignment.courses.language,
              level: assignment.courses.level,
              topic: assignment.topic,
              scenario: assignment.scenario,
              character_id: characterName,
              character_description: charDescription,
              grammar: assignment.grammar,
              vocabulary: assignment.vocabulary,
            }
          }),
        });

        const data = await response.json();
        setMessages([{ user: false, text: data.reply }]);
      } catch (err) {
        console.error("Greeting Error:", err);
        hasGreeted.current = false;
      } finally {
        setLoading(false);
        isGreetingInProgress.current = false;
      }
    };
    triggerGreeting();
  }, [initializing, assignment, charDescription]);

  // 3. Progress Calculation
  const progressValue = (assignment?.exchanges) 
    ? (exchangeCount / assignment.exchanges) * 100 
    : 0;

  useEffect(() => {
    if (progressValue >= 100 && !confettiFired.current) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      confettiFired.current = true;
    }
  }, [progressValue]);

  // 4. Send Message Logic
  const sendMessage = async () => {
    if (!input.trim() || loading || !assignment) return;
    
    const userText = input;
    const userMsg = { role: "user", text: userText };
    
    const currentHistory = messages.map(m => ({
      role: m.user ? "user" : "assistant",
      text: m.text
    }));

    setMessages(prev => [...prev, { user: true, text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: [...currentHistory, userMsg],
          context: {
            language: assignment.courses.language,
            level: assignment.courses.level,
            character_id: characterName,
            character_description: charDescription, // Updated to pass fetched description
          }
        }),
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { user: false, text: data.reply }]);
      setExchangeCount(prev => prev + 1);
    } catch (err) {
      console.error("Send Message Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToAssignment = () => {
    router.back();
  };

  const insertAccent = (char) => {
    setInput(prev => prev + char);
    document.getElementById('chat-input')?.focus();
  };

  if (initializing) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50">
      <header className="flex-none bg-white border-b px-6 py-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft /></Button>
          <div>
            <div className="flex items-center gap-2">
                <h2 className="font-bold">{assignment?.title}</h2>
                <span className="bg-cyan-100 text-cyan-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <FlaskConical size={10} /> TEACHER DEMO
                </span>
            </div>
            <p className="text-xs text-gray-500">
              Testing chat as {characterName} (No data will be saved)
            </p>
          </div>
          <div className="flex align-right ml-auto text-sm text-gray-500 font-medium">
            <MessageCircle className="mr-2 flex align-center h-5 w-5" />{exchangeCount} / {assignment?.exchanges} Demo Exchanges
          </div>
        </div>
        <div className="w-full bg-gray-100 h-2 mt-3 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${Math.min(progressValue, 100)}%` }} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.user ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-[80%] ${msg.user ? "flex-row-reverse" : "flex-row"}`}>
              <div className="h-9 w-9 rounded-full overflow-hidden border">
                {msg.user ? <UserCircle className="h-full w-full    " /> : <img src={avatarPath} className="object-cover" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.user ? "bg-orange-300 text-blue-900" : "bg-white border text-gray-800"}`}>
                <div className="text-[10px] font-bold uppercase mb-1">{msg.user ? (user?.user_metadata?.first_name || "Teacher") : characterName}</div>
                <ChatMessage text={msg.text} isUser={msg.user} />
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
             <div className="flex gap-3 max-w-[80%] flex-row">
              <div className="h-9 w-9 rounded-full overflow-hidden border bg-white flex items-center justify-center">
                <img src={avatarPath} className="object-cover" />
              </div>
              <div className="px-4 py-5 rounded-2xl bg-white border text-gray-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <footer className="p-4 bg-white border-t">
        <div className="max-w-4xl mx-auto">
          {progressValue >= 100 ? (
            <Button onClick={handleReturnToAssignment} className="w-full py-8 bg-black text-white text-xl font-bold rounded-2xl hover:bg-gray-800">
              <CheckCircle className="mr-2" /> Finish Demo & Return
            </Button>
          ) : (
            <div className="relative flex items-center gap-2">
              <button onClick={() => setShowAccents(!showAccents)} className="w-12 h-12 bg-blue-400 rounded-xl font-bold">Á</button>
              {showAccents && (
                <div className="absolute bottom-16 bg-white border p-2 flex gap-2 rounded-xl shadow-lg z-50">
                  {ACCENT_MAP[assignment?.courses?.language || 'Default']?.map(c => (
                    <button key={c} onClick={() => insertAccent(c)} className="w-8 h-8 border rounded hover:bg-gray-100">{c}</button>
                  ))}
                </div>
              )}
              <input 
                id="chat-input"
                className="flex-1 bg-gray-100 rounded-2xl py-4 px-5 outline-none"
                placeholder="Type your message to test..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} className="h-12 w-12 rounded-xl">
                <Send />
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}