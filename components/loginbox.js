"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Key, Mail, GraduationCap, BookOpen } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signup, login } from "@/actions/auth"; // Ensure this path is correct!
import { SubmitButton } from "./submitButton"; 

export function Loginbox({ isSignup = true }) {
  const [role, setRole] = useState("student");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  return (
    /* ✅ Remove any 'action' from the form tag itself since we use formAction on the button */
    <form className="flex flex-col gap-4 w-full max-w-md p-8 border rounded-lg shadow-sm bg-white">
      <h1 className="text-4xl font-heading font-bold text-center text-blue-500">
        Lingua {isSignup ? "Sign Up" : "Login"}
      </h1>

      {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200 text-center">{error}</p>}
      {message && <p className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200 text-center">{message}</p>}

      {isSignup && (
        <div className="space-y-3">
          <p className="text-lg font-heading font-medium text-black">I am a:</p>
          <RadioGroup name="role" defaultValue="student" onValueChange={(value) => setRole(value)} className="flex gap-4">
            <div className="flex-1">
              <RadioGroupItem value="student" id="student" className="peer sr-only" />
              <Label htmlFor="student" className="flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all cursor-pointer border-slate-200 bg-white peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50">
                <GraduationCap className={`h-6 w-6 mb-2 ${role === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-heading text-md font-bold ${role === 'student' ? 'text-blue-700' : 'text-slate-900'}`}>Student</span>
              </Label>
            </div>
            <div className="flex-1">
              <RadioGroupItem value="teacher" id="teacher" className="peer sr-only" />
              <Label htmlFor="teacher" className="flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all cursor-pointer border-slate-200 bg-white peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50">
                <BookOpen className={`h-6 w-6 mb-2 ${role === 'teacher' ? 'text-green-600' : 'text-slate-400'}`} />
                <span className={`font-heading text-md font-bold ${role === 'teacher' ? 'text-green-700' : 'text-slate-900'}`}>Teacher</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="space-y-4">
        <InputGroup>
          <InputGroupInput className="text-black" name="email" type="email" placeholder="Email address" required />
          <InputGroupAddon><Mail className="h-4 w-4 text-gray-500" /></InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput className="text-black" name="password" type="password" placeholder="Password" required />
          <InputGroupAddon><Key className="h-4 w-4 text-gray-500" /></InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-4">
        <SubmitButton 
          text={isSignup ? `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account` : "Log In"}
          signup={isSignup}
          role={role}
          action={isSignup ? signup : login} // ✅ Pass the actual function
        />
      </div>
    </form>
  );
}