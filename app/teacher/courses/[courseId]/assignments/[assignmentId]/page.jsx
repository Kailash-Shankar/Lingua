"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  MessageSquare, 
  BookOpen,   
  Loader2, 
  Brain,
  Scroll,
  ChevronRight,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  Clock, 
  BarChart,
  ArrowRight,
  FlaskConical,
  Zap,
  UserCircle,
  AlertCircle,
  Hash,
  BarChart4Icon
} from "lucide-react";

const AVATARS = ["/f2.png", "/m2.png", "/m1.jpg", "/f1.png"];

export default function AssignmentDetailPage() {
  const { assignmentId, courseId } = useParams();
  const router = useRouter();
  
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiOverview, setAiOverview] = useState(null);
  
  const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ 
    isOpen: false, title: "", items: [], type: "" 
  });

  const fetchData = useCallback(async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      
      const { data: assignmentData, error: assignError } = await supabase
        .from("assignments")
        .select("*, courses!assignments_course_id_fkey ( language, level )")
        .eq("id", assignmentId)
        .single();

      if (assignError) throw assignError;
      setAssignment(assignmentData);
      
      if (assignmentData?.assignment_overview) {
        setAiOverview(assignmentData.assignment_overview);
      }

      const { data: charData } = await supabase
        .from("characters")
        .select("*")
        .eq("language", assignmentData.courses.language);
      setCharacters(charData || []);

      const { data: enrollmentData } = await supabase
        .from("course_enrollments")
        .select("id, First_Name, Last_Name, student_id, Student_id")
        .eq("course_id", assignmentData.course_id);

      const { data: submissionData } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignmentId);

      const now = new Date();
      const dueDate = assignmentData.due_at ? new Date(assignmentData.due_at) : null;

      const formattedResults = (enrollmentData || []).map(student => {
        const sub = submissionData?.find(s => s.student_id === student.student_id);
        let statusLabel = "not started";
        
        if (sub?.status === 'completed') statusLabel = "completed";
        else if (sub?.status === 'in_progress') statusLabel = "in_progress";
        else if (dueDate && now > dueDate) statusLabel = "overdue";

        return { ...student, submission: sub || null, statusLabel };
      });

      setSubmissions(formattedResults);
    } catch (err) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatGeneratedDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString([], { 
      dateStyle: 'short', 
      timeStyle: 'short'  
    });
  };

  const openFeedback = (e, type, rawData, title) => {
    e.preventDefault();
    let cleanedItems = [];
    try {
      if (typeof rawData === 'string' && rawData.startsWith('[')) {
        cleanedItems = JSON.parse(rawData);
      } else {
        cleanedItems = rawData?.split(/[•\n\r]+/).filter(i => i.trim().length > 2) || [];
      }
    } catch { cleanedItems = [rawData]; }
    setFeedbackModal({ isOpen: true, title, type, items: cleanedItems });
  };

  const handleGenerateSkillOverview = async () => {
    setIsGeneratingAi(true);
    try {
      const feedbackToAnalyze = submissions
        .filter(s => s.submission?.status === 'completed')
        .map(s => ({
          pos: s.submission.pos_feedback,
          neg: s.submission.neg_feedback
        }));

      if (feedbackToAnalyze.length === 0) return;

      const response = await fetch("/api/assignment-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackToAnalyze })
      });

      const data = await response.json();
      const newOverview = {
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        generated_at: new Date().toISOString()
      };

      await supabase.from("assignments").update({ assignment_overview: newOverview }).eq("id", assignmentId);
      setAiOverview(newOverview);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const renderStudentRows = (studentList) => (
    <div className="grid gap-6">
      {studentList.map((item) => (
        <Card key={item.id} className={`bg-white border-2 border-[#2D2D2D] rounded-[28px] shadow-[4px_4px_0px_0px_#2D2D2D] transition-all p-6 ${
          item.statusLabel !== 'completed' && 'opacity-70 grayscale-[0.5]'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5 flex-1">
              <div className={`h-12 w-12 border-2 border-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D] ${
                item.statusLabel === 'completed' ? 'bg-[#B2F2BB]' :
                item.statusLabel === 'overdue' ? 'bg-[#FFADAD]' :
                'bg-[#F5F5F5]'
              }`}>
                {item.statusLabel === 'completed' ? <CheckCircle2 className="h-6 w-6"/> : 
                 item.statusLabel === 'overdue' ? <AlertCircle className="h-6 w-6"/> :
                 <Circle className="h-6 w-6 opacity-20"/>}
              </div>
              
              <div className="space-y-1">
                <Link href={`/teacher/courses/${courseId}/students/${item.student_id}`} className="hover:underline">
                    <h4 className="font-black text-xl uppercase tracking-tighter leading-tight">
                    {item.First_Name} {item.Last_Name}
                    </h4>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase opacity-40 tracking-widest flex items-center gap-1">
                    <Hash className="h-3 w-3"/>{item.Student_id}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-[#2D2D2D] ${
                    item.statusLabel === 'completed' ? 'bg-[#B2F2BB]' : 'bg-gray-100'
                  }`}>
                    {item.statusLabel.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {item.submission && item.statusLabel === "completed" && (
              <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                <button 
                  onClick={(e) => openFeedback(e, 'strengths', item.submission.pos_feedback, "Student Strengths")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFFBEB] border-2 border-[#2D2D2D] rounded-xl font-bold text-xs uppercase shadow-[3px_3px_0px_0px_#FFD966] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  <Zap className="h-4 w-4 text-yellow-700 mr-1"/> Strengths
                </button>

                <button 
                  onClick={(e) => openFeedback(e, 'improvements', item.submission.neg_feedback, "Areas to Grow")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFF5F5] border-2 border-[#2D2D2D] rounded-xl font-bold text-xs uppercase shadow-[3px_3px_0px_0px_#FFADAD] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  <TrendingUp className="h-4 w-4 text-red-700 mr-1"/> Weaknesses
                </button>

                <Link href={`/teacher/courses/${courseId}/students/${item.student_id}/results/${assignmentId}`} className="ml-auto lg:ml-0">
                  <Button variant="outline" className="h-12 bg-white text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_0px_#74C0FC] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    Full Report <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FEFAF2]"><Loader2 className="animate-spin text-[#2D2D2D] h-10 w-10" /></div>;

  const completed = submissions.filter(s => s.statusLabel === 'completed');
  const inProgress = submissions.filter(s => s.statusLabel === 'in_progress');
  const notStarted = submissions.filter(s => s.statusLabel === 'not started');
  const overdue = submissions.filter(s => s.statusLabel === 'overdue');
  const hasNoSubmissions = completed.length === 0;

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-8 pt-24 text-[#2D2D2D]">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Navigation & Header */}
        <div className="space-y-4 border-b-4 border-[#2D2D2D] pb-8">
          <Link href={`/teacher/courses/${courseId}`} className="inline-flex items-center gap-2 font-bold text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] uppercase tracking-widest font-black">Back to Course</span>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-row items-center gap-4">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter [text-shadow:3px_3px_0px_#FFD966]">
                    {assignment?.title}
                </h1>
                <div className="flex flex-col gap-4 shrink-0">
                    <Badge className={`border-2 border-[#2D2D2D] rounded-full px-3 py-1 font-black uppercase w-full tracking-widest shadow-[2px_2px_0px_0px_#2D2D2D] ${
                        assignment?.difficulty === "Challenging" ? "bg-red-400" : "bg-gray-400"
                    }`}>
                        {assignment?.difficulty}
                    </Badge>
                    <div className="flex items-center gap-3 bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl shadow-[4px_4px_0px_0px_#74C0FC]">
                        <MessageSquare className="h-5 w-5 text-[#74C0FC]" />
                        <span className="font-black text-2xl">{assignment?.exchanges}</span>
                        <span className="text-md font-black uppercase tracking-widest opacity-60">Messages</span>
                    </div>
                </div>
              </div>
              <p className="text-lg font-bold opacity-60 uppercase tracking-widest">{assignment?.topic}</p>
            </div>
          </div>
        </div>

        {/* Assignment Info Blocks */}
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Card className="bg-white border-2 border-[#2D2D2D] rounded-[32px] shadow-[6px_6px_0px_0px_#2D2D2D]">
              <CardHeader>
                <CardTitle className="text-md font-bold uppercase tracking-widest opacity-50">Scenario Description</CardTitle>
              </CardHeader>
              <CardContent className="px-8">
                <p className="text-lg font-bold leading-relaxed whitespace-pre-wrap">{assignment?.scenario}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#2D2D2D]">
                <CardHeader className="flex flex-row items-center gap-3 p-6 pb-2">
                  <BookOpen className="h-5 w-5 text-[#2D2D2D]" />
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Vocabulary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm font-bold opacity-70">{assignment?.vocabulary || "None listed."}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#FFFBEB] border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#FFD966]">
                <CardHeader className="flex flex-row items-center gap-3 p-6 pb-2">
                  <Brain className="h-5 w-5 text-[#2D2D2D]" />
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Grammar</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm font-bold opacity-70">{assignment?.grammar || "None listed."}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-2 border-[#2D2D2D] rounded-[28px] shadow-[6px_6px_0px_0px_#2D2D2D]">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 mb-1">Opens</p>
                  <p className="text-sm font-black">{new Date(assignment?.start_at).toLocaleString([], { dateStyle: "short", timeStyle: "short"})}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[#FFADAD] mb-1">Due Date</p>
                  <p className="text-sm font-black text-[#FFADAD]">
                    {assignment?.due_at ? new Date(assignment.due_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "No deadline"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setIsCharPickerOpen(true)}
              className="w-full h-16 bg-[#74C0FC] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-2xl font-black shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase tracking-tighter"
            >
              <MessageSquare className="h-6 w-6 mr-2" /> Demo Assignment <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="pt-12 border-t-4 border-[#2D2D2D] space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <BarChart4Icon className="h-7 w-7 text-cyan-500" /> Assignment Overview
              </h2>
              <p className="font-bold opacity-40 text-[10px] uppercase tracking-widest">Collective performance analysis</p>
            </div>

            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              {aiOverview?.generated_at && (
                <span className="text-sm font-black uppercase opacity-70 flex items-center gap-1.5">
                  <Clock size={14} /> Last updated: {formatGeneratedDate(aiOverview.generated_at)}
                </span>
              )}
              <Button 
                onClick={handleGenerateSkillOverview}
                disabled={isGeneratingAi || hasNoSubmissions}
                className={`h-14 px-8 border-2 font-black uppercase rounded-2xl transition-all tracking-tighter w-full md:w-auto ${
                  hasNoSubmissions 
                    ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed" 
                    : "bg-[#FFD966] text-[#2D2D2D] border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                }`}
              >
                {isGeneratingAi ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                {hasNoSubmissions ? "Insufficient Data" : (aiOverview ? "Refresh Insights" : "Generate Insights")}
              </Button>
            </div>
          </div>

          {aiOverview ? (
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-2 border-[#2D2D2D] bg-[#FFFAF0] rounded-[32px] shadow-[6px_6px_0px_0px_#FFD966] overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="font-black text-xl uppercase text-[#92400E] mb-6 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> Global Strengths
                  </h3>
                  <div className="space-y-3">
                    {aiOverview.strengths?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">
                        • {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#2D2D2D] bg-[#FFF5F5] rounded-[32px] shadow-[6px_6px_0px_0px_#FFADAD] overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="font-black text-xl uppercase text-[#9D174D] mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Focus Areas
                  </h3>
                  <div className="space-y-3">
                    {aiOverview.weaknesses?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">
                        • {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-20 flex flex-col items-center justify-center text-center">
              <BarChart className="h-12 w-12 text-[#2D2D2D]/10 mb-6" />
              <p className="text-xl font-bold text-[#2D2D2D]/30 italic max-w-sm">No analysis generated yet.</p>
            </div>
          )}
        </div>

        {/* Categorized Student Lists */}
        <div className="space-y-12 pt-8">
          {completed.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-[#2D2D2D]">
                <CheckCircle2 className="h-6 w-6 text-[#B2F2BB]" /> Completed Submissions
              </h3>
              {renderStudentRows(completed)}
            </div>
          )}

          {overdue.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" /> Overdue
              </h3>
              {renderStudentRows(overdue)}
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-[#2D2D2D]">
                <Loader2 className="h-6 w-6 text-[#74C0FC]" /> Currently In Progress
              </h3>
              {renderStudentRows(inProgress)}
            </div>
          )}

          {notStarted.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-[#2D2D2D]">
                <Circle className="h-6 w-6 text-gray-300" /> Not Started
              </h3>
              {renderStudentRows(notStarted)}
            </div>
          )}
        </div>

        {/* Feedback Detail Dialog */}
        <Dialog open={feedbackModal.isOpen} onOpenChange={(v) => setFeedbackModal({...feedbackModal, isOpen: v})}>
          <DialogContent className="bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D] p-8 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">{feedbackModal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto mt-4">
              {feedbackModal.items.map((item, idx) => (
                <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl shadow-[3px_3px_0px_0px_#2D2D2D] font-bold text-sm leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Character Picker Dialog */}
        <Dialog open={isCharPickerOpen} onOpenChange={setIsCharPickerOpen}>
          <DialogContent className="sm:max-w-2xl bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                <FlaskConical className="text-[#74C0FC]" /> Demo Character
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
              {characters.map((char, idx) => (
                <Card 
                  key={char.id} 
                  className="group bg-white border-2 border-[#2D2D2D] rounded-[24px] shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer overflow-hidden"
                  onClick={() => {
                    const assignedAvatar = AVATARS[idx % AVATARS.length];
                    const params = new URLSearchParams();
                    params.set("char", char.character_id);
                    params.set("v", assignedAvatar);
                    router.push(`/teacher/courses/${courseId}/assignments/${assignmentId}/chat-demo?${params.toString()}`);
                  }}
                >
                  <CardContent className="p-5 flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#2D2D2D] flex-shrink-0 bg-white shadow-[2px_2px_0px_0px_#2D2D2D]">
                      <img src={AVATARS[idx % AVATARS.length]} alt={char.character_id} className="object-cover h-full w-full" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xl uppercase tracking-tighter leading-tight">{char.character_id}</h4>
                      <p className="text-sm font-bold opacity-50 mt-1 line-clamp-4">{char.public_char_desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}