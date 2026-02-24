"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatMessage from "@/components/ChatMessage"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, User, CheckCircle, MessageCircle, FlaskConical } from "lucide-react";
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
  const [charDescription, setCharDescription] = useState("");
  const [exchangeCount, setExchangeCount] = useState(0);
  const [showAccents, setShowAccents] = useState(false);
  const [user, setUser] = useState(null);
  
  // Vocab Tooltip States
  const [tooltip, setTooltip] = useState({ show: false, word: "", x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const avatarPath = searchParams.get('v') || '/f1.png';
  const characterName = searchParams.get('char') || "AI Character";
  
  const ACCENT_MAP = {
    Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
    German: ['ä', 'ö', 'ü', 'ß'],
    Italian: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'],
    Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
  };

  // --- Vocab Feature Logic (Demo Mode) ---
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const finalString = selection.toString().trim().replace(/[.,!?;:]+$/, "");
    if (finalString) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setIsAdded(false);
      setTooltip({ 
        show: true, 
        word: finalString, 
        x: rect.left + rect.width / 2, 
        y: rect.top + window.scrollY - 55 
      });
    }
  };

  const saveToVocab = async () => {
    if (isSaving || isAdded) return;
    setIsSaving(true);
    
    // Simulate API delay for the teacher demo
    setTimeout(() => {
      setIsSaving(false);
      setIsAdded(true);
      setTimeout(() => {
        setTooltip(prev => ({ ...prev, show: false }));
        setIsAdded(false);
      }, 1500);
    }, 800);
  };

  useEffect(() => {
    const hide = () => { if (!isSaving) setTooltip(prev => ({ ...prev, show: false })); };
    window.addEventListener("mousedown", hide);
    return () => window.removeEventListener("mousedown", hide);
  }, [isSaving]);

  // --- Existing Logic Hooks ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        setInitializing(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        const { data: assignData } = await supabase
        .from("assignments")
        .select(`*, courses!assignments_course_id_fkey ( language, level )`) 
        .eq("id", assignmentId)
        .single();
        
        if (assignData) {
          setAssignment(assignData);
          const { data: charData } = await supabase
            .from("characters")
            .select("character_description")
            .eq("character_id", characterName)
            .eq("language", assignData.courses.language)
            .single();

          if (charData) setCharDescription(charData.character_description);
        }
      } catch (err) {
        console.error("Demo Initialization error:", err.message);
      } finally {
        setInitializing(false);
      }
    };
    if (assignmentId) fetchDemoData();
  }, [assignmentId, characterName]);

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
        hasGreeted.current = false;
      } finally {
        setLoading(false);
        isGreetingInProgress.current = false;
      }
    };
    triggerGreeting();
  }, [initializing, assignment, charDescription]);

  const progressValue = (assignment?.exchanges) 
    ? (exchangeCount / assignment.exchanges) * 100 
    : 0;

  useEffect(() => {
    if (progressValue >= 100 && !confettiFired.current) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      confettiFired.current = true;
    }
  }, [progressValue]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !assignment) return;
    
    const userText = input;
    const userMsg = { role: "user", text: userText };
    const currentHistory = messages.map(m => ({ role: m.user ? "user" : "assistant", text: m.text }));

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
            character_description: charDescription,
          }
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { user: false, text: data.reply }]);
      setExchangeCount(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const insertAccent = (char) => {
    const inputEl = document.getElementById('chat-input');
    if (!inputEl) return;
    const start = inputEl.selectionStart;
    const newValue = input.substring(0, start) + char + input.substring(inputEl.selectionEnd);
    setInput(newValue);
    inputEl.focus();
    setTimeout(() => { inputEl.setSelectionRange(start + 1, start + 1); }, 0);
  };

  if (initializing) return <div className="h-screen flex items-center justify-center bg-[#FEFAF2]"><Loader2 className="animate-spin h-8 w-8 text-[#2D2D2D]" /></div>;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#FEFAF2] text-[#2D2D2D] font-medium selection:bg-[#FFD966]">
      {/* Neo-Brutalist Header */}
      <header className="flex-none bg-white border-b-2 border-[#2D2D2D] px-6 py-4 z-20">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-xl border-2 border-[#2D2D2D] shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight leading-tight">{assignment?.title}</h2>
                <span className="bg-[#E6F4F1] border-2 border-[#2D2D2D] text-[#2D2D2D] text-[10px] px-2 py-0.5 rounded-lg font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#2D2D2D]">
                    <FlaskConical size={10} /> TEACHER DEMO
                </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-1">
              Testing as {characterName} • <span className="text-red-500">No data saved</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-[#2D2D2D] px-4 py-1.5 rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D]">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-bold">{exchangeCount} / {assignment?.exchanges}</span>
          </div>
        </div>
        
        <div className="w-full bg-[#E8E8E8] h-3 mt-4 border-2 border-[#2D2D2D] rounded-full overflow-hidden">
          <div className="h-full bg-[#06d826] transition-all duration-1000 ease-out" style={{ width: `${Math.min(progressValue, 100)}%` }} />
        </div>
      </header>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8" onMouseUp={handleTextSelection}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.user ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-4 max-w-[85%] ${msg.user ? "flex-row-reverse" : "flex-row"}`}>
              <div className="h-11 w-11 flex-none rounded-full border-2 border-[#2D2D2D] bg-white overflow-hidden shadow-[3px_3px_0px_0px_#2D2D2D]">
                {msg.user ? (
                  <div className="h-full w-full flex items-center justify-center bg-[#FFD966]">
                    <User className="h-5 w-5" />
                  </div>
                ) : (
                  <img src={avatarPath} className="h-full w-full object-cover" alt="AI" />
                )}
              </div>
              
              <div className={`relative px-5 py-3.5 border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#2D2D2D] ${
                msg.user ? "bg-[#FFD966] rounded-tr-none" : "bg-white rounded-tl-none"
              }`}>
                <div className="text-[9px] font-bold uppercase mb-1.5 opacity-40 tracking-widest">
                  {msg.user ? (user?.user_metadata?.first_name || "TEACHER") : characterName}
                </div>
                <div className="text-[15px] leading-relaxed">
                  <ChatMessage text={msg.text} isUser={msg.user} />
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
             <div className="flex gap-4 max-w-[80%] flex-row">
              <div className="h-11 w-11 flex-none rounded-full border-2 border-[#2D2D2D] bg-white overflow-hidden shadow-[3px_3px_0px_0px_#2D2D2D]">
                <img src={avatarPath} className="h-full w-full object-cover" alt="AI" />
              </div>
              <div className="px-6 py-4 bg-white border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#2D2D2D] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#2D2D2D] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-[#2D2D2D] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-[#2D2D2D] rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Footer / Input */}
      <footer className="p-6 bg-white border-t-2 border-[#2D2D2D]">
        <div className="max-w-4xl mx-auto">
          {progressValue >= 100 ? (
            <Button 
              onClick={() => router.back()} 
              className="w-full py-8 bg-[#81E6D9] border-2 border-[#2D2D2D] text-[#2D2D2D] text-xl font-bold rounded-2xl shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              <CheckCircle className="mr-3 h-7 w-7" /> Finish Demo & Return
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              {showAccents && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#FEFAF2] border-2 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] animate-in slide-in-from-bottom-2">
                  {ACCENT_MAP[assignment?.courses?.language || 'Default']?.map(c => (
                    <button key={c} onClick={() => insertAccent(c)} className="w-10 h-10 bg-white border-2 border-[#2D2D2D] rounded-xl font-bold text-lg hover:bg-[#FFD966] transition-colors">{c}</button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAccents(!showAccents)} 
                  className={`w-14 h-14 border-2 border-[#2D2D2D] rounded-2xl font-bold text-xl shadow-[4px_4px_0px_0px_#2D2D2D] transition-all ${
                    showAccents ? "bg-[#2D2D2D] text-white translate-x-1 translate-y-1 shadow-none" : "bg-[#FFADAD] text-[#2D2D2D]"
                  }`}
                >Á</button>
                <div className="flex-1 relative">
                  <textarea 
                    id="chat-input"
                    className="w-full h-14 bg-[#F5F5F5] border-2 border-[#2D2D2D] rounded-2xl py-3.5 px-6 outline-none font-medium placeholder:opacity-30 shadow-[4px_4px_0px_0px_#2D2D2D] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all resize-none"
                    placeholder="Type your response..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                    disabled={loading}
                  />
                </div>
                <Button 
                  onClick={sendMessage} 
                  disabled={loading || !input.trim()} 
                  className="h-14 w-14 bg-[#2D2D2D] text-white rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] hover:bg-black"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* Demo Vocab Tooltip */}
      {tooltip.show && (
        <div 
          className="absolute z-[100] bg-[#2D2D2D] text-white rounded-2xl border-2 border-[#2D2D2D] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] flex items-center overflow-hidden -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y }}
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <span className="font-bold px-4 py-2 text-sm">{tooltip.word}</span>
          <button 
            onClick={saveToVocab}
            disabled={isSaving}
            className={`${isAdded ? 'bg-[#81E6D9] text-[#2D2D2D]' : 'bg-[#FFD966] text-[#2D2D2D]'} border-l-2 border-[#2D2D2D] px-4 py-2 text-xs font-bold uppercase transition-all`}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : isAdded ? "Saved!" : "Add to Vocab"}
          </button>
        </div>
      )}
    </div>
  );
}