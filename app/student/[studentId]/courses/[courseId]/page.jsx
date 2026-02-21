"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AssignmentsList } from "@/components/AssignmentsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { 
  MessageSquare, 
  ArrowLeft, 
  ChartColumnIncreasing,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  BarChart3,
  Loader2,
  Clock,
  CheckCircle,
  Scroll,
  ListChecks,
  Pencil,
  PencilLine,
  LetterText,
  ListCheck,
  Trash2,
  Plus
} from "lucide-react";

export default function CourseDetailPage() {
  const { studentId, courseId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [studentSkillsOverview, setStudentSkillsOverview] = useState(null);
  const [studentVocabList, setStudentVocabList] = useState([]);
  const [isAddingVocab, setIsAddingVocab] = useState(false);
  const [newVocabWord, setNewVocabWord] = useState("");
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: "", items: [], type: "" });

  const ACCENT_MAP = {
    Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
    Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
  };

  const currentTab = searchParams.get("tab") || "assignments";
  const hasNoData = completedAssignments.length === 0;

  const handleTabChange = (value) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).single();
      setCourse(courseData);
      const { data: enrollmentData } = await supabase.from("course_enrollments").select("*").eq("course_id", courseId).eq("student_id", studentId).single();
      if (enrollmentData?.skill_overview_student) setStudentSkillsOverview(enrollmentData.skill_overview_student);
      setStudentVocabList(enrollmentData?.vocab_list || []);
      const { data: assignmentsData } = await supabase.from("assignments").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
      setAssignments(assignmentsData || []);
      setAssignmentCount(assignmentsData?.length || 0);
      const { data: submissionsData } = await supabase.from("submissions").select(`*, assignments!inner (title, topic, difficulty, exchanges, courses!assignments_course_id_fkey!inner (id, language))`).eq("student_id", studentId).eq("assignments.course_id", courseId).eq("status", "completed");
      setCompletedAssignments(submissionsData || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddVocab = async () => {
    if (!newVocabWord.trim()) return;
    const updatedList = [...studentVocabList, newVocabWord.trim()];
    const { error } = await supabase.from("course_enrollments").update({ vocab_list: updatedList }).eq("course_id", courseId).eq("student_id", studentId);
    if (!error) { setStudentVocabList(updatedList); setNewVocabWord(""); setIsAddingVocab(false); }
  };

  const handleDeleteVocab = async (wordToDelete) => {
    const updatedList = studentVocabList.filter(word => word !== wordToDelete);
    const { error } = await supabase.from("course_enrollments").update({ vocab_list: updatedList }).eq("course_id", courseId).eq("student_id", studentId);
    if (!error) setStudentVocabList(updatedList);
  };

  const handleGenerateSkills = async () => {
    if (hasNoData) return;
    setIsGeneratingAi(true);
    try {
      const feedbackData = completedAssignments.map(s => ({ pos: s.pos_feedback, neg: s.neg_feedback }));
      const response = await fetch("/api/assignment-overview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback: feedbackData }) });
      const data = await response.json();
      const newOverview = { strengths: data.strengths, weaknesses: data.weaknesses, generated_at: new Date().toISOString() };
      await supabase.from("course_enrollments").update({ skill_overview_student: newOverview }).eq("course_id", courseId).eq("student_id", studentId);
      setStudentSkillsOverview(newOverview);
    } catch (err) { console.error(err); } finally { setIsGeneratingAi(false); }
  };

  useEffect(() => { if (courseId && studentId) fetchCourseData(); }, [courseId, studentId]);

  const openFeedback = (e, type, rawData, title) => {
    e.preventDefault(); e.stopPropagation();
    let cleanedItems = [];
    try {
      if (Array.isArray(rawData)) cleanedItems = rawData;
      else if (typeof rawData === 'string') {
        cleanedItems = rawData.split(/[•\n\r]+|(?<=\.)\s+/).map(item => item.trim()).filter(item => item.length > 3);
      }
    } catch (err) { cleanedItems = [rawData?.toString()]; }
    setFeedbackModal({ isOpen: true, title, type, items: cleanedItems });
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FEFAF2]">
      <Loader2 className="h-8 w-8 animate-spin text-[#2D2D2D]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-6 pt-20 text-[#2D2D2D]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ── Dialog ── */}
        <Dialog open={feedbackModal.isOpen} onOpenChange={(open) => setFeedbackModal(prev => ({ ...prev, isOpen: open }))}>
          <DialogContent className="sm:max-w-md bg-white border-2 border-[#2D2D2D] rounded-[24px] shadow-[6px_6px_0px_0px_#2D2D2D] p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                {feedbackModal.type === 'strengths' ? <Sparkles className="text-[#FFD966]" /> : <TrendingUp className="text-[#FFADAD]" />}
                {feedbackModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
              {feedbackModal.items.length > 0 ? feedbackModal.items.map((item, idx) => (
                <div key={idx} className="bg-[#F5F5F5] border-2 border-[#2D2D2D] p-3 rounded-xl shadow-[2px_2px_0px_0px_#2D2D2D] font-bold text-sm">
                  {item}
                </div>
              )) : <p className="text-center font-bold opacity-30 italic py-6">No feedback recorded.</p>}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Compact Header ── */}
        <div className="space-y-4">
          <Link href={`/student/${studentId}/dashboard`} className="inline-flex items-center gap-1.5 font-bold text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors group">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-md uppercase tracking-widest font-black">Back to Dashboard</span>
          </Link>

          <div className="border-b-2 border-[#2D2D2D] pb-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter [text-shadow:2px_2px_0px_#FFD966] leading-none mb-4">
              {course?.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-full text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#2D2D2D]">
                {course?.language}
              </span>
              <span className="px-3 py-1 bg-white border-2 border-[#2D2D2D] rounded-full text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#2D2D2D]">
                {course?.level}
              </span>
            </div>
          </div>
        </div>

        {/* ── Compact Tabs ── */}
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="bg-gray-200/90 p-1 rounded-xl h-12 border-2 border-[#2D2D2D] shadow-[3px_3px_0px_0px_#2D2D2D] mb-8">
            <TabsTrigger value="assignments" className="rounded-lg font-bold uppercase text-[10px] tracking-widest h-full px-4 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              Assignments ({assignmentCount})
            </TabsTrigger>
            <TabsTrigger value="vocab" className="rounded-lg font-bold uppercase text-[10px] tracking-widest h-full px-4 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              Vocab List
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-lg font-bold uppercase text-[10px] tracking-widest h-full px-4 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              My Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                <span className="bg-[#FF914D] border-2 border-[#2D2D2D] p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                  <PencilLine className="h-5 w-5" />
                </span>
                Course Assignments
              </h3>
              {assignments.length === 0 ? (
                <div className="border-2 border-dashed border-[#2D2D2D]/10 bg-white/50 py-12 rounded-[24px] flex flex-col items-center gap-2">
                  <p className="font-bold opacity-30 italic text-sm">No assignments available yet.</p>
                </div>
              ) : <AssignmentsList assignments={assignments} />}
            </div>
          </TabsContent>

          <TabsContent value="vocab">
            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                <span className="bg-[#74C0FC] border-2 border-[#2D2D2D] p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                  <LetterText className="h-5 w-5" />
                </span>
                My Vocabulary List
              </h3>
              <Card className="border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#2D2D2D] p-6 bg-white min-h-[200px]">
                <div className="flex flex-wrap gap-3">
                  {studentVocabList.map((word, idx) => (
                    <div key={idx} className="group px-4 py-2 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-xl text-[#2D2D2D] font-bold shadow-[2px_2px_0px_0px_#2D2D2D] flex items-center gap-2 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
                      <div className="h-1.5 w-1.5 bg-[#74C0FC] rounded-full border border-[#2D2D2D]" />
                      <span className="text-sm">{word}</span>
                      <button onClick={() => handleDeleteVocab(word)} className="ml-1 text-[#2D2D2D]/30 hover:text-[#FFADAD] transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {!isAddingVocab ? (
                    <button onClick={() => setIsAddingVocab(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#2D2D2D]/30 rounded-xl font-bold text-[#2D2D2D]/40 hover:bg-[#F5F5F5] hover:border-[#2D2D2D] transition-all italic uppercase text-[10px]">
                      <Plus className="h-3.5 w-3.5" /> Add Word
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-[#2D2D2D] rounded-xl shadow-[3px_3px_0px_0px_#74C0FC]">
                        <input autoFocus type="text" value={newVocabWord} onChange={e => setNewVocabWord(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddVocab(); if (e.key === 'Escape') { setIsAddingVocab(false); setNewVocabWord(''); }}} placeholder="Type..." className="bg-transparent outline-none font-bold text-sm text-[#2D2D2D]" />
                        <button onClick={handleAddVocab} className="text-[#2D2D2D]"><Plus className="h-4 w-4" /></button>
                        <button onClick={() => { setIsAddingVocab(false); setNewVocabWord(''); }} className="text-[#2D2D2D]/30"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="flex flex-wrap gap-1 p-1.5 bg-white border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                        {(ACCENT_MAP[course?.language] || ACCENT_MAP.Default).map(char => (
                          <button key={char} onClick={() => setNewVocabWord(prev => prev + char)} className="w-7 h-7 flex items-center justify-center font-bold text-xs rounded border border-[#2D2D2D]/10 hover:bg-[#74C0FC]">{char}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-[#2D2D2D]/10 pb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase flex items-center gap-2 mb-2">
                    <span className="bg-[#FFADAD] border-2 border-[#2D2D2D] p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                      <Scroll className="h-5 w-5" />
                    </span>
                    Skill Overview
                  </h3>
                  <p className="font-bold opacity-40 text-[10px] uppercase tracking-widest mt-1">Growth insights from your work</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {studentSkillsOverview?.generated_at && (
                    <span className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1"><Clock size={10} /> {new Date(studentSkillsOverview.generated_at).toLocaleDateString()}</span>
                  )}
                  <Button onClick={handleGenerateSkills} disabled={isGeneratingAi || hasNoData} className="h-10 px-6 bg-[#FFD966] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl font-black shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 uppercase text-[10px] tracking-widest">
                    {isGeneratingAi ? <Loader2 className="animate-spin mr-1.5 h-3.5 w-3.5" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                    {hasNoData ? "No Data" : "Update Insights"}
                  </Button>
                </div>
              </div>

              {studentSkillsOverview ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-2 border-[#2D2D2D] bg-[#FFFAF0] rounded-[24px] shadow-[4px_4px_0px_0px_#FFD966] overflow-hidden">
                    <div className="p-5 border-b-2 border-[#2D2D2D]/10 font-black text-sm uppercase flex items-center gap-2"><Sparkles className="text-[#FFD966]" size={16} /> Core Strengths</div>
                    <div className="p-5 space-y-2">
                      {studentSkillsOverview.strengths?.map((item, idx) => (
                        <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-3 rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                      ))}
                    </div>
                  </Card>
                  <Card className="border-2 border-[#2D2D2D] bg-[#FFF5F5] rounded-[24px] shadow-[4px_4px_0px_0px_#FFADAD] overflow-hidden">
                    <div className="p-5 border-b-2 border-[#2D2D2D]/10 font-black text-sm uppercase flex items-center gap-2"><TrendingUp className="text-[#FFADAD]" size={16} /> Growth Areas</div>
                    <div className="p-5 space-y-2">
                      {studentSkillsOverview.weaknesses?.map((item, idx) => (
                        <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-3 rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : <div className="border-2 border-dashed border-[#2D2D2D]/10 py-16 text-center bg-white/50 rounded-[24px] italic font-black text-[#2D2D2D]/30 uppercase tracking-widest text-xs">No Skills Overview Yet</div>}

              <div className="space-y-6 pt-4">
                <h3 className="text-xl font-black uppercase flex items-center gap-2"><CheckCircle className="h-5 w-5 text-[#B2F2BB]" /> Completed Assignments</h3>
                <div className="grid gap-4">
                  {completedAssignments.map(sub => (
                    <Card key={sub.id} className="bg-white border-2 border-[#2D2D2D] rounded-[20px] shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all p-5">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-10 w-10 bg-[#B2F2BB] border-2 border-[#2D2D2D] rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D]"><CheckCircle2 className="h-5 w-5" /></div>
                          <div>
                            <h4 className="font-black text-base uppercase tracking-tight leading-none mb-1.5">{sub.assignments.title}</h4>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="px-1.5 py-0.5 bg-[#F5F5F5] border-2 border-[#2D2D2D] rounded-md text-[8px] font-black uppercase tracking-widest">{sub.assignments.difficulty}</span>
                              <span className="px-1.5 py-0.5 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-md text-[8px] font-black uppercase tracking-widest">{sub.assignments.exchanges} Exchanges</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={e => openFeedback(e, 'strengths', sub.pos_feedback, "Mission Strengths")} className="px-3 py-1.5 bg-[#FFFAF0] border-2 border-[#2D2D2D] rounded-lg font-bold text-[9px] uppercase shadow-[2px_2px_0px_0px_#FFD966] hover:translate-y-0.5 hover:shadow-none transition-all">Strengths</button>
                          <button onClick={e => openFeedback(e, 'improvements', sub.neg_feedback, "Growth Points")} className="px-3 py-1.5 bg-[#FFF5F5] border-2 border-[#2D2D2D] rounded-lg font-bold text-[9px] uppercase shadow-[2px_2px_0px_0px_#FFADAD] hover:translate-y-0.5 hover:shadow-none transition-all">Growth</button>
                          <Link href={`/student/${studentId}/dashboard`} className="p-1.5 text-[#2D2D2D]/30 hover:text-[#74C0FC] transition-colors"><ChevronRight className="h-5 w-5" /></Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}