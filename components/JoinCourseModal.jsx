"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, AlertCircle, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export function JoinCourseModal({ onCourseJoined }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication failed.");

      // Robust metadata extraction
      const metadata = user.user_metadata || {};
      const fName = metadata.first_name || metadata.firstName || "New";
      const lName = metadata.last_name || metadata.lastName || "Student";

      const { data: course, error: fetchError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("course_code", joinCode.toUpperCase().trim())
        .single();

      if (fetchError || !course) throw new Error("Invalid join code.");

      const { error: enrollError } = await supabase
        .from("course_enrollments")
        .insert([{ 
          student_id: user.id,
          course_id: course.id,
          First_Name: fName,
          Last_Name: lName,
        }]);

      if (enrollError) {
        if (enrollError.code === "23505") throw new Error("You are already in this course!");
        throw enrollError;
      }

      toast.success(`Joined ${course.title}!`);
      setOpen(false);
      onCourseJoined?.();
      
    } catch (err) {
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
        <Button className="rounded-2xl border-2 border-[#2D2D2D] bg-[#74C0FC] text-[#2D2D2D] font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all gap-2">
          <PlusCircle className="h-5 w-5" /> Join a Course
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[420px] bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-8">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-[#2D2D2D] uppercase tracking-tighter">
            Join Course
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleJoin} className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="code" className="text-sm font-black uppercase tracking-widest opacity-60">
              Course Join Code
            </Label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2D2D2D]/40" />
              <Input 
                id="code" 
                placeholder="ABC123" 
                className="h-14 pl-12 bg-white border-2 border-[#2D2D2D] rounded-2xl font-black text-xl uppercase tracking-widest shadow-[4px_4px_0px_0px_#2D2D2D] focus-visible:ring-0 focus-visible:translate-x-[1px] focus-visible:translate-y-[1px] focus-visible:shadow-none transition-all"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
            </div>
            <p className="text-xs font-bold text-[#2D2D2D]/50 italic">
              Ask your teacher for the 6-character code.
            </p>
          </div>
          
          {error && (
            <div className="bg-[#FFADAD] border-2 border-[#2D2D2D] p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-[3px_3px_0px_0px_#2D2D2D]">
              <AlertCircle className="h-5 w-5 shrink-0" /> {error}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={loading || !joinCode} 
              className="w-full h-14 bg-[#FFD966] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-2xl font-black text-lg uppercase tracking-tight shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Enter Classroom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}