"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { JoinCourseModal } from "@/components/JoinCourseModal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Book, ChevronRight, Loader2, graduationCap } from "lucide-react";
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
    console.log("🔍 Checking enrollment for Student ID:", studentId);

    // Step 1: Fetch enrollments
    const { data: enrollmentData, error: enrollError } = await supabase
      .from("course_enrollments")
      .select("course_id")
      .eq("student_id", studentId);

    if (enrollError) throw enrollError;
    
    console.log("📍 Enrollment data found:", enrollmentData);

    if (!enrollmentData || enrollmentData.length === 0) {
      console.log("⚠️ No enrollment records found in DB for this ID.");
      setCourses([]);
      return;
    }

    const courseIds = enrollmentData.map(e => e.course_id);
    console.log("🆔 Course IDs to fetch:", courseIds);
    
    // Step 2: Fetch course details
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("id, title, language, course_code, description")
      .in("id", courseIds);

    if (courseError) throw courseError;

    console.log("✅ Final Courses fetched:", courseData);
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500 font-medium">Loading your classroom...</p>
      </div>
    );
  }
  

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
     
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-4">
          <p className="gradient-subtitle text-5xl font-bold tracking-tight">Welcome back, {user.user_metadata.first_name}!</p>
          <h1 className="text-4xl font-bold tracking-tight">Student Dashboard</h1>
          
        </div>
        <JoinCourseModal onCourseJoined={fetchEnrolledCourses} />
      </div>

      <hr />

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <Card className="border-dashed bg-gray-50/50 py-20 flex flex-col items-center text-center">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4">
            <Book className="h-8 w-8 text-gray-300" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">No courses yet</CardTitle>
          <CardDescription className="mt-2 max-w-xs">
            Enter a join code from your teacher to see your course and assignments.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link 
              key={course.id} 
              href={`/student/${studentId}/courses/${course.id}`}
            >
              <Card className={`group hover:ring-2 ${
  course.language === "Spanish" ? "hover:ring-blue-500" : 
  course.language === "French" ? "hover:ring-red-500" : 
  "hover:ring-green-500"
} transition-all cursor-pointer shadow-sm`}>
  <CardHeader>
    <div className="flex justify-between items-start">
      {/* Icon Container */}
      <div className={`p-2.5 rounded-lg transition-colors ${
        course.language === "Spanish" 
          ? "bg-blue-50 text-blue-700 group-hover:bg-blue-600" 
          : course.language === "French" 
            ? "bg-red-50 text-red-700 group-hover:bg-red-600" 
            : "bg-green-50 text-green-700 group-hover:bg-green-600"
      } group-hover:text-white`}>
        <Book className="h-5 w-5" />
      </div>
      
      {/* Chevron Icon */}
      <ChevronRight className={`h-5 w-5 text-gray-300 transition-colors ${
        course.language === "Spanish" ? "group-hover:text-blue-500" : 
        course.language === "French" ? "group-hover:text-red-500" : 
        "group-hover:text-green-500"
      }`} />
    </div>

    <CardTitle className="mt-4 text-xl">{course.title}</CardTitle>
    
    {/* Language Badge/Status */}
    <CardDescription className={`flex items-center gap-1.5 mt-1 font-medium ${
      course.language === "Spanish" ? "text-blue-600" : 
      course.language === "French" ? "text-red-600" : 
      "text-green-600"
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        course.language === "Spanish" ? "bg-blue-600" : 
        course.language === "French" ? "bg-red-600" : 
        "bg-green-600"
      }`} />
      {course.language}
    </CardDescription>

    <p className="text-sm text-gray-500 line-clamp-2 mt-4">
      {course.description || "No description provided."}
    </p>
  </CardHeader>
</Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}