"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

 useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription?.unsubscribe();
}, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 w-full border-b bg-orange/90 backdrop-blur-md z-50">
      <nav className="relative container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/lingualogo.png"
            alt="Website Logo"
            width={300}
            height={50}
            className="h-12 py-1 w-auto object-contain"
            loading="eager"
          />
        </Link>

        <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold md:text-3xl gradient-title pointer-events-none">
          Lingua
        </h1>

        <div className="flex items-center space-x-2 md:space-x-4">
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
                    <Button variant="secondary" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Button>
                  </Link>

                  <Button 
                    onClick={handleSignOut} 
                    variant="primary" 
                    className="bg-red-600 text-white hover:bg-red-800"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/signup">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign Up</Button>
                  </Link>
                  <Link href="/login">
                    <Button className="bg-black hover:bg-gray-800 text-white">Log In</Button>
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