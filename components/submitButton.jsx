"use client"

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

// ✅ Receive 'action' as a prop
export function SubmitButton({ text, signup, role, action }) {
  const { pending } = useFormStatus();

  const getButtonStyles = () => {
    if (!signup) return "bg-black text-white border-black hover:bg-gray-800";
    return role === "teacher"
      ? "bg-green-600 text-white border-green-700 hover:bg-green-700"
      : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700";
  };

  return (
    <button
      type="submit"
      formAction={action} // ✅ APPLY IT HERE
      disabled={pending}
      className={`w-full p-3 rounded-lg border transition-all duration-300 font-sans font-semibold flex items-center justify-center gap-2 
        ${getButtonStyles()} 
        ${pending ? "opacity-70 cursor-not-allowed" : ""}`}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        text
      )}
    </button>
  );
}