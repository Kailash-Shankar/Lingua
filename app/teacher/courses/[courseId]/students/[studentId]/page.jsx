"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { 
  MessageSquare, 
  ArrowLeft, 
  ChevronRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Circle,
  UserCircle,
  AlertCircle,
  CalendarDays
} from "lucide-react";

export default function TeacherStudentProgressPage() {
  const { studentId, courseId } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allStats, setAllStats] = useState([]);
  
  const [feedbackModal, setFeedbackModal] = useState({ 
    isOpen: false, title: "", items: [], type: "" 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", studentId)
        .single();
      setStudent(profile);

      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      setCourse(courseData);

      const { data: assignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      const { data: submissions } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", studentId);

      const now = new Date();

      const combined = assignments.map(a => {
        const sub = submissions?.find(s => s.assignment_id === a.id && s.status === 'completed');
        
        // Status Logic
        let statusLabel = "pending";
        const dueDate = a.due_at ? new Date(a.due_at) : null;
        const startDate = a.start_at ? new Date(a.start_at) : null;

        if (sub) {
          statusLabel = "completed";
        } else if (startDate && now < startDate) {
          statusLabel = "future";
        } else if (dueDate && now > dueDate) {
          statusLabel = "overdue";
        }

        return { ...a, submission: sub || null, statusLabel };
      });

      setAllStats(combined);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && studentId) fetchData();
  }, [courseId, studentId]);

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

  if (loading) return <div className="h-screen flex items-center justify-center animate-pulse">Loading Student Data...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Dialog open={feedbackModal.isOpen} onOpenChange={(open) => setFeedbackModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              {feedbackModal.type === 'strengths' ? <Sparkles className="text-yellow-600" /> : <TrendingUp className="text-pink-600" />}
              {feedbackModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {feedbackModal.items.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-medium text-gray-700">
                • {item}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" onClick={() => router.back()} className="mb-6 group">
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1" /> Back to Class List
      </Button>

      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
            <UserCircle className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{student?.first_name} {student?.last_name}</h1>
            <p className="text-gray-500 text-lg">Student ID: {student?.student_id} • {course?.title}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5" /> Assignment Timeline
        </h3>
        
        <div className="grid gap-6">
          {allStats.map((item) => (
            <Card key={item.id} className={`border-2 border-black transition-all ${
              item.statusLabel === 'completed' 
                ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                : 'border-dashed bg-gray-50/50 shadow-none'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-full ${
                      item.statusLabel === 'completed' ? 'bg-green-100 text-green-600' :
                      item.statusLabel === 'overdue' ? 'bg-red-100 text-red-500' :
                      item.statusLabel === 'future' ? 'bg-blue-100 text-blue-500' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {item.statusLabel === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : 
                       item.statusLabel === 'overdue' ? <AlertCircle className="h-6 w-6" /> :
                       item.statusLabel === 'future' ? <CalendarDays className="h-6 w-6" /> :
                       <Circle className="h-6 w-6" />}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className={`font-bold text-lg leading-none ${item.statusLabel === 'future' ? 'text-gray-400' : ''}`}>
                        {item.title}
                      </h4>
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold uppercase text-gray-600">
                          <Zap className="h-3 w-3" /> {item.difficulty}
                        </div>
                        {item.submission ? (
                            <>
                            <span className="text-xs text-gray-600 ">
                            Due at {new Date(item.due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="text-xs text-green-600 font-semibold">
                            Completed {new Date(item.submission.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                            </>
                        ) : item.due_at && (
                          <span className={`text-xs font-medium ${item.statusLabel === 'overdue' ? 'text-red-500' : 'text-gray-500'}`}>
                            {item.statusLabel === 'overdue' ? 'Missed Deadline: ' : 'Due: '}
                            {new Date(item.due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {item.statusLabel === 'completed' ? (
                      <>
                        <button 
                          onClick={(e) => openFeedback(e, 'strengths', item.submission.pos_feedback, "Student Strengths")}
                          className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-bold text-yellow-700">Strengths</span>
                        </button>

                        <button 
                          onClick={(e) => openFeedback(e, 'improvements', item.submission.neg_feedback, "Areas to Improve")}
                          className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                        >
                          <TrendingUp className="h-4 w-4 text-pink-600" />
                          <span className="text-sm font-bold text-pink-700">Weaknesses</span>
                        </button>

                        <Link href={`/teacher/courses/${courseId}/students/${studentId}/results/${item.id}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                            Review Transcript <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </>
                    ) : (  
                      <span className={`text-sm font-bold uppercase tracking-widest px-4 ${
                        item.statusLabel === 'overdue' ? 'text-red-500' : 
                        item.statusLabel === 'future' ? 'text-blue-400' : 
                        'text-gray-400'
                      }`}>
                        {item.statusLabel === 'overdue' ? 'Not Submitted' : 
                         item.statusLabel === 'future' ? 'Future Assignment' : 
                         'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}