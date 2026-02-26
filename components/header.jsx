"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Languages, UserCircle, Hash, User, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const Header = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", studentId: "" });
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const router = useRouter();

  // 1. Move the function definition ABOVE the useEffect
  const fetchProfileData = async (currentUser) => {
    if (!currentUser) return;
    
    const isTeacher = currentUser.user_metadata?.user_role === 'teacher';
    
    if (isTeacher) {
      setProfile({
        firstName: currentUser.user_metadata?.first_name || "Teacher",
        lastName: currentUser.user_metadata?.last_name || "",
        studentId: null
      });
    } else {
      try {
        const { data } = await supabase
          .from("course_enrollments")
          .select("First_Name, Last_Name, Student_id")
          .eq("student_id", currentUser.id)
          .maybeSingle();

        if (data) {
          setProfile({
            firstName: data.First_Name,
            lastName: data.Last_Name,
            studentId: data.Student_id
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowPopup(false);
    router.refresh();
    router.push("/login");
  };

  // 2. The useEffect now safely references fetchProfileData
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfileData(currentUser);
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchProfileData(currentUser);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      subscription?.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router]);

  return (
    <header className="fixed top-0 w-full border-b-2 border-[#2D2D2D] bg-orange/90 backdrop-blur-md z-50">
      <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
        
        <Link href="/" className="group flex items-center gap-2">
          <div className="bg-[#74C0FC] border-2 border-[#2D2D2D] p-2 rounded-xl shadow-[3px_3px_0px_0px_#2D2D2D] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-none transition-all">
            <Languages className="h-6 w-6 text-[#2D2D2D]" />
          </div>
          <span className="text-4xl font-black tracking-wide text-[#2D2D2D] uppercase [text-shadow:4px_4px_0px_#FFD966]">
            Lingua
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {user ? (
                <>
                  <Link href={user.user_metadata?.user_role === 'teacher' ? "/teacher/dashboard" : `/student/${user.id}/dashboard`}>
                    <Button variant="outline" className="rounded-2xl border-2 border-[#2D2D2D] bg-[#FEFAF2] hover:bg-[#fefaf2] font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Button>
                  </Link>

                  <Button variant="outline" onClick={handleSignOut} className="rounded-2xl border-2 border-[#2D2D2D] bg-red-500 text-black font-bold shadow-[4px_4px_0px_0px_#2D2D2D] hover:bg-red-500 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Sign Out</span>
                  </Button>

                  <div className="relative ml-2" ref={popupRef}>
                    <button onClick={() => setShowPopup(!showPopup)} className="h-15 w-15 p-2 rounded-xl border-2 border-[#2D2D2D] bg-cyan-200 hover:bg-cyan-200 flex items-center justify-center shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                      <div className="flex flex-col items-center">
                        <UserCircle className="h-6 w-6 text-[#2D2D2D]" />
                        <span className="text-[10px] font-black uppercase">Profile</span>
                      </div>
                    </button>

                    {showPopup && (
                      <div className="absolute right-0 mt-4 w-64 bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[24px] shadow-[6px_6px_0px_0px_#2D2D2D] p-5 animate-in fade-in zoom-in duration-150">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="h-14 w-14 bg-[#FFD966] border-2 border-[#2D2D2D] rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#2D2D2D]">
                            <User className="h-7 w-7 text-[#2D2D2D]" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black uppercase leading-tight">
                              {profile.firstName} {profile.lastName}
                            </h4>
                            {profile.studentId && (
                              <p className="text-sm font-black uppercase opacity-60 flex items-center justify-center gap-1">
                                <Hash className="h-4 w-4" /> ID: {profile.studentId}
                              </p>
                            )}
                          </div>
                          <Link href="/profile" className="w-full" onClick={() => setShowPopup(false)}>
                            <Button className="w-full h-10 bg-[#74C0FC] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_#2D2D2D] hover:shadow-none transition-all">
                              View Profile <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex gap-3">
                  <Link href="/login">
                    <Button variant="outline" className="rounded-2xl border-2 border-[#2D2D2D] bg-gray-300 font-bold shadow-[4px_4px_0px_0px_#2D2D2D] px-6">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" className="rounded-2xl border-2 border-[#2D2D2D] bg-blue-400 font-bold shadow-[4px_4px_0px_0px_#2D2D2D] px-6">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;