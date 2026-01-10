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

 // Inside your Header.jsx useEffect
useEffect(() => {
  const syncUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser ?? null);
    setLoading(false);
  };

  syncUser();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const newUser = session?.user ?? null;

    // ✅ 1. Check if the user ID actually changed
    setUser((prevUser) => {
      // Use a temporary variable to handle the logic outside the return
      const isDifferent = prevUser?.id !== newUser?.id;
      
      // We handle the refresh in a separate block below, 
      // not inside this return statement.
      return newUser;
    });

    // ✅ 2. Trigger the refresh outside of the setUser updater
    // We only refresh on major auth transitions
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      // Small delay ensures state is settled before refreshing the router
      setTimeout(() => {
        router.refresh();
      }, 0);
    }
  });

  return () => subscription.unsubscribe();
}, [router]);

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
                  <Link href={user.user_metadata?.user_role === 'teacher' ? "/teacher/dashboard" : "/student/dashboard"}>
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