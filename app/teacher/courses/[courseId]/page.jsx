"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreateAssignmentModal } from "@/components/CreateAssignmentModal";
import { AssignmentsList } from "@/components/AssignmentsList";
import { 
  Users, 
  MessageSquare, 
  BarChart, 
  Cog, 
  Copy, 
  Check, 
  ArrowLeft,
  UserCircle,
  Mail,
  ChevronRight,
  Hash,
  Sparkles,
  TrendingUp,
  Clock,
  Loader2,
  Scroll
} from "lucide-react";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "assignments");
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0); // Track total submissions
  const [students, setStudents] = useState([]); 
  const [assignments, setAssignments] = useState([]);

  // AI Analytics State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [courseAiOverview, setCourseAiOverview] = useState(null);

  const handleTabChange = (value) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*, course_overview")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);
      
      if (courseData?.course_overview) {
        setCourseAiOverview(courseData.course_overview);
      }

      const { data: assignmentsData, error: aError } = await supabase
        .from("assignments")
        .select("*") // Change this from "id, title, created_at" to "*"
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (!aError && assignmentsData) {
        setAssignments(assignmentsData);
        setAssignmentCount(assignmentsData.length);

        // Fetch submission count for these assignments
        const assignmentIds = assignmentsData.map(a => a.id);
        if (assignmentIds.length > 0) {
          const { count, error: subCountError } = await supabase
            .from("submissions")
            .select("*", { count: 'exact', head: true })
            .in("assignment_id", assignmentIds)
            .eq("status", "completed");
          
          if (!subCountError) setTotalSubmissions(count || 0);
        }
      }

      const { data: enrollmentData, error: sError } = await supabase
        .from("course_enrollments")
        .select(`enrolled_at, First_Name, Last_Name, Student_id, student_id`)
        .eq("course_id", courseId);

      if (!sError && enrollmentData) {
        const studentList = enrollmentData.map(e => ({
          id: e.Student_id,
          firstname: e.First_Name,
          lastname: e.Last_Name,
          enrolled_at: e.enrolled_at,
          realid: e.student_id
        }));
        setStudents(studentList);
        setStudentCount(studentList.length);
      }

    } catch (err) {
      console.error("Error fetching course data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId]);

  const handleGenerateCourseOverview = async () => {
    if (totalSubmissions === 0) return;
    setIsGeneratingAi(true);
    try {
      const assignmentIds = assignments.map(a => a.id);
      const { data: allSubmissions, error: subError } = await supabase
        .from("submissions")
        .select("pos_feedback, neg_feedback")
        .in("assignment_id", assignmentIds)
        .eq("status", "completed");

      if (subError) throw subError;

      const feedbackData = allSubmissions.map(s => ({
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

      await supabase.from("courses").update({ course_overview: newOverview }).eq("id", courseId);
      setCourseAiOverview(newOverview);
    } catch (err) {
      console.error("Generation Error:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const formatGeneratedDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const handleCopy = async () => {
    if (course?.course_code) {
      await navigator.clipboard.writeText(course.course_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasNoData = totalSubmissions === 0;

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading course details...</div>;
  if (!course) return <div className="p-10 text-center text-red-500">Course not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/teacher/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors mb-6 w-fit group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-md uppercase tracking-widest font-black">Back to Dashboard</span>
      </Link>

      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-gray-500 mt-2 text-lg">{course.language} • {course.level}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="text-md font-bold uppercase tracking-widest text-gray-800 mb-1">Student Join Code</p>
          <div onClick={handleCopy} className="flex justify-center items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity group">
            <p className="text-4xl font-mono font-bold text-blue-600 tracking-tighter">{course.course_code || "------"}</p>
            {course.course_code && (copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />)}
          </div>
          {copied && <p className="text-[10px] text-green-500 font-bold uppercase mt-1 text-right">Copied!</p>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="assignments" className="flex gap-2"><MessageSquare className="h-4 w-4" /> Assignments ({assignmentCount})</TabsTrigger>
          <TabsTrigger value="students" className="flex gap-2"><Users className="h-4 w-4" /> Students ({studentCount})</TabsTrigger>
          <TabsTrigger value="stats" className="flex gap-2"><BarChart className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2"><Cog className="h-4 w-4" /> Course Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Course Assignments</h3>
              {assignmentCount > 0 && <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />}
            </div>
            {assignmentCount === 0 ? (
              <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <p className="text-sm text-gray-500 italic mb-4">No chat assignments created yet.</p>
                <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />
              </Card>
            ) : <AssignmentsList assignments={assignments} />}
          </div>
        </TabsContent>

        <TabsContent value="students">
           <div className="space-y-6">
            <h3 className="text-lg font-semibold">Enrolled Students</h3>
            {studentCount === 0 ? (
              <Card className="border-dashed bg-gray-50/50">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <p className="text-sm text-gray-500 italic mb-6">No students enrolled yet.</p>
                  <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xs font-bold uppercase text-gray-400 mb-2">Join Code</p>
                    <p className="text-4xl font-mono font-bold tracking-widest text-blue-600">{course.course_code}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {students.map((student) => (
                  <Link href={`${courseId}/students/${student.realid}`} key={student.id}>
                    <div className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-full"><UserCircle className="h-6 w-6 text-blue-600" /></div>
                        <div>
                          <p className="font-bold text-gray-900">{student.firstname} {student.lastname}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500"><Hash className="h-4 w-4" /><span>ID: {student.id}</span></div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600 font-bold">View Progress <ChevronRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl pb-1 font-bold flex items-center gap-2">
                  <Scroll className="h-5 w-5 text-green-600" /> Overall Course Performance
                </h3>
                <p className="text-sm text-gray-500 font-medium">Global insights across all assignments</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {courseAiOverview?.generated_at && (
                  <span className="text-lg font-semibold text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> Last generated: {formatGeneratedDate(courseAiOverview.generated_at)}
                  </span>
                )}
                <Button 
                  onClick={handleGenerateCourseOverview} 
                  disabled={isGeneratingAi || hasNoData}
                  className={`
                    h-15 w-80 text-md border-2 transition-all
                    ${hasNoData 
                      ? "!bg-gray-200 !text-gray-400 !border-gray-300 !shadow-none !cursor-not-allowed !pointer-events-none opacity-100" 
                      : "bg-purple-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none"
                    }
                  `}
                >
                  {isGeneratingAi ? <Loader2 className="animate-spin mr-2" size={16}/> : <Sparkles className="mr-2" size={16}/>}
                  {hasNoData ? "No Student Data Available" : (courseAiOverview ? "Regenerate Course Overview" : "Generate Course Overview")}
                </Button>
              </div>
            </div>

            {courseAiOverview ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2 border-black bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-yellow-700 mb-4 flex items-center gap-2"><Sparkles size={18}/> Student Strengths</h3>
                    <div className="space-y-2">
                      {courseAiOverview.strengths?.map((item, idx) => (
                        <div key={idx} className="bg-white/50 border border-yellow-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black bg-pink-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-pink-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Student Areas for Improvement</h3>
                    <div className="space-y-2">
                      {courseAiOverview.weaknesses?.map((item, idx) => (
                        <div key={idx} className="bg-white/50 border border-pink-200 p-3 rounded-lg text-sm font-medium">• {item}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-gray-50/50">
                <BarChart className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No course analytics generated yet.</p>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                  {hasNoData ? "Data will appear here once students complete assignments." : "Click the button above to aggregate all student data."}
                </p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}