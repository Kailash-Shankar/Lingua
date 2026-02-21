"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Languages } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Initial Session Check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    // 2. Auth State Listener (Improved for immediate UI updates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh(); // Forces Next.js to re-sync server components
      }
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 w-full border-b-2 border-[#2D2D2D] bg-orange/90 backdrop-blur-md z-50">
      <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Soft Neo-Brutalist Logo Replacement */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="bg-[#74C0FC] border-2 border-[#2D2D2D] p-2 rounded-xl shadow-[3px_3px_0px_0px_#2D2D2D] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-none transition-all">
            <Languages className="h-6 w-6 text-[#2D2D2D]" />
          </div>
          <span className="text-4xl font-black tracking-wide text-[#2D2D2D] uppercase
  [text-shadow:4px_4px_0px_#FFD966] 
  hover:translate-x-[1px] hover:translate-y-[1px] hover:[text-shadow:2px_2px_0px_#FFD966]
  transition-all duration-200 cursor-default">
  Lingua
</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {user ? (
                <>
                  <Link 
                    href={
                      user.user_metadata?.user_role === 'teacher' 
                        ? "/teacher/dashboard" 
                        : `/student/${user.id}/dashboard`
                    }
                  >
                    <Button 
                      variant="outline"
                      className="rounded-2xl border-2 border-[#2D2D2D] bg-[#E6F4F1] font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Button>
                  </Link>

                  <Button 
                    variant="outline"
                    onClick={handleSignOut} 
                    className="rounded-2xl border-2 border-[#2D2D2D] bg-red-500 text-black font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:bg-red-500 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Sign Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button 
                      variant="outline"
                      className="rounded-2xl border-2 border-[#2D2D2D] bg-gray-300 hover:bg-gray-300 text-[#2D2D2D] font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all px-6"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button 
                        variant="outline"
                      className="rounded-2xl border-2 border-[#2D2D2D] bg-blue-400 hover:bg-blue-400 text-[#2D2D2D] font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all px-6"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;