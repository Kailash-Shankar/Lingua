"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Ensure this is in your components
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
  ChevronRight,
  Sparkles,
  TrendingUp,
  Loader2,
  Settings,
  Edit3,
  Trash2,
  Globe,
  Newspaper,
  BarChartHorizontal,
  BarChartBigIcon,
  BarChartBig,
  Pin,
  MapPin
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
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [students, setStudents] = useState([]); 
  const [assignments, setAssignments] = useState([]);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [courseAiOverview, setCourseAiOverview] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

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

      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (assignmentsData) {
        setAssignments(assignmentsData);
        setAssignmentCount(assignmentsData.length);
        const assignmentIds = assignmentsData.map(a => a.id);
        if (assignmentIds.length > 0) {
          const { count } = await supabase
            .from("submissions")
            .select("*", { count: 'exact', head: true })
            .in("assignment_id", assignmentIds)
            .eq("status", "completed");
          setTotalSubmissions(count || 0);
        }
      }

      const { data: enrollmentData } = await supabase
        .from("course_enrollments")
        .select(`enrolled_at, First_Name, Last_Name, Student_id, student_id`)
        .eq("course_id", courseId);

      if (enrollmentData) {
        const studentList = enrollmentData.map(e => ({
          id: e.Student_id || "No ID",
          firstname: e.First_Name,
          lastname: e.Last_Name,
          enrolled_at: e.enrolled_at,
          realid: e.student_id 
        }));
        setStudents(studentList);
        setStudentCount(studentList.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId]);

  const handleToggleRegionSpecific = async (checked) => {
    setIsUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ use_region_specific: checked })
        .eq("id", courseId);
      
      if (error) throw error;
      setCourse({ ...course, use_region_specific: checked });
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const handleGenerateCourseOverview = async () => {
    if (totalSubmissions === 0) return;
    setIsGeneratingAi(true);
    try {
      const assignmentIds = assignments.map(a => a.id);
      const { data: allSubmissions } = await supabase
        .from("submissions")
        .select("pos_feedback, neg_feedback")
        .in("assignment_id", assignmentIds)
        .eq("status", "completed");

      const feedbackData = allSubmissions.map(s => ({ pos: s.pos_feedback, neg: s.neg_feedback }));
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
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = async () => {
    if (course?.course_code) {
      await navigator.clipboard.writeText(course.course_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FEFAF2]"><Loader2 className="animate-spin h-10 w-10 text-[#2D2D2D]" /></div>;

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-8 pt-24 text-[#2D2D2D]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation */}
        <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 font-bold text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] uppercase tracking-widest font-black">Back to Dashboard</span>
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-[#2D2D2D] pb-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter [text-shadow:3px_3px_0px_#FFD966] leading-none">
              {course.title}
            </h1>
            <div className="flex items-center gap-3">
               <span className="px-4 py-1.5 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#2D2D2D]">
                 {course.language}
               </span>
               <span className="px-4 py-1.5 bg-white border-2 border-[#2D2D2D] rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#2D2D2D]">
                 {course.level}
               </span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end group">
            <p className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">Student Join Code</p>
            <div onClick={handleCopy} className="flex items-center gap-3 cursor-pointer bg-white border-2 border-[#2D2D2D] p-3 px-5 rounded-2xl shadow-[4px_4px_0px_0px_#74C0FC] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <p className="text-3xl font-black font-mono text-[#74C0FC] tracking-tighter">{course.course_code || "------"}</p>
              {copied ? <Check className="h-6 w-6 text-green-500" /> : <Copy className="h-6 w-6 opacity-20 group-hover:opacity-100" />}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-10">
          <TabsList className="bg-gray-200 p-1.5 rounded-2xl h-14 border-2 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D]">
            <TabsTrigger value="assignments" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <Newspaper className="h-4 w-4" /> Assignments ({assignmentCount})
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <Users className="h-4 w-4" /> Students ({studentCount})
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <BarChartBigIcon className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl font-bold uppercase text-sm tracking-widest h-full px-6 data-[state=active]:bg-white data-[state=active]:text-[#2D2D2D]">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <div className="p-1.5 bg-orange-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <Newspaper className="h-6 w-6" />
            </div> Assignments
              </h3>
              {assignmentCount > 0 && <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />}
            </div>
            {assignmentCount === 0 ? (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-16 flex flex-col items-center gap-6">
                <p className="font-bold opacity-30 italic">No chat assignments created yet.</p>
                <CreateAssignmentModal courseId={courseId} level={course.level} onAssignmentCreated={fetchCourseData} />
              </div>
            ) : <AssignmentsList assignments={assignments} />}
          </TabsContent>

          <TabsContent value="students" className="space-y-8">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
               <div className="p-1.5 bg-blue-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <Users className="h-6 w-6 " /> </div> Enrolled Students
            </h3>
            {studentCount === 0 ? (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-20 flex flex-col items-center text-center">
                <p className="text-lg font-bold opacity-30 italic mb-8">No students have joined this course yet.</p>
                <div className="bg-[#F5F5F5] border-2 border-[#2D2D2D] p-6 rounded-3xl shadow-[6px_6px_0px_0px_#2D2D2D]">
                   <p className="text-[10px] font-black uppercase opacity-40 mb-2">Share Code</p>
                   <p className="text-4xl font-black font-mono text-[#74C0FC] tracking-widest">{course.course_code}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-1">
                {students.map((student) => (
                  <Link href={`/teacher/courses/${courseId}/students/${student.realid}`} key={student.realid}>
                    <div className="bg-white border-2 border-[#2D2D2D] p-5 rounded-[28px] shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D]">
                          <UserCircle className="h-6 w-6 text-[#2D2D2D]" />
                        </div>
                        <div>
                          <p className="font-black text-lg uppercase tracking-tight">{student.firstname} {student.lastname}</p>
                          <p className="text-[10px] font-black uppercase opacity-40">ID: {student.id}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-6 w-6 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-[#2D2D2D]/10 pb-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <div className="h-12 w-12 bg-purple-300 border-2 border-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D]">
                  <BarChartBig className="h-6 w-6" /> </div>Course Analytics
                  
                </h3>
                <p className="font-bold opacity-40 text-[10px] uppercase tracking-widest">Global insights across all submissions</p>
              </div>
              <Button 
                onClick={handleGenerateCourseOverview} 
                disabled={isGeneratingAi || totalSubmissions === 0}
                className="h-14 px-8 bg-[#FFD966] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-2xl font-black shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 uppercase tracking-tighter"
              >
                {isGeneratingAi ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {totalSubmissions === 0 ? "No Student Data" : "Update Course Overview"}
              </Button>
            </div>

            {courseAiOverview ? (
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-[#2D2D2D] bg-[#FFFAF0] rounded-[32px] shadow-[6px_6px_0px_0px_#FFD966] overflow-hidden">
                  <div className="p-8 border-b-2 border-[#2D2D2D]/10">
                    <h3 className="font-black text-xl flex items-center gap-2 uppercase tracking-tight text-[#92400E]">
                      <Sparkles className="h-5 w-5" /> Student Strengths
                    </h3>
                  </div>
                  <div className="p-8 space-y-3">
                    {courseAiOverview.strengths?.map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                    ))}
                  </div>
                </Card>
                <Card className="border-2 border-[#2D2D2D] bg-[#FFF5F5] rounded-[32px] shadow-[6px_6px_0px_0px_#FFADAD] overflow-hidden">
                  <div className="p-8 border-b-2 border-[#2D2D2D]/10">
                    <h3 className="font-black text-xl flex items-center gap-2 uppercase tracking-tight text-[#9D174D]">
                      <TrendingUp className="h-5 w-5" /> Improvement Areas
                    </h3>
                  </div>
                  <div className="p-8 space-y-3">
                    {courseAiOverview.weaknesses?.map((item, idx) => (
                      <div key={idx} className="bg-white border-2 border-[#2D2D2D] p-4 rounded-2xl font-bold text-sm shadow-[2px_2px_0px_0px_#2D2D2D]">• {item}</div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="bg-white border-4 border-dashed border-[#2D2D2D]/10 rounded-[40px] py-20 flex flex-col items-center text-center">
                <BarChart className="h-12 w-12 text-[#2D2D2D]/10 mb-6" />
                <p className="text-xl font-bold text-[#2D2D2D]/30 italic max-w-sm">
                  {totalSubmissions === 0 ? "Insights will appear once students complete assignments." : "Aggregate all student data to see class-wide trends."}
                </p>
              </div>
            )}
          </TabsContent>


          <TabsContent value="settings" className="space-y-8">
            <div className="grid gap-6">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                 <div className="p-1.5 bg-gray-300 border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]"><Settings className="h-6 w-6" /></div> Course Settings
              </h3>

              <div className="space-y-6">
                {/* Spanish Specific Toggle */}
                {course.language === "Spanish" && (
                  <Card className="bg-white border-2 border-[#2D2D2D] rounded-[28px] shadow-[4px_4px_0px_0px_#2D2D2D]">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-xl flex items-center justify-center">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-md ">Allow region-specific grammar</p>
                          <p className="text-sm font-semibold opacity-60 ">Forms like 'vos' and 'vosotros' may be used in conversations, depending on the country the LinguaBuddy lives in.</p>
                        </div>
                      </div>
                      <Switch 
                        className="data-[state=checked]:bg-green-500 border-[#7e7e7e]"
                        checked={course.use_region_specific !== false} 
                        onCheckedChange={handleToggleRegionSpecific}
                        disabled={isUpdatingSettings}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Course Management Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-16 border-2 border-[#2D2D2D] rounded-2xl font-black uppercase shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <Edit3 className="mr-2 h-5 w-5" /> Edit Course Details
                  </Button>
                  <Button variant="destructive" className="h-16 bg-red-500 text-white border-2 border-[#2D2D2D] rounded-2xl font-black uppercase shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <Trash2 className="mr-2 h-5 w-5" /> Delete Course
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}