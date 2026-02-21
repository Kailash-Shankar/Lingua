"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatMessage from "@/components/ChatMessage"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, User, CheckCircle, Lock, MessageCircle } from "lucide-react";
import React from "react";
import confetti from "canvas-confetti";

export default function AssignmentChatPage() {
  const { studentId, courseId, assignmentId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Refs (Preserving Logic) ---
  const chatEndRef = useRef(null);
  const hasGreeted = useRef(false);
  const isGreetingInProgress = useRef(false);
  const confettiFired = useRef(false);

  // --- State (Preserving Logic) ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [charMemory, setCharMemory] = useState(null);
  const [showAccents, setShowAccents] = useState(false);
  const [user, setUser] = useState(null);
  const [isLocked, setIsLocked] = useState({ locked: false, reason: "" });
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [specificMemory, setSpecificMemory] = useState(null);
  const [name, setName] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, word: "", x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const avatarPath = searchParams.get('v') || '/f1.png';
  
  const ACCENT_MAP = {
    Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
    German: ['ä', 'ö', 'ü', 'ß'],
    Italian: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'],
    Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
  };

  // --- Helper Logic (No changes to logic) ---
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const finalString = selection.toString().trim().replace(/[.,!?;:]+$/, "");
    if (finalString) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setIsAdded(false);
      setTooltip({ show: true, word: finalString, x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 105 });
    }
  };

  const saveToVocab = async () => {
    if (isSaving || isAdded) return;
    try {
      setIsSaving(true);
      const { data: enrollment } = await supabase.from("course_enrollments").select("vocab_list").eq("course_id", courseId).eq("student_id", studentId).single();
      const currentList = enrollment?.vocab_list || [];
      if (!currentList.includes(tooltip.word)) {
        await supabase.from("course_enrollments").update({ vocab_list: [...currentList, tooltip.word] }).eq("course_id", courseId).eq("student_id", studentId);
      }
      setIsAdded(true);
      setTimeout(() => { setTooltip(prev => ({ ...prev, show: false })); setIsAdded(false); }, 1500);
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  useEffect(() => {
    const hide = () => { if (!isSaving) setTooltip(prev => ({ ...prev, show: false })); };
    window.addEventListener("mousedown", hide);
    return () => window.removeEventListener("mousedown", hide);
  }, [isSaving]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitializing(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        const { data: enrollment } = await supabase.from("course_enrollments").select("memory_1, memory_2, memory_3, memory_4, First_Name").eq("course_id", courseId).eq("student_id", studentId).single();
        const { data: assignData } = await supabase.from("assignments").select(`*, courses!assignments_course_id_fkey ( language, level )`).eq("id", assignmentId).single();
        if (!assignData) return;
        setAssignment(assignData);
        if (enrollment?.First_Name) setName(enrollment.First_Name);
        const now = new Date();
        const startDate = new Date(assignData.start_at);
        const dueDate = assignData.due_at ? new Date(assignData.due_at) : null;
        if (now < startDate) setIsLocked({ locked: true, reason: `Opens ${startDate.toLocaleDateString()}` });
        else if (dueDate && now > dueDate) setIsLocked({ locked: true, reason: "Closed (Due date passed)." });
        else setIsLocked({ locked: false, reason: "" });
        const { data: subData } = await supabase.from("submissions").select("*").eq("assignment_id", assignmentId).eq("student_id", studentId).maybeSingle();
        setSubmission(subData);
        if (subData) {
          const { data: charData } = await supabase.from("characters").select("*").eq("character_id", subData.character_id).eq("language", assignData.courses.language).single();
          setCharMemory(charData);
          const charId = charData?.order?.toString().charAt(0);
          if (enrollment?.[`memory_${charId}`]) setSpecificMemory(enrollment[`memory_${charId}`]);
          if (subData.chat_history?.length > 0) {
            hasGreeted.current = true;
            setMessages(subData.chat_history.map(m => ({ user: m.role === "user", text: m.text })));
          }
        }
      } catch (err) { console.error(err); } finally { setInitializing(false); }
    };
    if (assignmentId && studentId) fetchData();
  }, [assignmentId, studentId, courseId]);

  useEffect(() => {
    const triggerGreeting = async () => {
      if (initializing || isLocked.locked || hasGreeted.current || isGreetingInProgress.current || !submission || !assignment || !name) return;
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
            context: { language: assignment.courses.language, level: assignment.courses.level, topic: assignment.topic, scenario: assignment.scenario, character_id: submission.character_id, character_description: charMemory?.character_description || "", grammar: assignment.grammar, vocabulary: assignment.vocabulary, student_name: name, memory: specificMemory ? specificMemory.join(", " ) : null }
          }),
        });
        const data = await response.json();
        const assistantMsg = { role: "assistant", text: data.reply };
        await supabase.from("submissions").update({ chat_history: [assistantMsg], status: 'in_progress' }).eq("id", submission.id);
        setMessages([{ user: false, text: data.reply }]);
        setSubmission(prev => ({ ...prev, chat_history: [assistantMsg] }));
      } catch (err) { hasGreeted.current = false; } finally { setLoading(false); isGreetingInProgress.current = false; }
    };
    triggerGreeting();
  }, [initializing, assignment, submission, charMemory, isLocked.locked, name, specificMemory]);

  const progressValue = (assignment?.exchanges && submission) ? ((submission?.current_exchange_count || 0) / assignment.exchanges) * 100 : 0;

  useEffect(() => {
    if (progressValue >= 100 && !confettiFired.current) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      confettiFired.current = true;
    }
  }, [progressValue]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !submission || isLocked.locked) return;
    const userText = input;
    setMessages(prev => [...prev, { user: true, text: userText }]);
    setInput("");
    setLoading(true);
    try {
      const historyWithUser = [...(submission.chat_history || []), { role: "user", text: userText }];
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: historyWithUser, context: { language: assignment.courses.language, level: assignment.courses.level, character_id: submission.character_id, character_description: charMemory?.character_description || "", grammar: assignment.grammar, vocabulary: assignment.vocabulary, current_exchange_count: submission.current_exchange_count, exchanges: assignment.exchanges, student_name: name, memory: specificMemory ? specificMemory.join(", " ) : null } }),
      });
      const data = await response.json();
      const assistantMsg = { role: "assistant", text: data.reply };
      const newCount = (submission.current_exchange_count || 0) + 1;
      await supabase.from("submissions").update({ chat_history: [...historyWithUser, assistantMsg], current_exchange_count: newCount, status: newCount >= assignment.exchanges ? 'completed' : 'in_progress' }).eq("id", submission.id);
      setMessages(prev => [...prev, { user: false, text: data.reply }]);
      setSubmission(prev => ({ ...prev, chat_history: [...historyWithUser, assistantMsg], current_exchange_count: newCount }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleFinishAssignment = async () => {
    setIsFinalizing(true);
    try {
      const response = await fetch("/api", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "GENERATE_FEEDBACK_SUMMARY", history: submission.chat_history, context: { level: assignment.courses.level, language: assignment.courses.language, topic: assignment.topic, difficulty: assignment.difficulty } }),
      });
      const result = await response.json();
      const charId = charMemory?.order?.toString().charAt(0);
      await supabase.from("submissions").update({ pos_feedback: result.strengths, neg_feedback: result.improvements, status: "completed", submitted_at: new Date().toISOString() }).eq("id", submission.id);
      supabase.from("course_enrollments").update({ [`memory_${charId}`]: result.personality_traits }).eq("course_id", courseId).eq("student_id", studentId);
      router.push(`/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/results`);
    } catch (err) { setIsFinalizing(false); }
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
      {/* Soft Neo-Brutalist Header */}
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
            <h2 className="text-lg font-bold tracking-tight leading-tight">{assignment?.title}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className={`h-2 w-2 rounded-full ${isLocked.locked ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
               <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                 {isLocked.locked ? "Locked" : `Chatting with ${submission?.character_id}`}
               </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#E6F4F1] border-2 border-[#2D2D2D] px-4 py-1.5 rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D]">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-bold">{submission?.current_exchange_count} / {assignment?.exchanges}</span>
          </div>
        </div>
        
        {/* Curved Progress Bar */}
        <div className="w-full bg-[#E8E8E8] h-3 mt-4 border-2 border-[#2D2D2D] rounded-full overflow-hidden">
          <div className="h-full bg-[#74C0FC] transition-all duration-1000 ease-out" style={{ width: `${Math.min(progressValue, 100)}%` }} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8" onMouseUp={handleTextSelection}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.user ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-4 max-w-[85%] ${msg.user ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar Fix: Clean circular frame, no distortion */}
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
                  {msg.user ? (name || "STUDENT") : submission?.character_id}
                </div>
                <div className="text-[15px] leading-relaxed">
                  <ChatMessage text={msg.text} isUser={msg.user} />
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loading && !isLocked.locked && (
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

      <footer className="p-6 bg-white border-t-2 border-[#2D2D2D]">
        <div className="max-w-4xl mx-auto">
          {submission && progressValue >= 100 ? (
            <Button 
              onClick={handleFinishAssignment} 
              disabled={isFinalizing} 
              className="w-full py-8 bg-[#81E6D9] border-2 border-[#2D2D2D] text-[#2D2D2D] text-xl font-bold rounded-2xl shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              {isFinalizing ? <Loader2 className="animate-spin h-7 w-7" /> : <><CheckCircle className="mr-3 h-7 w-7" /> Complete Mission</>}
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              {showAccents && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#FEFAF2] border-2 border-[#2D2D2D] rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D]">
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
                    disabled={loading || !submission}
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