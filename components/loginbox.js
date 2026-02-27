"use client"

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Mail, GraduationCap, BookOpen, User, Lock, Hash } from "lucide-react";
import { 
  InputGroup, 
  InputGroupAddon, 
  InputGroupInput 
} from "@/components/ui/input-group";
import { Button } from "./ui/button";

export function Loginbox({ isSignup = true }) {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search params for display messages
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_role: role,
            student_id: role === "student" ? studentId : null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setErrorMsg(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.refresh(); 
        const targetPath = data.user.user_metadata.user_role === 'teacher' 
          ? "/teacher/dashboard" 
          : `/student/${data.user.id}/dashboard`;
        router.push(targetPath);
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleAuth} className="flex flex-col gap-4 w-full max-w-md p-8 border-2 border-[#2D2D2D] rounded-lg shadow-[8px_8px_0px_0px_#2D2D2D] bg-white">
      
      <h1 className="text-4xl font-black uppercase tracking-tighter text-center text-[#2D2D2D]">
        Lingua <span className={isSignup ? "text-blue-500" : "text-[#FF914D]"}>
          {isSignup ? "Sign Up" : "Login"}
        </span>
      </h1>

      {(error || errorMsg) && (
        <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200 text-center">
          {error || errorMsg}
        </p>
      )}
      {message && <p className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200 text-center">{message}</p>}

      {isSignup && (
        <div className="space-y-3">
          <p className="text-lg font-heading font-medium text-black">I am a:</p>
          <RadioGroup defaultValue="student" onValueChange={(value) => setRole(value)} className="flex gap-4">
            <div className="flex-1">
              <RadioGroupItem value="student" id="student" className="peer sr-only" />
              <Label htmlFor="student" className="flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all cursor-pointer border-slate-200 bg-white peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50">
                <GraduationCap className={`h-6 w-6 mb-2 ${role === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="font-bold">Student</span>
              </Label>
            </div>
            <div className="flex-1">
              <RadioGroupItem value="teacher" id="teacher" className="peer sr-only" />
              <Label htmlFor="teacher" className="flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all cursor-pointer border-slate-200 bg-white peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50">
                <BookOpen className={`h-6 w-6 mb-2 ${role === 'teacher' ? 'text-green-600' : 'text-slate-400'}`} />
                <span className="font-bold">Teacher</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="space-y-4">
        <InputGroup>
          <InputGroupInput 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            type="email" placeholder="Email address" required 
          />
          <InputGroupAddon><Mail className="h-4 w-4 text-gray-500" /></InputGroupAddon>
        </InputGroup>

        <InputGroup>
          <InputGroupInput 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            type="password" placeholder="Password" required 
          />
          <InputGroupAddon><Lock className="h-4 w-4 text-gray-500" /></InputGroupAddon>
        </InputGroup>

        {isSignup && (
          <>
            <div className="flex gap-4">
              <InputGroup>
                <InputGroupInput 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="First Name" required 
                />
                <InputGroupAddon><User className="h-4 w-4 text-gray-500" /></InputGroupAddon>
              </InputGroup>
              <InputGroup>
                <InputGroupInput 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Last Name" required 
                />
              </InputGroup>
            </div>

            {role === "student" && (
              <InputGroup>
                <InputGroupInput 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  placeholder="Student ID Number" required 
                />
                <InputGroupAddon><Hash className="h-4 w-4 text-gray-500" /></InputGroupAddon>
              </InputGroup>
            )}
          </>
        )}
      </div>

      <div className="mt-4 active:translate-x-[2px] active:translate-y-[2px] transition-all">
        <Button 
          type="submit" 
          disabled={loading}
          className={`w-full h-12 border-2 border-[#2D2D2D] font-black uppercase shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${isSignup ? (role == 'student' ? 'bg-blue-500' : 'bg-green-600') : 'bg-[#FF914D]'}`}
        >
          {loading ? "Processing..." : (isSignup ? `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`  : "Log In")}
        </Button>
      </div>
    </form>
  );
}