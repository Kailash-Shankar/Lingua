"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, MessageSquare, PlayCircle, Eye, Clock, Loader2, 
  RotateCcw, Lock, ArrowBigRightIcon, 
  SpellCheck,
  Cog,
  MessageCircle
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

export default function StudentAssignmentView() {
  const { studentId, courseId, assignmentId } = useParams();
  const router = useRouter();
  
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [avatarPath, setAvatarPath] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [isLocked, setIsLocked] = useState({ locked: false, reason: "" });

  const AVATARS = ['/f1.png', '/m1.jpg', '/f2.png', '/m2.png'];

  useEffect(() => {
    const fetchAssignmentAndStatus = async () => {
      try {
        setLoading(true);
        const { data: assignmentData, error: aError } = await supabase
        .from("assignments")
        .select(`*, courses!assignments_course_id_fkey ( language, level )`) 
        .eq("id", assignmentId)
        .single();

        if (aError) throw aError;
        setAssignment(assignmentData);

        const now = new Date().getTime();
        const startRaw = assignmentData.start_at;
        const dueRaw = assignmentData.due_at;
        
        const startTime = new Date(startRaw).getTime();
        const dueTime = new Date(dueRaw).getTime();

        if (startTime && now < startTime) {
          setIsLocked({ 
            locked: true, 
            reason: `Assignment opens ${new Date(startTime).toLocaleDateString()} at ${new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
          });
        } else if (dueTime && now > dueTime) {
          setIsLocked({ 
            locked: true, 
            reason: "This assignment is now closed." 
          });
        } else {
          setIsLocked({ locked: false, reason: "" });
        }

        const { data: submissionData } = await supabase
          .from("submissions")
          .select("id, status, current_exchange_count, character_id")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .maybeSingle();

        setSubmission(submissionData);
        if (submissionData) setSelectedCharacter(submissionData.character_id);

        const { data: charData } = await supabase
          .from("characters")
          .select("character_id, public_char_desc, order")
          .eq("language", assignmentData.courses.language)
          .order("order", { ascending: true });

        setCharacters(charData || []);
      } catch (err) {
        console.error("Error loading assignment:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId && studentId) fetchAssignmentAndStatus();
  }, [assignmentId, studentId]);

  useEffect(() => {
    if (selectedCharacter && characters.length > 0) {
      const char = characters.find(c => c.character_id === selectedCharacter);
      if (char) {
        const num = parseInt(char.order) - 1;
        setAvatarPath(AVATARS[num % AVATARS.length]);
      }
    }
  }, [selectedCharacter, characters]);

  const getButtonConfig = () => {
    if (isLocked.locked && submission?.status !== "completed") {
      return {
        text: isLocked.reason === "This assignment is now closed." ? "Assignment Closed" : "Assignment Locked",
        icon: <Lock className="mr-2 h-5 w-5" />,
        variant: "destructive",
        disabled: true,
        action: () => {}
      };
    }

    if (!submission) {
      return { 
        text: "Start Assignment", 
        icon: starting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />, 
        variant: "default",
        disabled: !selectedCharacter || starting,
        action: handleStartAssignment
      };
    }
    if (submission.status === "in_progress") {
      return { 
        text: "Resume Assignment", 
        icon: <ArrowBigRightIcon className="mr-2 h-5 w-5" />, 
        variant: "secondary",
        disabled: false,
        action: () => router.push(`/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/chat?v=${avatarPath}`),
      };
    }
    return { 
      text: "View Results", 
      icon: <Eye className="mr-2 h-5 w-5" />, 
      variant: "outline",
      disabled: false,
      action: () => router.push(`/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/results`)
    };
  };

  const handleStartAssignment = async () => {
    if (!selectedCharacter || starting || isLocked.locked) return;
    setStarting(true);
    try {
      await supabase
        .from('submissions')
        .upsert({
          student_id: studentId,
          assignment_id: assignmentId,
          character_id: selectedCharacter,
          status: 'in_progress',
          chat_history: []
        }, { onConflict: 'student_id, assignment_id' });

      router.push(`/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/chat?v=${avatarPath}`);
    } catch (err) {
      setStarting(false);
    }
  };

  const handleRestartAssignment = async () => {
    if (!submission || resetting || isLocked.locked) return;
    setResetting(true);
    try {
      await supabase
        .from('submissions')
        .update({ status: 'not_started', chat_history: [], current_exchange_count: 0 })
        .eq("id", submission.id);
      setSubmission(null);
      setSelectedCharacter("");
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading assignment...</div>;
  if (!assignment) return <div className="p-10 text-center text-red-500">Assignment not found.</div>;

  const config = getButtonConfig();

  return (
    <div className="p-8 max-w-4xl mx-auto mt-12">
      <Link href={`/student/${studentId}/courses/${courseId}`} className="flex items-center gap-2 text-gray-500 hover:text-black mb-8 w-fit text-md uppercase tracking-widest font-black">
        <ArrowLeft className="h-5 w-5" /> Back to Course
      </Link>

      <div className="grid gap-8">
        <div className="md:col-span-2 space-y-8">
          {isLocked.locked && (
            <div className="bg-red-50 border-2 border-black p-4 rounded-xl flex items-center gap-3 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-red-500 p-2 rounded-lg">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <span className="text-red-900">{isLocked.reason}</span>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <div className="inline-block px-4 py-1 bg-blue-600 text-white font-bold rounded-full text-xs uppercase tracking-widest mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {assignment.topic}
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-6 text-black">
                {assignment.title}
              </h1>
              
              <div className="relative bg-white border-2 border-black p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(59,130,246,1)]">
                <div className="absolute -top-3 -left-3 bg-blue-600 text-white p-2 rounded-lg border-2 border-black">
                  <MessageCircle size={20} />
                </div>
                <p className="text-xl text-gray-800 font-medium leading-relaxed italic">
                  "{assignment.scenario}"
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {assignment.grammar && (
                <div className="bg-purple-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(168,85,247,1)]">
                  <div className="flex items-center gap-2 mb-3 text-purple-700">
                    <Cog size={20} />
                    <h2 className="text-lg font-black uppercase tracking-tight">Grammar Focus</h2>
                  </div>
                  <p className="text-gray-700 font-bold leading-snug">{assignment.grammar}</p>
                </div>
              )}

              {assignment.vocabulary && (
                <div className="bg-amber-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
                  <div className="flex items-center gap-2 mb-3 text-amber-700">
                    <SpellCheck size={20} />
                    <h2 className="text-lg font-black uppercase tracking-tight">Key Vocabulary</h2>
                  </div>
                  <p className="text-gray-700 font-bold leading-snug">{assignment.vocabulary}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest opacity-70 text-left">
                {submission ? "LinguaBuddy Selected" : "Choose your LinguaBuddy"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <Tabs value={selectedCharacter} onValueChange={submission || isLocked.locked ? undefined : setSelectedCharacter}>
                  <TabsList className={`grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-2 bg-gray-100 border-2 border-black rounded-xl gap-2 ${(submission || isLocked.locked) ? 'opacity-100' : ''}`}>
                    {characters.map((char, index) => (
                      <TabsTrigger 
                        key={char.character_id} 
                        value={char.character_id} 
                        disabled={!!submission || isLocked.locked}
                        className="flex flex-col gap-2 p-3 rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[3px_3px_0px_0px_#FFD966]"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-full border border-black/10">
                          <img src={AVATARS[index % AVATARS.length]} alt={char.character_id} className="object-cover h-full w-full" />
                        </div>
                        <span className="text-[12px] font-black uppercase tracking-tighter">{char.character_id}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="mb-6 mt-4 min-h-[80px]">
                {selectedCharacter && (
                  <div className="p-5 bg-gray-50 border-2 border-black rounded-2xl shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.05)] animate-in fade-in duration-200">
                    <p className="text-sm font-bold leading-relaxed italic opacity-80">
                      <span className="uppercase tracking-widest text-black not-italic mr-2 font-black">{selectedCharacter}:</span>
                      {characters.find(c => c.character_id === selectedCharacter)?.public_char_desc}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex w-full items-stretch gap-0 rounded-xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Button 
                  onClick={config.action} 
                  variant={config.variant} 
                  disabled={config.disabled}
                  className="flex-1 h-14 text-sm font-black uppercase tracking-widest rounded-none"
                >
                  {config.text}
                  {config.icon}
                </Button>

                {submission && !isLocked.locked && submission.status !== 'completed' && (
                  <>
                    <div className="w-[2px] bg-black opacity-20" />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="w-20 h-14 bg-red-100 text-red-500 rounded-none border-none hover:bg-red-200 transition-colors">
                          <RotateCcw className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
                            <RotateCcw className="h-6 w-6 text-red-500" />
                            Start Over?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-black font-bold text-base opacity-70">
                            This will delete your current conversation. You cannot undo this action.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                          <AlertDialogCancel className="border-2 border-black font-black uppercase text-xs rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRestartAssignment} className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">Reset</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t-2 border-black flex items-center justify-between py-4 px-6">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40">
                <Clock className="h-3.5 w-3.5" />
                <span>Starts: {assignment.start_at ? new Date(assignment.start_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}