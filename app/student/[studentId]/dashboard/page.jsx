"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { JoinCourseModal } from "@/components/JoinCourseModal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Book, ChevronRight, Loader2, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { studentId } = useParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); 

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const { data: enrollmentData, error: enrollError } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("student_id", studentId);

      if (enrollError) throw enrollError;
      
      if (!enrollmentData || enrollmentData.length === 0) {
        setCourses([]);
        return;
      }

      const courseIds = enrollmentData.map(e => e.course_id);
      
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, language, course_code, description")
        .in("id", courseIds);

      if (courseError) throw courseError;
      setCourses(courseData || []);
    } catch (err) {
      console.error("❌ Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchEnrolledCourses();
  }, [studentId]);

  if (loading) {  
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#FEFAF2] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#2D2D2D]" />
        <p className="font-bold text-[#2D2D2D] uppercase tracking-tighter">Syncing Classroom...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-[#2D2D2D] pb-8">
          <div className="space-y-2">
            <p className="text-4xl md:text-5xl font-black text-[#2D2D2D] uppercase tracking-tighter [text-shadow:3px_3px_0px_#FFD966]">
              Welcome back, {user?.user_metadata?.first_name || "Scholar"}!
            </p>
            <h1 className="text-xl font-bold text-[#2D2D2D] opacity-60 flex items-center gap-2 uppercase tracking-widest">
              <GraduationCap className="h-5 w-5" /> Student Dashboard
            </h1>
          </div>
          <JoinCourseModal onCourseJoined={fetchEnrolledCourses} />
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-[#2D2D2D]/20 rounded-[40px] py-20 flex flex-col items-center text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="p-6 bg-[#F5F5F5] border-2 border-[#2D2D2D] rounded-full shadow-[4px_4px_0px_0px_#2D2D2D] mb-6">
              <Book className="h-10 w-10 text-[#2D2D2D]/40" />
            </div>
            <h2 className="text-2xl font-black text-[#2D2D2D] uppercase tracking-tight">Your bookshelf is empty</h2>
            <p className="mt-2 text-[#2D2D2D]/60 font-bold max-w-sm">
              Use a join code from your teacher to enroll in a course and start chatting!
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link 
                key={course.id} 
                href={`/student/${studentId}/courses/${course.id}`}
                className="group"
              >
                <Card className="h-full bg-white border-2 border-[#2D2D2D] rounded-[32px] shadow-[6px_6px_0px_0px_#2D2D2D] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all overflow-hidden flex flex-col">
                  <CardHeader className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                      {/* Language Icon Box */}
                      <div className={`p-3 rounded-2xl border-2 border-[#2D2D2D] shadow-[3px_3px_0px_0px_#2D2D2D] transition-all group-hover:shadow-none group-hover:translate-x-[1px] group-hover:translate-y-[1px] ${
                        course.language === "Spanish" ? "bg-[#74C0FC]" : 
                        course.language === "French" ? "bg-[#FFADAD]" : "bg-[#B2F2BB]"
                      }`}>
                        <Book className="h-6 w-6 text-[#2D2D2D]" />
                      </div>
                      
                      <ChevronRight className="h-6 w-6 text-[#2D2D2D]/20 group-hover:text-[#2D2D2D] transition-colors" />
                    </div>

                    <CardTitle className="text-2xl font-black text-[#2D2D2D] leading-tight mb-2 uppercase tracking-tight">
                      {course.title}
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full border border-[#2D2D2D] ${
                        course.language === "Spanish" ? "bg-[#74C0FC]" : 
                        course.language === "French" ? "bg-[#FFADAD]" : "bg-[#B2F2BB]"
                      }`} />
                      <span className="text-xs font-black uppercase tracking-widest opacity-60">
                        {course.language}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#2D2D2D]/50 line-clamp-2 mt-4 leading-relaxed">
                      {course.description || "Jump in to start your language learning journey."}
                    </p>
                  </CardHeader>
                  <div className="mt-auto p-6 pt-0 text-[10px] font-black uppercase tracking-widest text-[#2D2D2D]/30">
                    Course Code: {course.course_code}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}