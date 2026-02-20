  "use client";

  import React, { useEffect, useState } from "react";
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
    CheckCircle,
    ArrowRight,
    FlaskConical
  } from "lucide-react";

  // Static Avatar Mapping
  const AVATARS = ["/m1.jpg", "/m2.png", "/f1.png", "/f2.png"];

  export default function AssignmentDetailPage() {
    const { assignmentId, courseId } = useParams();
    const router = useRouter();
    
    const [assignment, setAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiOverview, setAiOverview] = useState(null);
    
    // Modals
    const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState({ 
      isOpen: false, title: "", items: [], type: "" 
    });

    const formatGeneratedDate = (isoString) => {
      if (!isoString) return "";
      return new Date(isoString).toLocaleString([], { 
        dateStyle: 'short', 
        timeStyle: 'short'  
      });
    };

    useEffect(() => {
      const fetchData = async () => {
        if (!assignmentId) return;
        try {
          setLoading(true);
          
          const { data: assignmentData, error: assignError } = await supabase
            .from("assignments")
            .select("*, courses!assignments_course_id_fkey ( language, level )") // Updated this line
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

          const formattedResults = (enrollmentData || []).map(student => {
            const sub = submissionData?.find(s => s.student_id === student.student_id);
            return { ...student, submission: sub || null };
          });

          setSubmissions(formattedResults);
        } catch (err) {
          console.error("Fetch Error:", err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [assignmentId]);

    const handleGenerateSkillOverview = async () => {
      setIsGeneratingAi(true);
      try {
        const feedbackToAnalyze = submissions
          .filter(s => s.submission?.status === 'completed')
          .map(s => ({
            pos: s.submission.pos_feedback,
            neg: s.submission.neg_feedback
          }));

        if (feedbackToAnalyze.length === 0) {
          alert("No completed submissions to analyze.");
          return;
        }

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

    const openFeedback = (e, type, rawData, title) => {
      e.preventDefault();
      let items = [];
      try { items = typeof rawData === 'string' ? JSON.parse(rawData) : rawData; } 
      catch { items = rawData?.split('\n') || []; }
      setFeedbackModal({ isOpen: true, title, type, items: Array.isArray(items) ? items : [items] });
    };

    const startDemo = (char, index) => {
      // Determine which avatar to use from the static array based on list index
      const assignedAvatar = AVATARS[index % AVATARS.length];
      
      const params = new URLSearchParams();
      params.set("char", char.character_id);
      params.set("v", assignedAvatar);
      router.push(`/teacher/courses/${courseId}/assignments/${assignmentId}/chat-demo?${params.toString()}`);
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

    const hasNoSubmissions = !submissions || submissions.length === 0 || !submissions.some(s => s.submission?.status === 'completed');

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Character Picker Dialog */}
        <Dialog open={isCharPickerOpen} onOpenChange={setIsCharPickerOpen}>
          <DialogContent className="sm:max-w-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FlaskConical className="text-cyan-600" /> Choose a Demo Character
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {characters.map((char, idx) => {
                const avatar = AVATARS[idx % AVATARS.length];
                return (
                  <Card 
                    key={char.id} 
                    className="group border-2 border-black hover:bg-gray-50 cursor-pointer transition-all active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                    onClick={() => startDemo(char, idx)}
                  >
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-black flex-shrink-0 bg-white">
                        <img src={avatar} alt={char.character_id} className="object-cover h-full w-full" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg leading-tight">{char.character_id}</h4>
                        <p className="text-xs text-gray-500 mt-1">{char.public_char_desc}</p>
                        <div className="mt-2 flex items-center text-md font-bold text-cyan-600 uppercase tracking-tighter">
                          Choose <ChevronRight size={12} className="ml-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
          <div className="space-y-2">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2 -ml-2 text-gray-600 mb-2">
              <ArrowLeft size={16}/> Back to Course
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{assignment?.title}</h1>
              <Badge variant={assignment?.difficulty === "Challenging" ? "destructive" : "secondary"}>
                {assignment?.difficulty}
              </Badge>
            </div>
            <p className="text-lg text-gray-500 font-medium">{assignment?.topic}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
            <MessageSquare className="h-4 w-4" />
            <span className="font-bold">{assignment?.exchanges}</span> Messages Required
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">Scenario Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{assignment?.scenario}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                  <BookOpen className="h-4 w-4 text-blue-500" /><CardTitle className="text-sm font-semibold">Vocabulary</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-gray-600">{assignment?.vocabulary || "None listed."}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                  <Brain className="h-4 w-4 text-purple-500" /><CardTitle className="text-sm font-semibold">Grammar</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-gray-600">{assignment?.grammar || "None listed."}</p></CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Opens</p>
                  <p className="text-sm font-medium">{new Date(assignment?.start_at).toLocaleString([], { dateStyle: "short", timeStyle: "short"})}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase text-red-400">Due Date</p>
                  <p className="text-sm font-bold text-red-600">
                    {assignment?.due_at ? new Date(assignment.due_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "No deadline"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setIsCharPickerOpen(true)}
              className="w-full h-15 bg-cyan-600 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 text-white border-2 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <MessageSquare className="h-6 w-6 mr-2" />
              Demo Chat Assignment
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>

        <div className="pt-8 border-t space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold flex items-center gap-2"><Scroll className="h-5 w-5 text-purple-600" /> Class Assignment Overview</h2>
            
            <div className="flex flex-col items-end gap-2">
              {aiOverview?.generated_at && (
                <span className="text-lg font-semibold text-gray-500 flex items-center gap-1">
                  <Clock size={14} /> Last generated: {formatGeneratedDate(aiOverview.generated_at)}
                </span>
              )}
              <Button 
                onClick={handleGenerateSkillOverview} 
                disabled={isGeneratingAi || hasNoSubmissions}
                className={`
                  text-md h-15 w-80 border-2 transition-all
                  ${hasNoSubmissions 
                    ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none opacity-100" 
                    : "bg-purple-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none"
                  }
                `}
              >
                {isGeneratingAi ? <Loader2 className="animate-spin mr-2" size={16}/> : <Sparkles className="mr-2" size={16}/>}
                {hasNoSubmissions ? "No Submissions Yet" : (aiOverview ? "Regenerate Assignment Overview" : "Generate Assignment Overview")}
              </Button>
            </div>
          </div>

          {aiOverview ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-black bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-yellow-700 mb-4 flex items-center gap-2"><Sparkles size={18}/> Students Did Well With:</h3>
                  <div className="space-y-2">
                    {aiOverview.strengths?.map((item, idx) => (
                      <div key={idx} className="bg-white/50 border border-yellow-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-black bg-pink-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-pink-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Students Struggled With:</h3>
                  <div className="space-y-2">
                    {aiOverview.weaknesses?.map((item, idx) => (
                      <div key={idx} className="bg-white/50 border border-pink-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-gray-50/50">
              <BarChart className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No overview generated yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                {hasNoSubmissions 
                  ? "Once students complete this assignment, you can generate an AI aggregate report." 
                  : "Click the button above to aggregate all student data for this assignment."}
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle className="text-cyan-600"/> Student Results
          </h3>
          <div className="grid gap-3">
            {submissions.map((item) => (
              <Card key={item.student_id} className="border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.submission ? <CheckCircle2 className="text-green-500"/> : <Circle className="text-gray-300"/>}
                    <div>
                      <p className="font-bold">{item.First_Name} {item.Last_Name}</p>
                      <p className="text-xs text-gray-500 uppercase font-semibold">ID: {item.Student_id}</p>
                    </div>
                  </div>

                  {item.submission && (
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => openFeedback(e, 'strengths', item.submission.pos_feedback, `${item.First_Name}'s Strengths`)} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-bold text-yellow-700">Strengths</span>
                      </button>

                      <button 
                        onClick={(e) => openFeedback(e, 'weaknesses', item.submission.neg_feedback, `${item.First_Name}'s Weaknesses`)} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                      >
                        <TrendingUp className="h-4 w-4 text-pink-600" />
                        <span className="text-sm font-bold text-pink-700">Weaknesses</span>
                      </button>

                      <Link href={`/teacher/courses/${courseId}/students/${item.student_id}/results/${assignmentId}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
                          Review Transcript <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Dialog open={feedbackModal.isOpen} onOpenChange={(v) => setFeedbackModal({...feedbackModal, isOpen: v})}>
          <DialogContent className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <DialogHeader><DialogTitle className="font-bold text-2xl">{feedbackModal.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-4">
              {feedbackModal.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-medium">• {item}</div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }