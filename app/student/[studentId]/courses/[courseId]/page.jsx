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
  
  // AI Skills State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [studentSkillsOverview, setStudentSkillsOverview] = useState(null);

  const [studentVocabList, setStudentVocabList] = useState([]);
  const [isAddingVocab, setIsAddingVocab] = useState(false);
  const [newVocabWord, setNewVocabWord] = useState("");

  const [feedbackModal, setFeedbackModal] = useState({ 
    isOpen: false, 
    title: "", 
    items: [], 
    type: "" 
  });

  const ACCENT_MAP = {
  Spanish: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
  French: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'û', 'ù'],
  German: ['ä', 'ö', 'ü', 'ß'],
  Italian: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'],
  Default: ['á', 'é', 'í', 'ó', 'ú', 'ñ']
};

  // URL Tab Management
  const currentTab = searchParams.get("tab") || "assignments";

  // Logic Guard
  const hasNoData = completedAssignments.length === 0;

  const handleTabChange = (value) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: enrollmentData } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("student_id", studentId)
        .single();
      
      if (enrollmentData?.skill_overview_student) {
        setStudentSkillsOverview(enrollmentData.skill_overview_student);
      }

      setStudentVocabList(enrollmentData?.vocab_list || []);

      const { data: assignmentsData, error: aError } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (!aError) {
        setAssignments(assignmentsData || []);
        setAssignmentCount(assignmentsData?.length || 0);
      }

      const { data: submissionsData, error: sError } = await supabase
        .from("submissions")
        .select(`
          *,
          assignments!inner (
            title, 
            topic, 
            difficulty, 
            exchanges, 
            courses!assignments_course_id_fkey!inner (
              id, 
              language
            )
          )
        `)
        .eq("student_id", studentId)
        .eq("assignments.course_id", courseId)
        .eq("status", "completed");

      if (!sError) {
        setCompletedAssignments(submissionsData || []);
      }

    } catch (err) {
      console.error("Error fetching course data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVocab = async () => {
    if (!newVocabWord.trim()) return;
    const updatedList = [...studentVocabList, newVocabWord.trim()];
    
    const { error } = await supabase
      .from("course_enrollments")
      .update({ vocab_list: updatedList })
      .eq("course_id", courseId)
      .eq("student_id", studentId);

    if (!error) {
      setStudentVocabList(updatedList);
      setNewVocabWord("");
      setIsAddingVocab(false);
    }
  };

  const handleDeleteVocab = async (wordToDelete) => {
    const updatedList = studentVocabList.filter(word => word !== wordToDelete);
    
    const { error } = await supabase
      .from("course_enrollments")
      .update({ vocab_list: updatedList })
      .eq("course_id", courseId)
      .eq("student_id", studentId);

    if (!error) {
      setStudentVocabList(updatedList);
    }
  };

  const handleGenerateSkills = async () => {
    if (hasNoData) return;
    setIsGeneratingAi(true);
    try {
      const feedbackData = completedAssignments.map(s => ({
        pos: s.pos_feedback,
        neg: s.neg_feedback
      }));

      const response = await fetch("/api/assignment-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackData })
      });

      const data = await response.json();
      
      const newOverview = {
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        generated_at: new Date().toISOString()
      };

      await supabase
        .from("course_enrollments")
        .update({ skill_overview_student: newOverview })
        .eq("course_id", courseId)
        .eq("student_id", studentId);

      setStudentSkillsOverview(newOverview);
    } catch (err) {
      console.error("Error generating skills:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (courseId && studentId) fetchCourseData();
  }, [courseId, studentId]);

  const openFeedback = (e, type, rawData, title) => {
    e.preventDefault();
    e.stopPropagation();

    let cleanedItems = [];
    try {
      if (!rawData) {
        cleanedItems = [];
      } else if (Array.isArray(rawData)) {
        cleanedItems = rawData;
      } else if (typeof rawData === 'string') {
        if (rawData.trim().startsWith('[')) {
          cleanedItems = JSON.parse(rawData);
        } else {
          cleanedItems = rawData
            .split(/[•\n\r]+|(?<=\.)\s+/) 
            .map(item => item.trim().replace(/^"|"$/g, ''))
            .filter(item => item.length > 3);
        }
      }
    } catch (err) {
      cleanedItems = [rawData.toString()];
    }

    setFeedbackModal({
      isOpen: true,
      title: title,
      type: type,
      items: cleanedItems
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center animate-pulse text-gray-500">Loading course details...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Dialog open={feedbackModal.isOpen} onOpenChange={(open) => setFeedbackModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              {feedbackModal.type === 'strengths' ? <Sparkles className="text-yellow-600" /> : <TrendingUp className="text-pink-600" />}
              {feedbackModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {feedbackModal.items.length > 0 ? (
              <ul className="space-y-3">
                {feedbackModal.items.map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${feedbackModal.type === 'strengths' ? 'bg-yellow-500' : 'bg-pink-500'}`} />
                    <p className="text-gray-700 leading-relaxed font-medium">{item}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-center">No feedback recorded.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Link href={`/student/${studentId}/dashboard`} className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors mb-6 w-fit group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Dashboard</span>
      </Link>

      <div className="mb-8 border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight">{course?.title}</h1>
        <p className="text-gray-500 mt-2 text-lg">{course?.language} • {course?.level}</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="assignments" className="flex gap-2">
            <MessageSquare className="h-4 w-4" /> Assignments ({assignmentCount})
          </TabsTrigger>
           <TabsTrigger value="vocab" className="flex gap-2">
            <ListChecks className="h-4 w-4" /> Vocab List
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex gap-2">
            <ChartColumnIncreasing className="h-4 w-4" /> My Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
                    <PencilLine className="h-6 w-6 text-orange-600" /> 
                    Course Assignments
                  </h3>
            {assignments.length === 0 ? (
              <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 italic">No assignments available yet.</p>
              </Card>
            ) : (
              <AssignmentsList assignments={assignments} />
            )}
          </div>
        </TabsContent>
<TabsContent value="vocab">
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <LetterText className="h-6 w-6 text-blue-600" /> 
        My Vocabulary List
      </h3>
    </div>
    
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 bg-white min-h-[200px]">
     <div className="flex flex-wrap gap-3">
  {studentVocabList.map((word, idx) => (
    <div 
      key={idx} 
      className="group px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-bold text-sm flex items-center gap-2 hover:border-blue-400 transition-all"
    >
      <div className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
      {word}
      <button 
        onClick={() => handleDeleteVocab(word)}
        className="ml-1 text-blue-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  ))}

  {!isAddingVocab ? (
    <button 
      onClick={() => setIsAddingVocab(true)}
      className="flex items-center justify-center gap-2 px-4 py-2 h-10 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-all italic"
    >
      <Pencil className="h-4 w-4" />
      Add new word...
    </button>
  ) : (
    <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
      <div className="flex items-center gap-2 px-3 py-2 h-10 bg-gray-50 border-2 border-blue-400 rounded-xl shadow-[2px_2px_0px_0px_rgba(59,130,246,1)]">
        <input 
          autoFocus
          type="text"
          value={newVocabWord}
          onChange={(e) => setNewVocabWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddVocab();
            if (e.key === 'Escape') { setIsAddingVocab(false); setNewVocabWord(""); }
          }}
          placeholder="Type..."
          className="bg-transparent outline-none text-sm font-bold w-32 text-blue-700 placeholder:text-blue-300"
        />
        <button onClick={handleAddVocab} className="text-blue-600 hover:scale-110 transition-transform">
          <Plus className="h-4 w-4" />
        </button>
        <button 
          onClick={() => { setIsAddingVocab(false); setNewVocabWord(""); }} 
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Dynamic Accent Character Helper Bar */}
      <div className="flex flex-wrap gap-1 max-w-[180px] bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
        {(ACCENT_MAP[course?.language] || ACCENT_MAP.Default).map((char) => (
          <button
            key={char}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setNewVocabWord(prev => prev + char);
            }}
            className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded bg-gray-50 hover:bg-blue-100 hover:text-blue-600 border border-gray-100 transition-colors"
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  )}


        {studentVocabList.length === 0 && !isAddingVocab && (
          <div className="flex flex-col items-center justify-center py-12 w-full text-center">
            <ListCheck className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 italic">No words saved yet.</p>
          </div>
        )}
      </div>
    </Card>
  </div>
</TabsContent>

        <TabsContent value="progress">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Scroll className="h-6 w-6 text-purple-600" /> 
                    Skill Overview
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">Insights generated from your completed work</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {studentSkillsOverview?.generated_at && (
                    <span className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                      <Clock size={14} /> Last generated: {new Date(studentSkillsOverview.generated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
  
                  <Button 
                    onClick={handleGenerateSkills} 
                    disabled={isGeneratingAi || hasNoData}
                    className={`
                      h-15 w-80 text-md border-2 transition-all
                      ${hasNoData 
                        ? "!bg-gray-200 !text-gray-400 !border-gray-300 !shadow-none !cursor-not-allowed !pointer-events-none opacity-100" 
                        : "bg-purple-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none"
                      }
                    `}
                  >
                    {isGeneratingAi ? <Loader2 className="animate-spin mr-2" size={16}/> : <Zap className="mr-2" size={16}/>}
                    {hasNoData ? "No Completion Data" : (studentSkillsOverview ? "Regenerate Skills Overview" : "Generate Skills Overview")}
                  </Button>
                </div>
              </div>

              {studentSkillsOverview ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-2 border-black bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-yellow-700 mb-4 flex items-center gap-2">
                        <Sparkles size={18}/> Your Core Strengths
                      </h3>
                      <div className="space-y-2">
                        {studentSkillsOverview.strengths?.map((item, idx) => (
                          <div key={idx} className="bg-white/50 border border-yellow-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-black bg-pink-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-pink-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={18}/> Growth Opportunities
                      </h3>
                      <div className="space-y-2">
                        {studentSkillsOverview.weaknesses?.map((item, idx) => (
                          <div key={idx} className="bg-white/50 border border-pink-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center bg-gray-50/50">
                  <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold text-lg">No Skills Overview Yet</p>
                  <p className="text-sm text-gray-400 max-w-sm mt-2 px-6">
                    {hasNoData 
                      ? "You haven't completed any assignments in this course. Finish your first chat to unlock personalized skill insights!" 
                      : "You've finished work! Click the 'Generate' button above to see your strengths and growth areas."}
                  </p>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2"> 
                <CheckCircle className="h-6 w-6 text-cyan-600" /> Completed Assignments
              </h3>
              
              <div className="grid gap-4">
                {completedAssignments.map((sub) => (
                  <Card key={sub.id} className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-bold text-lg leading-none">{sub.assignments.title}</h4>
                            <div className="flex gap-2 items-center">
                              <div className={`flex items-center gap-1 px-2 py-0.5 ${sub.assignments.difficulty === "Challenge" ? "bg-red-100 border border-red-200 rounded text-[10px] font-bold uppercase tracking-wider text-red-600" : "bg-gray-100 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider text-gray-600"}`}>
                                <Zap className="h-3 w-3" />
                                {sub.assignments.difficulty}
                              </div>
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                <MessageSquare className="h-3 w-3" />
                                {sub.assignments.exchanges} Exchanges
                              </div>
                              <span className="text-sm text-gray-500 ml-1">
                                Completed on {new Date(sub.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <button 
                            onClick={(e) => openFeedback(e, 'strengths', sub.pos_feedback, "Your Strengths")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            <Sparkles className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-700">See Strengths</span>
                          </button>

                          <button 
                            onClick={(e) => openFeedback(e, 'improvements', sub.neg_feedback, "Areas to Improve")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-200 transition-colors"
                          >
                            <TrendingUp className="h-4 w-4 text-pink-600" />
                            <span className="text-sm font-medium text-pink-700">See Improvements</span>
                          </button>

                          <Link href={`/student/${studentId}/courses/${courseId}/assignments/${sub.assignment_id}/results`}>
                            <div className="flex items-center gap-2 font-semibold text-sm text-blue-600 hover:text-blue-700 group">
                              View Full Report
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}