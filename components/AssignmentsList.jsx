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
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function AssignmentsList({ assignments }) {
    const params = useParams();
  const courseId = params.courseId;

  if (!assignments || assignments.length === 0) return null;

  const now = new Date();

  // ✅ 1. Categorize Assignments
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

  // ✅ 2. Sub-component for the Assignment Card to keep code DRY
  const AssignmentCard = ({ assignment }) => {
    const dueDate = assignment.due_at 
      ? new Date(assignment.due_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
      : "No deadline";

    const startDate = new Date(assignment.start_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
      <Card key={assignment.id} className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-black">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <Badge variant={assignment.difficulty === "Challenging" ? "destructive" : "secondary"} className={assignment.difficulty === "Standard" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" : ""}>
              {assignment.difficulty}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <MessageSquare className="h-3 w-3" />
              {assignment.min_exchanges} msgs req.
            </div>
          </div>
          <CardTitle className="text-xl font-bold">{assignment.title}</CardTitle>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{assignment.topic}</p>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-2 italic mb-4">"{assignment.scenario}"</p>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Opens: {startDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-red-400" />
              <span>Due: {dueDate}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50 border-t p-3">
          <Link href={`/teacher/courses/${courseId}/assignments/${assignment.id}`} className="w-full">
            <Button variant="ghost" className="w-full justify-between hover:bg-gray-100 group">
                <span className="text-sm font-semibold">View Course</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            </Link>
        </CardFooter>
      </Card>
    );
  };

  
  return (
    <div className="space-y-10">
      {/* Active Section */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center italic gap-2 mb-4 text-green-600">
            <PlayCircle className="h-5 w-5" />
            <h3 className="font-semibold tracking-tight text-lg">Active Assignments</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center italic gap-2 mb-4 text-blue-600">
            <CalendarDays className="h-5 w-5" />
            <h3 className="font-semibold tracking-tight text-lg">Upcoming</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}

      {/* Past Section */}
      {past.length > 0 && (
        <section className="opacity-75"> {/* Dim past assignments slightly */}
          <div className="flex items-center italic gap-2 mb-4 text-gray-600">
            <History className="h-5 w-5" />
            <h3 className="font-semibold tracking-tight text-lg">Past Assignments</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {past.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}