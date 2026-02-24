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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, ChevronDown, AlertCircle, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const generateCourseCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export function CreateCourseModal({ onCourseCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); 
  
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  // Default to true (Yes)
  const [useRegionSpecific, setUseRegionSpecific] = useState(true);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title");
    const description = formData.get("description");

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
            use_region_specific: selectedLanguage === "Spanish" ? useRegionSpecific : null
          }
        ]);

      if (supabaseError) throw supabaseError;

      toast.success("Course created successfully!", {
        description: `${title} is now available in your dashboard.`,
        duration: 4000,
      });

      setOpen(false);
      setSelectedLanguage("");
      setSelectedLevel("");
      setUseRegionSpecific(true);
      if (onCourseCreated) onCourseCreated();
      router.refresh();
    } catch (err) {
      setError(err.message);
      toast.error("Failed to create course", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setError(""); 
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-[#74C0FC] hover:bg-[#74C0FC] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl shadow-[4px_4px_0px_0px_#2D2D2D] active:shadow-none hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-black uppercase tracking-tight">
          <PlusCircle className="h-4 w-4" />
          Create New Course
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#2D2D2D]">
            Create New <span className="text-[#FF914D]">Course</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm font-bold text-[#2D2D2D] bg-[#FFF5F5] border-2 border-[#2D2D2D] rounded-xl shadow-[3px_3px_0px_0px_#2D2D2D]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Course Title</Label>
            <Input 
              id="title" 
              name="title" 
              placeholder="e.g. IB Spanish 2" 
              className="bg-white border-2 border-[#2D2D2D] rounded-xl focus-visible:ring-0 focus-visible:border-[#74C0FC] placeholder:opacity-30 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Language</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`justify-between bg-white text-[#2D2D2D] border-2 rounded-xl font-bold shadow-[3px_3px_0px_0px_#2D2D2D] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] ${!selectedLanguage && error ? "border-red-500" : "border-[#2D2D2D]"}`}>
                    {selectedLanguage || "Select..."}
                    <ChevronDown className="h-4 w-4 opacity-50" /> 
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 border-2 border-[#2D2D2D] rounded-xl bg-white font-bold shadow-[4px_4px_0px_0px_#2D2D2D]">
                  {["Spanish", "French"].map((lang) => (
                    <DropdownMenuItem key={lang} onClick={() => setSelectedLanguage(lang)} className="focus:bg-[#B2F2BB] cursor-pointer">
                      {lang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Level</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`justify-between bg-white text-[#2D2D2D] border-2 rounded-xl font-bold shadow-[3px_3px_0px_0px_#2D2D2D] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] ${!selectedLevel && error ? "border-red-500" : "border-[#2D2D2D]"}`}>
                    <span className="truncate">{selectedLevel || "Select..."}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" /> 
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 border-2 border-[#2D2D2D] rounded-xl bg-white font-bold shadow-[4px_4px_0px_0px_#2D2D2D]">
                  {["Beginner (Year 1)", "Intermediate (Year 2)", "Advanced (Year 3+)"].map((lvl) => (
                    <DropdownMenuItem key={lvl} onClick={() => setSelectedLevel(lvl)} className="focus:bg-[#74C0FC] cursor-pointer">
                      {lvl}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Conditional Spanish Region Selection */}
          {selectedLanguage === "Spanish" && (
            <div className="p-4 bg-white border-2 border-[#2D2D2D] rounded-2xl space-y-4 shadow-[4px_4px_0px_0px_#2D2D2D]">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-[#E6F4F1] border-2 border-[#2D2D2D] rounded-lg flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-md leading-tight">Enable Region-Specific Grammar</p>
                  <p className="text-sm font-bold opacity-60 leading-tight mt-1">Allow usage of <em>vos</em> or <em>vosotros</em> based on LinguaBuddy origin.</p>
                </div>
              </div>
              
              <div className="flex w-full">
                <button
                  type="button"
                  onClick={() => setUseRegionSpecific(true)}
                  className={`flex-1 h-10 font-black uppercase text-xs border-2 border-[#2D2D2D] rounded-l-xl transition-all ${
                    useRegionSpecific 
                    ? "bg-[#B2F2BB] translate-z-0" 
                    : "bg-white opacity-50 hover:opacity-100"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setUseRegionSpecific(false)}
                  className={`flex-1 h-10 font-black uppercase text-xs border-y-2 border-r-2 border-[#2D2D2D] rounded-r-xl transition-all ${
                    !useRegionSpecific 
                    ? "bg-[#FFADAD] translate-z-0" 
                    : "bg-white opacity-50 hover:opacity-100"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Description (Optional)</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Add additional course details..." 
              className="bg-white border-2 border-[#2D2D2D] rounded-xl focus-visible:ring-0 focus-visible:border-[#FF914D] placeholder:opacity-30 font-bold min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 bg-[#2D2D2D] text-white hover:bg-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl shadow-[4px_4px_0px_0px_#B2F2BB] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase tracking-widest text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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