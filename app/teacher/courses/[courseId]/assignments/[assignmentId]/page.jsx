"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  MessageSquare, 
  BookOpen,  
  Clock, 
  Loader2, 
  Brain
} from "lucide-react";

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();

        if (error) throw error;
        setAssignment(data);
      } catch (err) {
        console.error("Error fetching assignment:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) fetchAssignment();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assignment) return <div className="p-8 text-center">Assignment not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="gap-2 -ml-2 text-gray-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Course
      </Button>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{assignment.title}</h1>
            <Badge variant={assignment.difficulty === "Challenging" ? "destructive" : "secondary"}>
              {assignment.difficulty}
            </Badge>
          </div>
          <p className="text-lg text-gray-500 font-medium">{assignment.topic}</p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-bold">{assignment.min_exchanges}</span> Messages Required
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Scenario Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {assignment.scenario}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold">Vocabulary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {assignment.vocabulary || "No specific vocabulary listed."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <Brain className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-semibold">Grammar Concepts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {assignment.grammar || "No specific grammar concepts listed."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Timeline/Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Assignment Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Opens</p>
                  <p className="text-sm font-medium">
                    {new Date(assignment.start_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-red-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-sm font-medium text-red-600">
                    {assignment.due_at ? new Date(assignment.due_at).toLocaleString() : "No deadline"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}