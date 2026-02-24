"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import confetti from "canvas-confetti";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  MessageSquare, 
  ArrowLeft, 
  CheckCircle2, 
  Star,
  Download,
  Home,
  TrendingUp,
  ScrollIcon
} from "lucide-react";
import Link from "next/link";

export default function AssignmentResultsPage() {
  const { studentId, courseId, assignmentId } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState({ assignment: null, submission: null, courses: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data: submission, error: sError } = await supabase
          .from("submissions")
          .select(`*, assignments (topic, title, difficulty, courses!assignments_course_id_fkey ( language, level ))`)
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .single();

        if (sError) throw sError;
        
        setData({ 
          assignment: submission.assignments, 
          courses: submission.assignments.courses, 
          submission: submission 
        });

        // Trigger Confetti on success
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD966', '#22C55E', '#3B82F6']
        });

      } catch (err) {
        console.error("Error loading results:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [assignmentId, studentId]);

  if (loading) return <div className="p-10 text-center animate-pulse font-bold text-gray-500 text-xl">Analyzing results...</div>;
  if (!data.submission) return <div className="p-10 text-center text-red-500 font-bold border-2 border-red-500 rounded-xl m-8">No submission found.</div>;

  const { submission, assignment } = data;

  const parseFeedback = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch (e) {
        return data.split(/[•\n\r*]+/).map(item => item.trim()).filter(item => item.length > 0);
      }
    }
    return [data.toString()];
  };

  const posArray = parseFeedback(submission.pos_feedback);
  const negArray = parseFeedback(submission.neg_feedback);

  return (
    <div className="min-h-screen bg-[#FEFAF2] pb-12 text-[#2D2D2D]">
      {/* Merged Header Section - Matches Teacher View */}
      <div className="bg-[#FEFAF2] pt-12 pb-8 px-8 border-b-2 border-[#2D2D2D]/10">
        <div className="max-w-4xl mx-auto">
          <Link 
            href={`/student/${studentId}/courses/${courseId}?tab=progress`}
            className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-sm uppercase font-black">Back to My Progress</span>
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-100 text-green-700 border-none">Completed</Badge>
                <span className="text-gray-400 text-sm">•</span>
                <span className="text-gray-800 text-sm font-semibold">
                  Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight uppercase leading-none">{assignment.title}</h1>
              <p className="text-gray-500 mt-2 italic font-bold">Conversation with {submission.character_id}</p>
            </div>

            <div className="bg-[#FFD966] p-4 px-6 rounded-2xl shadow-[4px_4px_0px_0px_#2D2D2D] border-2 border-[#2D2D2D] flex items-center gap-4 mt-6 md:mt-0">
              <Trophy className="h-8 w-8 text-[#2D2D2D]" />
              <p className="text-xl font-black text-[#2D2D2D] uppercase tracking-tighter">Assignment Complete!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 grid gap-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            icon={<MessageSquare className="text-blue-500" />} 
            label="Exchanges" 
            value={submission.current_exchange_count} 
          />
          <StatCard 
            icon={<Star className="text-orange-500" />} 
            label="Difficulty" 
            value={assignment.difficulty} 
          />
        </div>

        {/* Feedback Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            icon={<CheckCircle2 className="text-green-500" />} 
            label="Strengths" 
            sub="Keep doing this!"
            value={
              <ul className="space-y-2 mt-2">
                {posArray.length > 0 ? (
                  posArray.map((item, i) => (
                    <li key={i} className="text-sm font-semibold leading-relaxed flex gap-2">
                      <span className="text-green-500">•</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 italic">No feedback available.</li>
                )}
              </ul>
            } 
          />

          <StatCard
            icon={<TrendingUp className="text-red-500" />} 
            label="Improvements" 
            sub="Focus on these next"
            value={
              <ul className="space-y-2 mt-2">
                {negArray.length > 0 ? (
                  negArray.map((item, i) => (
                    <li key={i} className="text-sm font-semibold leading-relaxed flex gap-2">
                      <span className="text-red-500">•</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 italic">No feedback available.</li>
                )}
              </ul>
            } 
          />
        </div>

        {/* Chat Transcript */}
        <Card className="border-2 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D] rounded-[24px] overflow-hidden">
          <CardHeader className="border-b-2 border-[#2D2D2D] bg-white">
            <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
              <ScrollIcon className="h-5 w-5 text-gray-500" />
              Conversation Transcript
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto bg-white">
            <div className="divide-y-2 divide-gray-100">
              {submission.chat_history.map((msg, idx) => (
                <div key={idx} className="p-4 flex gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className={`text-[10px] font-black uppercase w-16 pt-1 flex-shrink-0 ${msg.role === 'user' ? 'text-orange-600' : 'text-blue-600'}`}>
                    {msg.role === 'user' ? 'You' : submission.character_id}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed font-bold">
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-2 border-[#2D2D2D] font-black shadow-[2px_2px_0px_0px_#2D2D2D] rounded-xl"
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" /> Save as PDF
          </Button>
          <Button 
            className="w-full sm:w-auto bg-[#2D2D2D] text-white px-8 font-black rounded-xl hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all"
            onClick={() => router.push(`/student/${studentId}/courses/${courseId}`)}
          >
            <Home className="mr-2 h-4 w-4" /> Return to Course
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <Card className="border-2 border-[#2D2D2D] shadow-[4px_4px_0px_0px_#2D2D2D] rounded-[24px]">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          {icon}
          <span className="text-xs font-black uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-xl font-black">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-2 font-bold uppercase">{sub}</p>}
      </CardContent>
    </Card>
  );
}