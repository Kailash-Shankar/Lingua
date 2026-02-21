"use client";

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Clock, 
  MessageSquare, 
  Users, 
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateCourseModal } from '@/components/CreateCourseModal';
import Link from 'next/link';

const TeacherDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Logic Preserved ---
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          course_enrollments!course_enrollments_course_id_fkey(count),
          assignments!assignments_course_id_fkey(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedCourses = data.map(course => ({
        ...course,
        studentCount: course.course_enrollments?.[0]?.count || 0,
        chatCount: course.assignments?.[0]?.count || 0
      }));

      setCourses(formattedCourses || []);
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFAF2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-[#2D2D2D]" />
          <p className="font-bold text-[#2D2D2D] uppercase tracking-tighter">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFAF2] p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <h2 className="text-5xl font-black text-[#2D2D2D] uppercase tracking-tighter mb-2 [text-shadow:3px_3px_0px_#FFD966]">
            Dashboard
          </h2>
          <div className="flex justify-between items-end border-b-4 border-[#2D2D2D] pb-6">
            <h1 className="text-2xl font-bold text-[#2D2D2D] opacity-80">My Courses</h1>
            <CreateCourseModal onCourseCreated={fetchCourses} />
          </div>
        </div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="bg-white border-2 border-[#2D2D2D] rounded-[32px] shadow-[6px_6px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col overflow-hidden"
              >
                <CardHeader className="pb-2">  
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <CardTitle className="text-2xl font-black text-[#2D2D2D] leading-none py-1">
                      {course.title}
                    </CardTitle>
                    <div className="flex flex-col gap-2 shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2 border-[#2D2D2D] rounded-full text-center ${
                        course.language === 'Spanish' ? "bg-[#74C0FC]" : (course.language === "French" ? "bg-[#FFADAD]" : "bg-[#B2F2BB]")
                      }`}>
                        {course.language}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="font-bold text-[#2D2D2D]/60 line-clamp-2 h-12 text-sm leading-snug">
                    {course.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#F5F5F5] border-2 border-[#2D2D2D] px-3 py-1.5 rounded-2xl shadow-[3px_3px_0px_0px_#2D2D2D]">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-bold">{course.studentCount}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#F5F5F5] border-2 border-[#2D2D2D] px-3 py-1.5 rounded-2xl shadow-[3px_3px_0px_0px_#2D2D2D]">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-xs font-bold">{course.chatCount} Chats</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-6 px-6">
                  <Link href={`/teacher/courses/${course.id}`} className="w-full">
                    <Button className="w-full h-12 bg-[#FFD966] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group">
                      Open Course
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-[#2D2D2D]/20 p-20 rounded-[40px] bg-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
            <p className="text-xl font-bold text-[#2D2D2D]/40 mb-6 italic">No courses created yet.</p>
            <CreateCourseModal onCourseCreated={fetchCourses} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;