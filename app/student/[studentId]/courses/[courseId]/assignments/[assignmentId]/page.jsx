"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MessageSquare, 
  Target, 
  PlayCircle, 
  Eye, 
  Clock,
  Loader2,
  UserCircle2,
  RotateCcw,
  Trash2, // Added for reset
  AlertTriangle, // Added for warning
  Trash,
  Trash2Icon,
  TrashIcon,
  ArrowBigRightIcon
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

  const AVATARS = ['/f1.png', '/m1.jpg', '/f2.png', '/m2.png'];

  const [resetting, setResetting] = useState(false);

  useEffect(() => {
      


    const fetchAssignmentAndStatus = async () => {
      try {
        setLoading(true);

        // 1. Fetch Assignment Details (joined with course for language)
        const { data: assignmentData, error: aError } = await supabase
          .from("assignments")
          .select("*, courses(language)")
          .eq("id", assignmentId)
          .single();

        if (aError) throw aError;
        setAssignment(assignmentData);

        // 2. Fetch Submission Status
        const { data: submissionData } = await supabase
          .from("submissions")
          .select("id, status, current_exchange_count, character_id")
          .eq("assignment_id", assignmentId)
          .eq("student_id", studentId)
          .maybeSingle();

        setSubmission(submissionData);
        if (submissionData) setSelectedCharacter(submissionData.character_id);

        // 3. Fetch Characters filtered by course language
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
}, [selectedCharacter, characters])


    const handleRestartAssignment = async () => {
      if (!submission || resetting) return;
      setResetting(true);

      try {
        // 🔥 DELETE the submission to reset the entire page state
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq("id", submission.id);

        if (error) throw error;

        // 1. Clear local states so the UI reacts immediately
        setSubmission(null);
        setSelectedCharacter("");
        setAvatarPath(null);
        
       
        
      } catch (err) {
        console.error("Failed to reset assignment:", err.message);
        alert("Could not reset the assignment. Please try again.");
      } finally {
        setResetting(false);
      }
    };


  const handleStartAssignment = async () => {
  if (!selectedCharacter || starting) return;
  setStarting(true);

  try {
    const { data, error } = await supabase
      .from('submissions')
      .upsert({
        student_id: studentId,
        assignment_id: assignmentId,
        character_id: selectedCharacter,
        status: 'in_progress',
        chat_history: [] // Only reset history if you want a fresh start here
      }, {
        onConflict: 'student_id, assignment_id' // Tells Supabase which columns to check for duplicates
      })
      .select()
      .single();

    if (error) throw error;
    
    // Use the avatar path logic you already have
    router.push(`/student/${studentId}/courses/${courseId}/assignments/${assignmentId}/chat?v=${avatarPath}`);
  } catch (err) {
    console.error("Failed to start:", err.message);
    setStarting(false);
  }
};
  if (loading) return <div className="p-10 text-center animate-pulse">Loading assignment...</div>;
  if (!assignment) return <div className="p-10 text-center text-red-500">Assignment not found.</div>;

  const getButtonConfig = () => {
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
        icon: <ArrowBigRightIcon className="mr-2 h-5 w-5 hover:animate-pulse" />, 
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

  const config = getButtonConfig();

  
  return (
    <div className="p-8 max-w-4xl mx-auto mt-12">
      <Link 
        href={`/student/${studentId}/courses/${courseId}`}
        className="flex items-center gap-2 text-gray-500 hover:text-black mb-8 w-fit transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Course
      </Link>

      <div className="grid gap-8 ">
        <div className="md:col-span-2 space-y-6">
          <div>
            <Badge className="mb-2 bg-blue-100 text-md text-blue-700 hover:bg-orange-100 border-none px-4 py-1">
              {assignment.topic}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">{assignment.title}</h1>
            <p className="text-lg text-gray-600 leading-relaxed border-l-4 border-blue-600 pl-4">
              {assignment.scenario}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Required Depth</span>
                </div>
                <p className="text-xl font-bold">{assignment.min_exchanges} Exchanges</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Difficulty Level</span>
                </div>
                <p className={`text-xl ${assignment.difficulty === "Standard" ? "text-black" : "text-red-500"} font-bold`}>{assignment.difficulty}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-gray-400">
                {submission ? "Partner Selected" : "Choose your LinguaBuddy"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <div className={`h-3 w-3 rounded-full ${!submission ? 'bg-gray-300' : submission.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="font-bold capitalize">{submission?.status?.replace('_', ' ') || "Not Started"}</span>
              </div>

              {/* Tabs for Character Selection */}
              <div className="mb-8">
                <Tabs 
                  value={selectedCharacter} 
                  onValueChange={submission ? undefined : setSelectedCharacter}
                  className="w-full"
                >
                  <TabsList className={`grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-gray-100 ${submission ? 'opacity-60 grayscale' : ''}`}>
                    {characters.map((char, index) => (
                      <TabsTrigger 
                        key={char.character_id} 
                        value={char.character_id}
                        disabled={!!submission && submission.character_id !== char.character_id}
                        className="flex flex-col gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-transparent data-[state=active]:border-blue-500">
                        <img 
                        src={AVATARS[index % AVATARS.length]} 
                        alt={char.character_id}
                        className="object-cover"
                            />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{char.character_id}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {selectedCharacter && (
                    <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-1">
                      <p className="text-sm text-green-800 leading-tight">
                        <span className="font-bold italic uppercase mr-2">{selectedCharacter}:</span>
                        {characters.find(c => c.character_id === selectedCharacter)?.public_char_desc}
                      </p>
                    </div>
                  )}
                </Tabs>
              </div>
              
             <div className="flex w-full items-stretch gap-0 rounded-xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {/* Main Action Button (Start/Resume/View) */}
              <Button 
                onClick={config.action} 
                variant={config.variant} 
                disabled={config.disabled}
                className="flex-1 h-14 text-md font-bold rounded-none border-none shadow-none transition-all active:scale-[0.98]"
              >
                {config.text}
                {config.icon}
              </Button>

              {/* Thin Vertical Divider (only if submission exists) */}
              {submission && <div className="w-[2px] bg-black opacity-20" />}

              {/* Small Restart Trigger */}
              {submission && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-21 h-14 bg-red-100 text-red-500 hover:text-red-700 hover:bg-red-200 rounded-none border-none p-0 flex items-center justify-center"
                      disabled={resetting}
                      title="Restart Assignment"
                    >
                      {resetting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-5 w-5" /> 
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
                        <RotateCcw className="h-6 w-6 text-red-500" />
                        Start Over?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600 text-base">
                        This will <span className="font-bold text-red-600">delete your current conversation</span> with {submission.character_id}. 
                        You will be able to select a new partner and start from the beginning.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="border-2 border-black font-bold">
                        Keep Progress
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleRestartAssignment}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Yes, Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            </CardContent>
            <CardFooter className="bg-gray-50 flex flex-col items-start gap-2 py-4">
               <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                    Due: {assignment.due_at 
                    ? new Date(assignment.due_at).toLocaleDateString() 
                    : "No deadline"}
                </span>
                </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}