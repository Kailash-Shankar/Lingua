import Link from "next/link";
import { Loginbox } from "@/components/loginbox";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FEFAF2] p-4 text-[#2D2D2D]">
      {/* Container for Loginbox to ensure shadow spacing */}
      <div className="w-full max-w-md">
        <Loginbox isSignup={false} />
      </div>

      <p className="mt-8 text-xs font-black uppercase tracking-widest">
        Don't have an account?{" "}
        <Link 
          href="/signup" 
          className="ml-2 text-[#74C0FC] hover:text-[#2D2D2D] transition-colors underline decoration-2 underline-offset-4"
        >
          Sign up here
        </Link>
      </p>
    </div>
  );
}