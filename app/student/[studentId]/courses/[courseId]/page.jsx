"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  ChartColumnIncreasing
} from "lucide-react";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  const [assignments, setAssignments] = useState([]);

const fetchCourseData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Course Details
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        

        // 2. Fetch Assignments Count
        const { data: assignmentsData, error: aError } = await supabase
      .from("assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (!aError) {
      setAssignments(assignmentsData || []);
      setAssignmentCount(assignmentsData?.length || 0);
    }

        // 3. Fetch Students Count (Enrollments table)
        const { count: sCount, error: sError } = await supabase
          .from("course_enrollments")
          .select("*", { count: 'exact', head: true })
          .eq("course_id", courseId);

        if (!sError) setStudentCount(sCount || 0);

        

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
          {/*  Optional: <h3 className="text-gray-500 mt-2 text-lg italic tracking-tight">{course.description}</h3> */} 
          <p className="text-gray-500 mt-2 text-lg">
            {course.language} • {course.level}
          </p>
        </div>

        
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="assignments" className="flex gap-2">
            <MessageSquare className="h-4 w-4" /> Assignments ({assignmentCount})
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex gap-2">
            <ChartColumnIncreasing className="h-4 w-4" /> My Progress
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Cog className="h-4 w-4" /> Course Settings
          </TabsTrigger>
        </TabsList>

                <TabsContent value="assignments">
        <div className="space-y-6">
            <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Course Assignments</h3>
           
            </div>

            {assignmentCount === 0 ? (
            <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <p className="text-sm text-gray-500 italic mb-4">No assignments available yet.</p>
                <CreateAssignmentModal courseId={courseId} onAssignmentCreated={fetchCourseData} />
            </Card>
            ) : (
            <AssignmentsList assignments={assignments} />
            )}
        </div>
        </TabsContent>
     <TabsContent value="progress">
        <div className="space-y-6">
            <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">My Progress</h3>
           
            </div>

            {assignmentCount === 0 ? (
            <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <ChartColumnIncreasing />
                <p className="text-sm text-gray-500 italic mb-4">Your course progress will be displayed here.</p>
                
            </Card>
            ) : (
            
            <Card className="border-dashed bg-gray-50/50 flex flex-col items-center py-12">
                <ChartColumnIncreasing />
                <p className="text-sm text-gray-500 italic mb-4">Your course progress will be displayed here.</p>
                
            </Card>
            )}
        </div>
        </TabsContent>

       
      </Tabs>
    </div>
  );
}


