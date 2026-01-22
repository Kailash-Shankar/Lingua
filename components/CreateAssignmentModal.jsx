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
import { PlusCircle, Loader2, AlertCircle, Zap, Shield, ChevronDown, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function CreateAssignmentModal({ courseId, level, onAssignmentCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [minExchanges, setMinExchanges] = useState(0);
  const [difficulty, setDifficulty] = useState("Standard");

  const getLocalDatetimeString = () => {
    const now = new Date();
    // Offset minutes to get local time for the input value
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
    const startAtUTC = new Date(startAt).toISOString();
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
      // Reset logic
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
        <Button className="bg-black text-white hover:bg-gray-800">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Chat Assignment</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm border border-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title & Difficulty stay the same... */}
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title</Label>
            <Input id="title" name="title" placeholder="e.g. ¡Vamos al centro comercial!" required />
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <div className="flex p-1 bg-gray-100 rounded-lg gap-1">
              <Button 
                type="button"
                onClick={() => setDifficulty("Standard")}
                className={`flex-1 gap-2 transition-all ${difficulty === "Standard" ? "bg-white text-blue-600 shadow-sm hover:bg-white" : "bg-transparent text-gray-500 hover:bg-gray-200"}`}
                variant="ghost"
              >
                Standard
              </Button>
              <Button 
                type="button"
                onClick={() => setDifficulty("Challenging")}
                className={`flex-1 gap-2 transition-all ${difficulty === "Challenging" ? "bg-white text-red-600 shadow-sm hover:bg-white" : "bg-transparent text-gray-500 hover:bg-gray-200"}`}
                variant="ghost"
              >
                <Zap className="h-4 w-4" />
                Challenging
              </Button>
            </div>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-2 gap-4 border-y py-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="startAt" className="flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Start Date
              </Label>
              <Input 
                id="startAt" 
                type="datetime-local" 
                value={startAt}
                min={getLocalDatetimeString()} // ✅ Earliest is current time
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt" className="flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Due Date
              </Label>
              <Input 
                id="dueAt" 
                type="datetime-local" 
                value={dueAt}
                min={getLocalDatetimeString()} // ✅ Must be after start date
                onChange={(e) => setDueAt(e.target.value)}
              />
              <p className="text-[12px] text-gray-500 italic">Leave empty for no deadline.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic/Theme</Label>
            <Input id="topic" name="topic" placeholder="e.g. Ir de compras" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario">Description</Label>
            <Textarea 
              id="scenario" 
              name="scenario" 
              placeholder="Describe the scenario..." 
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-3 flex flex-col">
            <Label>Minimum Required Exchanges</Label>
            <p className="text-[12px] text-gray-500 -mt-1">
            The number of messages a student must send to complete the assignment.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between bg-white border-gray-300">
                  {minExchanges ? `${minExchanges} Exchanges` : "Select requirement..."}
                  <ChevronDown className="h-4 w-4 opacity-50" /> 
                </Button>
              </DropdownMenuTrigger>
              
              {level === "Beginner (Year 1)" ? (
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => setMinExchanges(5)}>
                    5 Exchanges (Quick Practice)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(8)}>
                    8 Exchanges (Standard)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(12)}>
                    12 Exchanges (In-Depth)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(16)}>
                    16 Exchanges (Extended)
                </DropdownMenuItem>
              </DropdownMenuContent>


                ) : (level === "Intermediate (Year 2)" ? (
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => setMinExchanges(6)}>
                    6 Exchanges (Quick Practice)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(10)}>
                    10 Exchanges (Standard)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(14)}>
                    14 Exchanges (In-Depth)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(18)}>
                    18 Exchanges (Extended)
                </DropdownMenuItem>
              </DropdownMenuContent>
                ) : (
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onClick={() => setMinExchanges(8)}>
                    8 Exchanges (Quick Practice)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(12)}>
                    12 Exchanges (Standard)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(16)}>
                    16 Exchanges (In-Depth)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(20)}>
                    20 Exchanges (Extended)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMinExchanges(24)}>
                    24 Exchanges (Super Extended)
                </DropdownMenuItem>
              </DropdownMenuContent>
              ))}
            </DropdownMenu>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-gray-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Launch Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}