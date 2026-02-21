import Link from "next/link";
import { Loginbox } from "@/components/loginbox";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FEFAF2] p-4 text-[#2D2D2D]">
      {/* Container for Loginbox to ensure shadow spacing */}
      <div className="w-full max-w-md">
        <Loginbox isSignup={true} />
      </div>

      <p className="mt-8 text-xs font-black uppercase tracking-widest ">
        Already have an account?{" "}
        <Link 
          href="/login" 
          className="ml-2 text-[#FF914D] hover:text-[#2D2D2D] transition-colors underline decoration-2 underline-offset-4"
        >
          Log in here
        </Link>
      </p>
    </div>
  );
}