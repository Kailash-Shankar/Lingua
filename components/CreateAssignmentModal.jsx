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
import { PlusCircle, Loader2, AlertCircle, Zap, ChevronDown, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function CreateAssignmentModal({ courseId, level, onAssignmentCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [minExchanges, setMinExchanges] = useState(0);
  const [difficulty, setDifficulty] = useState("Standard");

  const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  
  const [startAt, setStartAt] = useState(getLocalDatetimeString());
  const [dueAt, setDueAt] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title");
    const topic = formData.get("topic");
    const scenario = formData.get("scenario");
    const vocabulary = formData.get("vocabulary");
    const grammar = formData.get("grammar");

    if (!title || !scenario || !topic || minExchanges === 0) {
      setError("Please fill in all required fields and select exchange length.");
      setLoading(false);
      return;
    }

    try {
      const selectedStart = new Date(startAt);
      const now = new Date();
      const startAtUTC = selectedStart < now ? now.toISOString() : selectedStart.toISOString();
      const dueAtUTC = dueAt ? new Date(dueAt).toISOString() : null;

      const { error: insertError } = await supabase
        .from("assignments")
        .insert([
          { 
            course_id: courseId,
            title,
            topic,
            scenario,
            vocabulary,
            grammar,
            difficulty,
            exchanges: minExchanges,
            start_at: startAtUTC,
            due_at: dueAtUTC, 
          }
        ]);

      if (insertError) throw insertError;

      setOpen(false);
      setMinExchanges(0);
      setDueAt("");
      if (onAssignmentCreated) onAssignmentCreated();
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
        setDifficulty("Standard");
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-[#B2F2BB] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl shadow-[4px_4px_0px_0px_#2D2D2D] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase tracking-tight hover:bg-[#B2F2BB]">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[10px_10px_0px_0px_#2D2D2D]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#2D2D2D]">
            New Chat Assignment
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-[#FFF5F5] text-[#2D2D2D] p-3 border-2 border-[#2D2D2D] rounded-xl flex items-center gap-2 text-sm font-bold shadow-[3px_3px_0px_0px_#2D2D2D]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Assignment Title</Label>
            <Input id="title" name="title" placeholder="e.g. ¡Vamos al centro comercial!" className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold focus-visible:ring-0 focus-visible:border-[#74C0FC]" required />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Difficulty Level</Label>
            <div className="flex p-1 bg-white  border-[#2D2D2D] rounded-2xl gap-1">
              <Button 
                type="button"
                onClick={() => setDifficulty("Standard")}
                className={`flex-1 gap-2 transition-all font-bold rounded-xl ${difficulty === "Standard" ? "bg-[#74C0FC] text-[#2D2D2D] shadow-[2px_2px_0px_0px_#2D2D2D]" : "bg-transparent text-gray-500 hover:bg-gray-50"}`}
                variant="ghost"
              >
                Standard
              </Button>
              <Button 
                type="button"
                onClick={() => setDifficulty("Challenging")}
                className={`flex-1 gap-2 transition-all font-bold rounded-xl ${difficulty === "Challenging" ? "bg-[#FFADAD] text-[#2D2D2D] shadow-[2px_2px_0px_0px_#2D2D2D]" : "bg-transparent text-gray-500 hover:bg-gray-50"}`}
                variant="ghost"
              >
                <Zap className="h-4 w-4" />
                Challenging
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-[#2D2D2D]/20 pt-6">
            <div className="space-y-2">
              <Label htmlFor="startAt" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Start Date
              </Label>
              <Input 
                id="startAt" 
                type="datetime-local" 
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Due Date
              </Label>
              <Input 
                id="dueAt" 
                type="datetime-local" 
                value={dueAt}
                min={startAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Topic/Theme</Label>
            <Input id="topic" name="topic" placeholder="e.g. Ir de compras" className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold focus-visible:ring-0 focus-visible:border-[#B2F2BB]" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Description / Scenario</Label>
            <Textarea 
              id="scenario" 
              name="scenario" 
              placeholder="Describe the scenario..." 
              className="min-h-[100px] bg-white border-2 border-[#2D2D2D] rounded-xl font-bold focus-visible:ring-0 focus-visible:border-[#FF914D]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vocabulary" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Vocabulary</Label>
              <Input id="vocabulary" name="vocabulary" placeholder="Key words..." className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grammar" className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Grammar</Label>
              <Input id="grammar" name="grammar" placeholder="Tenses/Concepts..." className="bg-white border-2 border-[#2D2D2D] rounded-xl font-bold" />
            </div>
          </div>

          <div className="space-y-3 flex flex-col">
            <Label className="text-xs font-black uppercase tracking-widest opacity-70 ml-1">Minimum Required Exchanges</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between bg-white border-2 border-[#2D2D2D] rounded-xl font-bold shadow-[3px_3px_0px_0px_#2D2D2D] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]">
                  {minExchanges ? `${minExchanges} Exchanges` : "Select requirement..."}
                  <ChevronDown className="h-4 w-4 opacity-50" /> 
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] border-2 border-[#2D2D2D] rounded-xl font-bold shadow-[4px_4px_0px_0px_#2D2D2D] bg-white">
                {/* Maintain your existing logic mapping for Beginner/Intermediate/Advanced */}
                {level === "Beginner (Year 1)" && [5, 8, 12, 16].map(num => (
                  <DropdownMenuItem key={num} onClick={() => setMinExchanges(num)} className="focus:bg-[#74C0FC]">{num} Exchanges</DropdownMenuItem>
                ))}
                {level === "Intermediate (Year 2)" && [6, 10, 14, 18].map(num => (
                  <DropdownMenuItem key={num} onClick={() => setMinExchanges(num)} className="focus:bg-[#B2F2BB]">{num} Exchanges</DropdownMenuItem>
                ))}
                {level !== "Beginner (Year 1)" && level !== "Intermediate (Year 2)" && [8, 12, 16, 20, 24].map(num => (
                  <DropdownMenuItem key={num} onClick={() => setMinExchanges(num)} className="focus:bg-[#FF914D]">{num} Exchanges</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full h-14 bg-[#2D2D2D] text-white border-2 border-[#2D2D2D] rounded-xl shadow-[4px_4px_0px_0px_#74C0FC] hover:bg-[#2D2D2D] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-black uppercase tracking-widest text-lg">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Launch Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}