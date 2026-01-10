"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const generateCourseCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export function CreateCourseModal({ onCourseCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // ✅ Track validation errors
  
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error state
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title");
    const description = formData.get("description");

    // ✅ Validation Check: Ensure mandatory fields are filled
    if (!title || !selectedLanguage || !selectedLevel) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const courseCode = generateCourseCode();

      const { error: supabaseError } = await supabase
        .from("courses")
        .insert([
          { 
            title, 
            description, 
            language: selectedLanguage,
            level: selectedLevel,      
            teacher_id: user.id,
            course_code: courseCode, 
          }
        ]);

      if (supabaseError) throw supabaseError;

      setOpen(false);
      setSelectedLanguage("");
      setSelectedLevel("");
      if (onCourseCreated) onCourseCreated();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setError(""); // ✅ Clear error when closing modal
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-black hover:bg-gray-700 text-white font-semibold">
          <PlusCircle className="h-4 w-4" />
          Create New Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Course</DialogTitle>
        </DialogHeader>

        {/* ✅ Error Message Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-3">
            <Label htmlFor="title">Course Title</Label>
            <Input id="title" name="title" placeholder="e.g. IB Spanish 2" />
          </div>

          <div className="space-y-4">
            {/* --- Language Dropdown --- */}
            <div className="space-y-3 flex flex-col">
              <Label>Language</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`justify-between bg-white text-black ${!selectedLanguage && error ? "border-red-500" : "border-gray-300"}`}>
                    {selectedLanguage || "Select language..."}
                    <ChevronDown className="h-4 w-4 opacity-50" /> 
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuItem onClick={() => setSelectedLanguage("Spanish")}>Spanish</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLanguage("French")}>French</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLanguage("German")}>German</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLanguage("Italian")}>Italian</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* --- Level Dropdown --- */}
            <div className="space-y-3 flex flex-col">
              <Label>Course Level</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`justify-between bg-white text-black ${!selectedLevel && error ? "border-red-500" : "border-gray-300"}`}>
                    {selectedLevel || "Select level..."}
                    <ChevronDown className="h-4 w-4 opacity-50" /> 
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedLevel("Beginner (Year 1)")}>Beginner (Year 1)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("Intermediate (Year 2)")}>Intermediate (Year 2)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("Advanced (Year 3+)")}>Advanced (Year 3+)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Add additional course details..." 
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-gray-800">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}