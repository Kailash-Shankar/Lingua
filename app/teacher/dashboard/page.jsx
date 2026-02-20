"use client";

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  Clock, 
  MessageSquare, 
  Users, 
  ArrowRight 
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
      // Note: When you use the !name syntax, the property name in the 
      // result might change to match that name.
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
    return <div className="p-10 text-center text-gray-500 animate-pulse">Loading courses...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className='gradient-subtitle2 text-5xl mb-8'>
        Dashboard
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold font-heading">My Courses</h1>
        <CreateCourseModal onCourseCreated={fetchCourses} />
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className ="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>  
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-xl font-bold truncate">{course.title}</CardTitle>
                  <div className='grid grid-cols-1 gap-2'>
                  <span className={`text-xs font-medium ${course.language === 'Spanish' ? "bg-blue-100 text-blue-800" : (course.language === "French" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800")} px-2 py-1 rounded whitespace-nowrap`}>
                    {course.language}
                  </span>
                  <span className={`text-xs font-medium ${course.level === 'Beginner (Year 1)' ? "bg-green-100 text-green-800" : (course.level === "Intermediate (Year 2)" ? "bg-yellow-100 text-yellow-800" : "bg-orange-100 text-orange-800")} px-2 py-1 rounded whitespace-nowrap`}>
                    {course.level}
                  </span>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 h-10">
                  {course.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.studentCount} {course.studentCount === 1 ? "Student" : "Students"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.chatCount} {course.chatCount === 1 ? "Chat" : "Chats"}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/teacher/courses/${course.id}`} className="w-full">
                <Button className="w-full group">
                  Open Course
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center border-2 border-dashed p-12 rounded-xl bg-gray-50/50">
          <p className="text-gray-500 mb-4">No courses created yet.</p>
          <CreateCourseModal onCourseCreated={fetchCourses} />
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;