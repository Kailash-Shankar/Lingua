
import Link from "next/link";
import { Loginbox } from "@/components/loginbox";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Loginbox isSignup={true} />
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-semibold">
          Log in here
        </Link>
      </p>
    </div>
  );
}