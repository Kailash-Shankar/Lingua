"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  BarChart3
} from "lucide-react";

export default function CourseDetailPage() {
  const { studentId, courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [assignmentCount, setAssignmentCount] = useState(0);
  
  const [feedbackModal, setFeedbackModal] = useState({ 
    isOpen: false, 
    title: "", 
    items: [], 
    type: "" 
  });

  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "assignments";

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
          assignments!inner (title, topic, difficulty, exchanges, courses!inner(language))
        `)
        .eq("student_id", studentId)
        .eq("assignments.courses.language", courseData.language)
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
        <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-gray-500 mt-2 text-lg">{course.language} • {course.level}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="assignments" className="flex gap-2">
            <MessageSquare className="h-4 w-4" /> Assignments ({assignmentCount})
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex gap-2">
            <ChartColumnIncreasing className="h-4 w-4" /> My Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Course Assignments</h3>
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

        <TabsContent value="progress">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Completed Assignments</h3>
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
                            {/* Difficulty Badge */}
                            <div className={`flex items-center gap-1 px-2 py-0.5 ${sub.assignments.difficulty === "Challenge" ? "bg-red-100 border border-red-200 rounded text-[10px] font-bold uppercase tracking-wider text-red-600" : "bg-gray-100 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider text-gray-600"}`}>
                              <Zap className="h-3 w-3" />
                              {sub.assignments.difficulty}
                            </div>
                            {/* Exchanges Badge */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}