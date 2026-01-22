"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, AlertCircle, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner"; // Using sonner for success

export function JoinCourseModal({ onCourseJoined }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault(); // Move this to the top
    setError("");
    setLoading(true);

    try {
      // 1. Get the current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be logged in to join a course.");

      // 2. Find the course with this code 
      // NOTE: Make sure your column name is 'course_code' or 'join_code'
      const { data: course, error: fetchError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("course_code", joinCode.toUpperCase().trim()) // Using course_code
        .single();

      if (fetchError || !course) {
        throw new Error("Invalid join code. Please check with your teacher.");
      }

      // 3. Enroll the student
      const { error: enrollError } = await supabase
        .from("course_enrollments")
        .insert([{ 
          course_id: course.id, 
          student_id: user.id 
        }]);

      if (enrollError) {
        // Postgres unique constraint error code
        if (enrollError.code === "23505") {
          throw new Error("You are already enrolled in this course!");
        }
        throw enrollError;
      }

      // 4. Success!
      toast.success(`Joined ${course.title}!`);
      setOpen(false);
      setJoinCode("");
      if (onCourseJoined) onCourseJoined();
      
    } catch (err) {
      console.error("Join Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setError("");
        setJoinCode("");
      }
    }}>
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
            <p className="text-xs text-gray-500">Enter the 6-character code provided by your teacher.</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit" disabled={loading || !joinCode} className="w-full bg-black text-white hover:bg-gray-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Join Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}