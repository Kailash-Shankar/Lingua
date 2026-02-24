"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeft, 
  ChevronRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  Loader2,
  CheckCircle,
  PencilLine,
  LetterText,
  Trash2,
  Plus,
  Newspaper,
  BarChartBigIcon,
  ClipboardCheck,
  MessageSquare
} from "lucide-react";

export default function CourseDetailPage() {
  const { studentId, courseId } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [allAssignments, setAllAssignments] = useState([]);
  const [studentSkillsOverview, setStudentSkillsOverview] = useState(null);
  const [studentVocabList, setStudentVocabList] = useState([]);
  const [isAddingVocab, setIsAddingVocab] = useState(false);
  const [newVocabWord, setNewVocabWord] = useState("");
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: "", items: [], type: "" });

  const activeTab = searchParams.get("tab") || "assignments";

  const handleTabChange = (value) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).single();
      setCourse(courseData);

      const { data: enrollmentData } = await supabase.from("course_enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .single();
      
      if (enrollmentData?.skill_overview_student) setStudentSkillsOverview(enrollmentData.skill_overview_student);
      setStudentVocabList(enrollmentData?.vocab_list || []);

      const { data: assignmentsData } = await supabase.from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      
      setAssignments(assignmentsData || []);
      setAssignmentCount(assignmentsData?.length || 0);

      const { data: submissionsData } = await supabase.from("submissions")
        .select(`*, assignments!inner (title, topic, difficulty, exchanges)`)
        .eq("student_id", studentId)
        .eq("assignments.course_id", courseId)
        .eq("status", "completed");
      
      setCompletedAssignments(submissionsData || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (courseId && studentId) fetchCourseData(); }, [courseId, studentId]);

  const completed = allAssignments.filter(a => a.statusLabel === 'completed');
  const inProgress = allAssignments.filter(a => a.statusLabel === 'in_progress');
  const overdue = allAssignments.filter(a => a.statusLabel === 'overdue');
  const notStarted = allAssignments.filter(a => a.statusLabel === 'not_started');

  const renderAssignmentRows = (items) => (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id} className="bg-white border-2 border-[#2D2D2D] p-5 rounded-[28px] shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 border-2 border-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D] ${
                item.statusLabel === 'completed' ? 'bg-[#E6F4F1]' : 
                item.statusLabel === 'overdue' ? 'bg-[#FFF5F5]' : 'bg-white'
            }`}>
              {item.statusLabel === 'completed' ? <MessageSquare className="h-6 w-6" /> : <PencilLine className="h-6 w-6 opacity-40" />}
            </div>
            <div>
              <p className="font-black text-lg uppercase tracking-tight">{item.title}</p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase opacity-40">{item.topic || item.difficulty}</p>
                <span className="h-1 w-1 rounded-full bg-[#2D2D2D]/20"></span>
                <p className={`text-[10px] font-black uppercase ${
                    item.statusLabel === 'completed' ? 'text-green-600' : 
                    item.statusLabel === 'overdue' ? 'text-red-500' : 'text-[#2D2D2D]/40'
                }`}>
                  {item.statusLabel.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          <Link href={item.statusLabel === 'completed' 
            ? `/student/${studentId}/chat/${item.id}?submission=${item.submission.id}`
            : `/student/${studentId}/chat/${item.id}`
          }>
            <Button variant="outline" className="border-2 border-[#2D2D2D] rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_#2D2D2D] hover:shadow-none transition-all">
              {item.statusLabel === 'completed' ? 'View Results' : 'Start Task'}
            </Button>
          </Link>
        </Card>
      ))}
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FEFAF2]"><Loader2 className="animate-spin h-10 w-10 text-[#2D2D2D]" /></div>;

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-8 pt-24 text-[#2D2D2D]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation */}
        <Link href={`/student/${studentId}/dashboard`} className="inline-flex items-center gap-2 font-bold text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] uppercase tracking-widest font-black">Back to Dashboard</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-[#2D2D2D] pb-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter [text-shadow:3px_3px_0px_#FFD966] leading-none">
              {course?.title}
            </h1>
            <div className="flex items-center gap-3">
               <span className="px-4 py-1.5 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#2D2D2D]">
                 {course?.language}
               </span>
               <span className="px-4 py-1.5 bg-white border-2 border-[#2D2D2D] rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#2D2D2D]">
                 {course?.level}
               </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-10">
          <TabsList className="bg-gray-200 p-1.5 rounded-2xl h-14 border-2 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D]">
            <TabsTrigger value="assignments" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <Newspaper className="h-4 w-4 mr-2" /> Assignments ({assignmentCount})
            </TabsTrigger>
            <TabsTrigger value="results" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <ClipboardCheck className="h-4 w-4 mr-2" /> Results ({completedAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="vocab" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <LetterText className="h-4 w-4 mr-2" /> Vocab List
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <BarChartBigIcon className="h-4 w-4 mr-2" /> My Progress
            </TabsTrigger>
          </TabsList>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-orange-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                <PencilLine className="h-6 w-6" />
              </div> Assignments
            </h3>
            {assignments.length === 0 ? (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-16 flex flex-col items-center">
                <p className="font-bold opacity-30 italic">No tasks assigned yet.</p>
              </div>
            ) : <AssignmentsList assignments={assignments} />}
          </TabsContent>

          {/* Results Tab - Categorized List */}
          <TabsContent value="results" className="space-y-12">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-green-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                <ClipboardCheck className="h-6 w-6" />
              </div> Past Results
            </h3>
            {completed.length === 0 ? (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-16 flex flex-col items-center">
                <p className="font-bold opacity-30 italic">No completed assignments yet.</p>
              </div>
            ) : renderAssignmentRows(completed)}
          </TabsContent>

          {/* Vocabulary Tab */}
          <TabsContent value="vocab" className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <div className="p-1.5 bg-blue-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
                <LetterText className="h-6 w-6" />
              </div> My Vocab List
            </h3>
            <Card className="border-2 border-[#2D2D2D] rounded-[32px] shadow-[6px_6px_0px_0px_#2D2D2D] p-8 bg-white min-h-[200px]">
              <div className="flex flex-wrap gap-3">
                {studentVocabList.map((word, idx) => (
                  <div key={idx} className="px-5 py-2.5 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-xl text-[#2D2D2D] font-bold shadow-[3px_3px_0px_0px_#2D2D2D] flex items-center gap-2">
                    <span className="text-sm tracking-tight">{word}</span>
                    <button className="ml-1 text-[#2D2D2D]/30 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => setIsAddingVocab(true)} className="flex items-center gap-2 px-5 py-2.5 border-2 border-dashed border-[#2D2D2D]/30 rounded-xl font-bold text-[#2D2D2D]/40 hover:bg-[#F5F5F5] transition-all italic uppercase text-[10px]">
                  <Plus className="h-4 w-4" /> Add Word
                </button>
              </div>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-[#2D2D2D]/10 pb-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <div className="h-12 w-12 bg-purple-300 border-2 border-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D]">
                    <BarChartBigIcon className="h-6 w-6" />
                  </div> Personal Analytics
                </h3>
                <p className="font-bold opacity-40 text-[10px] uppercase tracking-widest">Insights based on your conversations</p>
              </div>
              <Button className="h-14 px-8 bg-[#FFD966] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-2xl font-black shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase tracking-tighter">
                <Zap className="mr-2 h-5 w-5" /> Refresh My Insights
              </Button>
            </div>

            {studentSkillsOverview ? (
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-[#2D2D2D] bg-[#FFFAF0] rounded-[32px] shadow-[6px_6px_0px_0px_#FFD966] overflow-hidden">
                  <div className="p-8 border-b-2 border-[#2D2D2D]/10 font-black text-xl uppercase tracking-tight text-[#92400E] flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> My Strengths
                  </div>
                  <div className="p-8 space-y-3">
                    {studentSkillsOverview.strengths?.map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                    ))}
                  </div>
                </Card>
                <Card className="border-2 border-[#2D2D2D] bg-[#FFF5F5] rounded-[32px] shadow-[6px_6px_0px_0px_#FFADAD] overflow-hidden">
                  <div className="p-8 border-b-2 border-[#2D2D2D]/10 font-black text-xl uppercase tracking-tight text-[#9D174D] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Improvement Areas
                  </div>
                  <div className="p-8 space-y-3">
                    {studentSkillsOverview.weaknesses?.map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-20 flex flex-col items-center">
                 <p className="text-xl font-bold text-[#2D2D2D]/30 italic">No progress data yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}