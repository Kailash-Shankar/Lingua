
import Link from "next/link";
import { Loginbox } from "@/components/loginbox";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Loginbox isSignup={false} />
      <p className="mt-4 text-sm text-slate-600">
        Don't have an account?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline font-semibold">
          Sign up here
        </Link>
      </p>
    </div>
  );
}