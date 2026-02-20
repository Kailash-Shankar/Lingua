"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ChatMessage from "@/components/ChatMessage"; 
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, User, CheckCircle, Lock, MessageSquare, MessageCircle } from "lucide-react";
import React from "react";
import confetti from "canvas-confetti";

export default function AssignmentChatPage() {
  const { studentId, courseId, assignmentId } = useParams();
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
  const [submission, setSubmission] = useState(null);
  const [charMemory, setCharMemory] = useState(null);
  const [showAccents, setShowAccents] = useState(false);
  const [user, setUser] = useState(null);
  const [isLocked, setIsLocked] = useState({ locked: false, reason: "" });
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [specificMemory, setSpecificMemory] = useState(null);
  const [name, setName] = useState(null);

  // --- Tooltip & Vocab States ---
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

  // --- Tooltip Logic ---
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const rawText = selection.toString();
    if (!rawText.trim().length) {
      setTooltip(prev => ({ ...prev, show: false }));
      return;
    }

    // Snap boundaries to whole words without collapsing multi-word selections
    if (!selection.isCollapsed) {
      const range = selection.getRangeAt(0);

      // Expand the start backwards to the beginning of the word
      selection.collapseToStart();
      selection.modify("extend", "backward", "word");
      const startRange = selection.getRangeAt(0);

      // Expand the end forwards to the end of the word
      selection.setBaseAndExtent(
        startRange.startContainer,
        startRange.startOffset,
        range.endContainer,
        range.endOffset
      );
      selection.modify("extend", "forward", "word");
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Clean up trailing punctuation for the saved word/phrase
    const finalString = selection.toString().trim().replace(/[.,!?;:]+$/, "");

    if (finalString) {
      setIsAdded(false);
      setTooltip({
        show: true,
        word: finalString,
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 105,
      });
    }
  };

  const saveToVocab = async () => {
    if (isSaving || isAdded) return;
    try {
      setIsSaving(true);
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("vocab_list")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .single();

      const currentList = enrollment?.vocab_list || [];
      if (!currentList.includes(tooltip.word)) {
        await supabase
          .from("course_enrollments")
          .update({ vocab_list: [...currentList, tooltip.word] })
          .eq("course_id", courseId)
          .eq("student_id", studentId);
      }
      setIsAdded(true);
      setTimeout(() => {
        setTooltip(prev => ({ ...prev, show: false }));
        setIsAdded(false);
      }, 1500);
    } catch (err) {
      console.error("Error saving vocab:", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const hide = () => {
      if (!isSaving) {
        setTooltip((prev) => ({ ...prev, show: false }));
        setIsAdded(false);
      }
    };
    window.addEventListener("mousedown", hide);
    return () => window.removeEventListener("mousedown", hide);
  }, [isSaving]);

  // Scroll to bottom helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 1. Initial Data Fetch & Lock Logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitializing(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);


        const { data: enrollment } = await supabase
          .from("course_enrollments")
          .select("memory_1, memory_2, memory_3, memory_4, First_Name") // Adjust based on actual columns
          .eq("course_id", courseId)
          .eq("student_id", studentId)
          .single();

        
        const { data: assignData } = await supabase
         .from("assignments")
          .select(`*, courses!assignments_course_id_fkey ( language, level )`)
          .eq("id", assignmentId)
          .single();
        
        if (!assignData) return;
        setAssignment(assignData);

        if (enrollment?.First_Name){
        setName(enrollment.First_Name);
      }

        const now = new Date();
        const startDate = new Date(assignData.start_at);
        const dueDate = assignData.due_at ? new Date(assignData.due_at) : null;

        if (now < startDate) {
          setIsLocked({ 
            locked: true, 
            reason: `This assignment opens on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.` 
          });
        } else if (dueDate && now > dueDate) {
          setIsLocked({ 
            locked: true, 
            reason: "This assignment is now closed as the due date has passed." 
          });
        } else {
          setIsLocked({ locked: false, reason: "" });
        }

        const { data: subData } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .maybeSingle();
        
        setSubmission(subData);

        if (subData) {
          const { data: charData } = await supabase
            .from("characters")
            .select("*")
            .eq("character_id", subData.character_id)
            .eq("language", assignData.courses.language)
            .single();
          setCharMemory(charData);

          const charId = charData?.order?.toString().charAt(0);
          const memoryKey = `memory_${charId}`;
          if (enrollment?.[memoryKey]) {
            setSpecificMemory(enrollment[memoryKey]);
          }



          if (subData.chat_history?.length > 0) {
            hasGreeted.current = true;
            setMessages(subData.chat_history.map(m => ({
              user: m.role === "user",
              text: m.text
            })));
          }
        }
      } catch (err) {
        console.error("Initialization error:", err.message);
      } finally {
        setInitializing(false);
      }
    };
    if (assignmentId && studentId) fetchData();
  }, [assignmentId, studentId]);

  // 2. AI Greeting logic
  useEffect(() => {
    const triggerGreeting = async () => {
      if (
        initializing || 
        !name ||
        isLocked.locked || 
        hasGreeted.current || 
        isGreetingInProgress.current || 
        !submission || 
        !assignment
      ) return;
      
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
              character_id: submission.character_id,
              character_description: charMemory?.character_description || "",
              grammar: assignment.grammar,
              vocabulary: assignment.vocabulary,
              student_name: name,
              memory: specificMemory ? specificMemory.join(", " ) : null, // Pass the specific traits as context
            }
          }),
        });

        const data = await response.json();
        const assistantMsg = { role: "assistant", text: data.reply };
        
        await supabase.from("submissions").update({
          chat_history: [assistantMsg],
          status: 'in_progress'
        }).eq("id", submission.id);

        setMessages([{ user: false, text: data.reply }]);
        setSubmission(prev => ({ ...prev, chat_history: [assistantMsg] }));
      } catch (err) {
        console.error("Greeting Error:", err);
        hasGreeted.current = false;
      } finally {
        setLoading(false);
        isGreetingInProgress.current = false;
      }
    };
    triggerGreeting();
  }, [initializing, assignment, submission, charMemory, isLocked.locked, name]);

  // 3. Progress Calculation
  const progressValue = (assignment?.exchanges && submission) 
    ? ((submission?.current_exchange_count || 0) / assignment.exchanges) * 100 
    : 0;

  useEffect(() => {
    if (progressValue >= 100 && !confettiFired.current) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      confettiFired.current = true;
    }
  }, [progressValue]);

  // 4. Send Message Logic
  const sendMessage = async () => {
    if (!input.trim() || loading || !submission || isLocked.locked) return;
    const userText = input;
    const userMsg = { role: "user", text: userText };
    setMessages(prev => [...prev, { user: true, text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const historyWithUser = [...(submission.chat_history || []), userMsg];
      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: historyWithUser,
          context: {
            language: assignment.courses.language,
            level: assignment.courses.level,
            character_id: submission.character_id,
            character_description: charMemory?.character_description || "",
            grammar: assignment.grammar,
            vocabulary: assignment.vocabulary,
            current_exchange_count: submission.current_exchange_count,
            exchanges: assignment.exchanges,
            student_name: name,
            memory: specificMemory ? specificMemory.join(", " ) : null, // Pass the specific traits as context
          }
        }),
      });
      const data = await response.json();
      const assistantMsg = { role: "assistant", text: data.reply };
      const finalHistory = [...historyWithUser, assistantMsg];
      const newCount = (submission.current_exchange_count || 0) + 1;

      await supabase.from("submissions").update({
        chat_history: finalHistory,
        current_exchange_count: newCount,
        status: newCount >= assignment.exchanges ? 'completed' : 'in_progress'
      }).eq("id", submission.id);

      setMessages(prev => [...prev, { user: false, text: data.reply }]);
      setSubmission(prev => ({ ...prev, chat_history: finalHistory, current_exchange_count: newCount }));
    } catch (err) {
      console.error("Send Message Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 5. Finalize Logic
  const handleFinishAssignment = async () => {
  setIsFinalizing(true);
  
  try {
    // 1. Get the feedback from Gemini (This is the "heavy" part)
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "GENERATE_FEEDBACK_SUMMARY",
        history: submission.chat_history, 
        context: {
          level: assignment.courses.level,
          language: assignment.courses.language,
          topic: assignment.topic,
          difficulty: assignment.difficulty,
        }
      }),
    });
  
    const result = await response.json();

    const charId = charMemory?.order?.toString().charAt(0);
    const memoryColumn = `memory_${charId}`;
    
    // 2. CRITICAL UPDATE: Save the feedback so the results page has data
    const { error: subError } = await supabase
      .from("submissions")
      .update({
        pos_feedback: result.strengths,
        neg_feedback: result.improvements,
        status: "completed",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (subError) throw subError;

    // 3. BACKGROUND UPDATE: Don't 'await' this! 
    // This runs in the background while the user moves to the next page.
    supabase
      .from("course_enrollments")
      .update({ [memoryColumn]: result.personality_traits })
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .then(({ error }) => {
        if (error) console.error("Background memory update failed:", error);
      });

    // 4. IMMEDIATE REDIRECT
    router.push(
      `/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/results`
    );

  } catch (err) {
    console.error("Failed to finalize:", err);
    setIsFinalizing(false);
  }
};

  const insertAccent = (char) => {
    setInput(prev => prev + char);
    document.getElementById('chat-input')?.focus();
  };

  if (initializing) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50 relative">
      <header className="flex-none bg-white border-b px-6 py-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft /></Button>
          <div>
            <h2 className="font-bold">{assignment?.title}</h2>
            <p className={`text-xs ${isLocked.locked ? "text-red-500 font-bold" : "text-green-600"}`}>
              {isLocked.locked ? "Assignment Locked" : `Chatting with ${submission?.character_id}`}
            </p>
          </div>
          <div className="flex align-right ml-auto text-sm text-gray-500 font-medium">
            <MessageCircle className="mr-2 flex align-center h-5 w-5" />{submission?.current_exchange_count} / {assignment?.exchanges} Exchanges
          </div>
        </div>
        <div className="w-full bg-gray-100 h-2 mt-3 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(progressValue, 100)}%` }} />
        </div>
      </header>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6"
        onMouseUp={handleTextSelection}
      >
        {isLocked.locked && (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center text-center space-y-4 my-10">
            <div className="bg-red-50 p-4 rounded-full">
              <Lock className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
            <p className="text-gray-500 max-w-sm">{isLocked.reason}</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.user ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-[80%] ${msg.user ? "flex-row-reverse" : "flex-row"}`}>
              <div className="h-9 w-9 rounded-full overflow-hidden border bg-white flex items-center justify-center">
                {msg.user ? <User className="p-2" /> : <img src={avatarPath} className="object-cover h-full w-full" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.user ? "bg-orange-300 text-blue-900" : "bg-white border text-gray-800"}`}>
                <div className="text-[10px] font-bold uppercase mb-1">{msg.user ? (name || "You") : submission?.character_id}</div>
                <ChatMessage text={msg.text} isUser={msg.user} />
              </div>
            </div>
          </div>
        ))}
        
        {loading && !isLocked.locked && (
          <div className="flex justify-start">
             <div className="flex gap-3 max-w-[80%] flex-row">
              <div className="h-9 w-9 rounded-full overflow-hidden border bg-white flex items-center justify-center flex-none">
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
          {isLocked.locked ? (
             <div className="flex items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 font-medium italic">
               The conversation is closed.
             </div>
          ) : submission && progressValue >= 100 ? (
            <Button onClick={handleFinishAssignment} disabled={isFinalizing} className="w-full py-8 bg-green-600 text-white text-xl font-bold rounded-2xl">
              {isFinalizing ? <Loader2 className="animate-spin" /> : <><CheckCircle className="mr-2" /> Finish Assignment</>}
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
              <textarea 
                id="chat-input"
                className="flex-1 bg-gray-100 rounded-2xl py-4 px-5 outline-none"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading || !submission}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} className="h-12 w-12 rounded-xl">
                <Send />
              </Button>
            </div>
          )}
        </div>
      </footer>

      {tooltip.show && (
        <div 
          className="absolute z-[100] bg-black text-white px-3 py-2 rounded-xl text-sm shadow-2xl flex items-center gap-3 -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y }}
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <span className="font-bold border-r border-gray-700 pr-2">{tooltip.word}</span>
          <button 
            onClick={saveToVocab}
            disabled={isSaving}
            className={`${isAdded ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'} px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all duration-200 flex items-center gap-1`}
          >
            {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : isAdded ? (
                <>Added!</>
            ) : (
                <>Add to Vocab</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}