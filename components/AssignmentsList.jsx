"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Clock, 
  ChevronRight, 
  CalendarDays,
  History,
  PlayCircle,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function AssignmentsList({ assignments }) {
  const params = useParams();
  const courseId = params.courseId;

  if (!assignments || assignments.length === 0) return null;

  const now = new Date();

  // ✅ 1. Categorize Assignments (Logic Preserved)
  const active = assignments.filter(a => {
    const start = new Date(a.start_at);
    const due = a.due_at ? new Date(a.due_at) : null;
    return start <= now && (!due || due >= now);
  });

  const upcoming = assignments.filter(a => new Date(a.start_at) > now);

  const past = assignments.filter(a => {
    const due = a.due_at ? new Date(a.due_at) : null;
    return due && due < now;
  });

  // ✅ 2. Restyled Assignment Card
  const AssignmentCard = ({ assignment }) => {
    const dueDate = assignment.due_at 
      ? new Date(assignment.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
      : "No deadline";

    const startDate = new Date(assignment.start_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isChallenge = assignment.difficulty === "Challenging" || assignment.difficulty === "Challenge";

    return (
      <Card className="bg-white border-2 border-[#2D2D2D] rounded-[28px] shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex flex-col overflow-hidden group">
        <CardHeader className="p-5 pb-3">
          <div className="flex justify-between items-start mb-3">
            <div className={`px-3 py-1 border-2 border-[#2D2D2D] rounded-full text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#2D2D2D] ${
              isChallenge ? "bg-[#FFADAD]" : "bg-[#B2F2BB]"
            }`}>
              {isChallenge && <Zap className="h-3 w-3 mr-1 inline-block" />}
              {assignment.difficulty}
            </div>
            <div className="flex items-center gap-1.5 bg-[#F5F5F5] border-2 border-[#2D2D2D] px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[9px] font-black uppercase">{assignment.exchanges}</span>
            </div>
          </div>
          <CardTitle className="text-xl font-black uppercase tracking-tight leading-tight">{assignment.title}</CardTitle>
          <p className="text-[10px] font-black text-[#2D2D2D]/40 uppercase tracking-widest mt-1">{assignment.topic}</p>
        </CardHeader>
        
        <CardContent className="px-5 py-0 flex-grow">
          <p className="text-sm font-bold text-[#2D2D2D]/60 line-clamp-2 mb-4 leading-relaxed">{assignment.scenario}</p>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 bg-[#F5F5F5] border border-[#2D2D2D]/10 p-2 rounded-xl text-[10px] font-bold">
              <Clock className="h-3 w-3 text-green-500" />
              <span className="opacity-60 uppercase">Opens:</span> {startDate}
            </div>
            <div className="flex items-center gap-2 bg-[#F5F5F5] border border-[#2D2D2D]/10 p-2 rounded-xl text-[10px] font-bold">
              <Clock className="h-3 w-3 text-red-400" />
              <span className="opacity-60 uppercase">Due:</span> {dueDate}
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-0 border-t-2 border-[#2D2D2D]">
          <Link 
            href={params.studentId ? `/student/${params.studentId}/courses/${courseId}/assignments/${assignment.id}` : `/teacher/courses/${courseId}/assignments/${assignment.id}`} 
            className="w-full"
          >
            <Button variant="ghost" className="w-full h-16 rounded-none justify-between bg-white hover:bg-[#FFD966] transition-colors group px-5">
                <span className="text-xs font-black uppercase tracking-widest">Open Assignment</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            </Link>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-12">
      {/* Active Section */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 text-[#2D2D2D]">
            <div className="p-1.5 bg-[#B2F2BB] border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <PlayCircle className="h-4 w-4" />
            </div>
            <h3 className="font-bold italic  tracking-tight text-xl">Active Assignments</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {active.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 text-[#2D2D2D]">
            <div className="p-1.5 bg-[#74C0FC] border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h3 className="font-bold italic uppercase tracking-tight text-xl">Upcoming Assignments</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}

      {/* Past Section */}
      {past.length > 0 && (
        <section className="opacity-60 grayscale-[0.5]">
          <div className="flex items-center gap-2 mb-6 text-[#2D2D2D]">
            <div className="p-1.5 bg-[#F5F5F5] border-2 border-[#2D2D2D] rounded-lg shadow-[2px_2px_0px_0px_#2D2D2D]">
              <History className="h-4 w-4" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-xl">Past Assignments</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}