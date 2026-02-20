"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  MessageSquare, 
  ArrowLeft, 
  CheckCircle2, 
  Star,
  Download,
  TrendingUp,
  ScrollIcon,
  UserCircle,
  Trash2,
  Loader2
} from "lucide-react";

export default function TeacherAssignmentResultsPage() {
  const { studentId, courseId, itemId } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState({ assignment: null, submission: null, profile: null });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!studentId || studentId === "undefined" || !itemId || itemId === "undefined") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: submission, error: sError } = await supabase
  .from("submissions")
  .select(`
    *, 
    assignments (
      id,
      topic, 
      title, 
      difficulty,
      courses!assignments_course_id_fkey ( language, level )
    )
  `)
  .eq("assignment_id", itemId)
  .eq("student_id", studentId)
  .order('created_at', { ascending: false }) // Get the newest one
  .limit(1) // Tell Supabase we only want one
  .maybeSingle(); // Use maybeSingle to avoid crashing if 0 results are found

if (sError) throw sError;

        const { data: enrollment } = await supabase
          .from("course_enrollments")
          .select("First_Name, Last_Name, Student_id")
          .eq("student_id", studentId) 
          .eq("course_id", courseId)
          .single();

        setData({ 
          assignment: submission.assignments, 
          submission: submission,
          profile: {
            first_name: enrollment?.First_Name || "Unknown",
            last_name: enrollment?.Last_Name || "Student",
            student_id: enrollment?.Student_id || "No ID"
          }
        });

      } catch (err) {
        console.error("Error loading results:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [itemId, studentId, courseId]);

  const handleDeleteSubmission = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("submissions")
        .delete()
        .eq("assignment_id", itemId)
        .eq("student_id", studentId);

      if (error) throw error;

      // Redirect back to the student progress page so they see it's gone
      router.push(`/teacher/courses/${courseId}/students/${studentId}`);
      router.refresh(); 
    } catch (err) {
      console.error("Error deleting submission:", err.message);
      alert("Failed to delete submission. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-bold text-gray-500 text-xl">Loading...</div>;
  if (!data.submission) return <div className="p-10 text-center text-red-500 font-bold border-2 border-red-500 rounded-xl m-8">No submission found.</div>;

  const { submission, assignment, profile } = data;
  const cleanFeedback = (text) => text?.replace(/[\[\]"]+/g, '').replace(/\.,\s*/g, '\n• ').replace(/^/, '• ').trim();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b pt-12 pb-8 px-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors group w-fit">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-medium text-sm">Back to Student Progress</span>
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-600 p-1.5 rounded-lg"><UserCircle className="h-5 w-5 text-white" /></div>
                <span className="font-bold text-lg">{profile?.first_name} {profile?.last_name}</span>
                <Badge variant="outline" className="border-black font-bold uppercase text-[10px]">ID: {profile?.student_id}</Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tight">{assignment?.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 grid gap-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard icon={<MessageSquare className="text-blue-500" />} label="Total Exchanges" value={submission.current_exchange_count} />
          <StatCard icon={<Star className="text-orange-500" />} label="Set Difficulty" value={assignment?.difficulty} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            icon={<CheckCircle2 className="text-green-500" />} 
            label="Demonstrated Strengths" 
            value={<div className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">{cleanFeedback(submission.pos_feedback)}</div>} 
          />
          <StatCard
            icon={<TrendingUp className="text-red-500" />} 
            label="Areas for Growth" 
            value={<div className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">{cleanFeedback(submission.neg_feedback)}</div>} 
          />
        </div>

        {/* Chat Transcript */}
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b bg-gray-50/50 py-4">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight">
              <ScrollIcon className="h-5 w-5 text-gray-700" />
              Full Chat Transcript
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
            <div className="divide-y-2 divide-gray-100">
              {submission.chat_history?.map((msg, idx) => (
                <div key={idx} className={`p-6 flex gap-6 transition-colors ${msg.role === 'user' ? 'bg-white' : 'bg-blue-50/30'}`}>
                  <div className={`text-[10px] font-black uppercase w-20 pt-1 flex-shrink-0 tracking-tighter ${msg.role === 'user' ? 'text-blue-600' : 'text-gray-500'}`}>
                    {msg.role === 'user' ? (profile?.first_name || 'Student') : (submission.character_id || 'AI')}
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed font-medium">
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
          <div className="flex gap-4 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50"
              onClick={() => window.print()}
            >
              <Download className="mr-2 h-4 w-4" /> Export (PDF)
            </Button>

            {/* DELETE SUBMISSION BUTTON WITH DIALOG */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Delete Submission
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black uppercase italic">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="font-bold text-gray-700">
                    This will permanently delete {profile?.first_name}'s results for this assignment. 
                    The student will be able to retake the assignment from scratch. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="border-2 border-black font-black uppercase">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteSubmission}
                    className="bg-red-600 text-white border-2 border-black font-black uppercase hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete It"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <Button 
            className="w-full sm:w-auto bg-black text-white px-8 font-bold hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all"
            onClick={() => router.push(`/teacher/courses/${courseId}/students/${studentId}`)}
          >
            Return to Student Progress
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-lg font-black text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}