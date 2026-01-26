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
  Hash
} from "lucide-react";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active tab from URL or default to "assignments"
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "assignments");

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [students, setStudents] = useState([]); 
  const [assignments, setAssignments] = useState([]);

  // Function to update URL when tab changes
  const handleTabChange = (value) => {
  // Update UI immediately (Instant)
  setActiveTab(value);

  // Update URL in the background (Non-blocking)
  const params = new URLSearchParams(window.location.search);
  params.set("tab", value);
  window.history.replaceState(null, "", `?${params.toString()}`);
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

      const { data: assignmentsData, error: aError } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (!aError) {
        setAssignments(assignmentsData || []);
        setAssignmentCount(assignmentsData?.length || 0);
      }

      const { data: enrollmentData, error: sError } = await supabase
        .from("course_enrollments")
        .select(`
          enrolled_at,
          First_Name,
          Last_Name,
          Student_id, 
          student_id
        `)
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

  const handleCopy = async () => {
    if (course?.course_code) {
      await navigator.clipboard.writeText(course.course_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading course details...</div>;
  if (!course) return <div className="p-10 text-center text-red-500">Course not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link 
        href="/teacher/dashboard" 
        className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors mb-6 w-fit group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Dashboard</span>
      </Link>

      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-gray-500 mt-2 text-lg">
            {course.language} • {course.level}
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-md font-bold uppercase tracking-widest text-gray-800 mb-1">
            Student Join Code
          </p>
          <div onClick={handleCopy} className="flex justify-center items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity group">
            <p className="text-4xl font-mono font-bold text-blue-600 tracking-tighter">
              {course.course_code || "------"}
            </p>
            {course.course_code && (copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />)}
          </div>
          {copied && <p className="text-[10px] text-green-500 font-bold uppercase mt-1 text-right">Copied!</p>}
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="space-y-6"
      >
        <TabsList className="h-10">
          <TabsTrigger value="assignments" className="flex gap-2">
            <MessageSquare className="h-4 w-4" /> Assignments ({assignmentCount})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex gap-2">
            <Users className="h-4 w-4" /> Students ({studentCount})
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex gap-2">
            <BarChart className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Cog className="h-4 w-4" /> Course Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Course Assignments</h3>
              {assignmentCount > 0 && (
                <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />
              )}
            </div>

            {assignmentCount === 0 ? (
              <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <p className="text-sm text-gray-500 italic mb-4">No chat assignments created yet.</p>
                <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />
              </Card>
            ) : (
              <AssignmentsList assignments={assignments} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Enrolled Students</h3>
            {studentCount === 0 ? (
              <Card className="border-dashed bg-gray-50/50">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <p className="text-sm text-gray-500 italic mb-6">No students enrolled in this course yet.</p>
                  <div className="bg-white border-2 border-black p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xs font-bold uppercase text-gray-400 mb-2">Share Join Code</p>
                    <p className="text-4xl font-mono font-bold tracking-widest text-blue-600">{course.course_code || "------"}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {students.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{student.firstname || "Unknown Student"} {student.lastname || ""}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Hash className="h-4 w-4" />
                          <span>ID: {student.id || "No ID provided"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link href={`${courseId}/students/${student.realid}`} >
                      <Button variant="ghost" size="sm" className="text-blue-600 font-bold">
                        View Progress
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}