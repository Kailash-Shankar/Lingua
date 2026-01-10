"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, AlertCircle, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function JoinCourseModal({ onCourseJoined }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = async (e) => {

    console.log("Attempting to enroll:", {
  course_id: course.id,
  student_id: studentId
});

const { error: enrollError } = await supabase
  .from("course_enrollments")
  .insert([{ 
    course_id: course.id, 
    student_id: studentId 
  }]);

if (enrollError) {
  console.error("Supabase Enrollment Error:", enrollError); // Check the "code" and "detail" here
  if (enrollError.code === "23505") throw new Error("You are already enrolled!");
  throw enrollError;
}

    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Find the course with this join code
      const { data: course, error: fetchError } = await supabase
        .from("courses")
        .select("id, name")
        .eq("join_code", joinCode.toUpperCase())
        .single();

      if (fetchError || !course) throw new Error("Invalid join code. Please check with your teacher.");

      // 2. Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Enroll the student
      const { error: enrollError } = await supabase
        .from("course_enrollments")
        .insert([{ 
          course_id: course.id, 
          student_id: user.id 
        }]);

      if (enrollError) {
        if (enrollError.code === "23505") throw new Error("You are already enrolled in this course!");
        throw enrollError;
      }

      setOpen(false);
      setJoinCode("");
      if (onCourseJoined) onCourseJoined();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Join a Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Join Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Course Join Code</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                id="code" 
                placeholder="ABC123" 
                className="pl-10 uppercase font-mono"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-500">Enter the code provided by your teacher.</p>
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Join Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}