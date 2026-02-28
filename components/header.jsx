"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, Languages, UserCircle, Hash, User, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";



const Header = () => {
  const router = useRouter();
  
  // 1. ALL STATES
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", studentId: "" });
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [showInactivityPopup, setShowInactivityPopup] = useState(false);

  // 2. ALL REFS (Initialize signOutRef as null first)
  const popupRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const signOutRef = useRef(null); 

  // 3. CONSTANTS
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  const GRACE_PERIOD = 30 * 1000;

  // 4. CALLBACKS
  const handleSignOut = useCallback(async () => {
    try {
      console.log("Sign out triggered...");
      setUser(null);
      setProfile({ firstName: "", lastName: "", studentId: "" });
      setShowInactivityPopup(false);
      setShowPopup(false);

      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) console.error("Supabase signout error:", error);

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Critical sign out crash:", err);
    }
  }, [router]);

  // 5. HELPER FUNCTIONS
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

  const staySignedIn = () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    setShowInactivityPopup(false);
    lastActivityRef.current = Date.now(); // Restart the clock
  };

  // 6. SYNC REFS & EFFECTS
  useEffect(() => {
    signOutRef.current = handleSignOut;
  }, [handleSignOut]);


useEffect(() => {
  let warningTimer;
  // Track the exact timestamp of last activity
  

  const checkInactivity = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // IF WAKING UP AFTER THE LIMIT: Kick out immediately
    if (timeSinceLastActivity >= INACTIVITY_LIMIT + GRACE_PERIOD) {
      console.log("Mobile/Background: Limit reached. Kicking out...");
      if (signOutRef.current) signOutRef.current();
      return;
    }

    // IF WAKING UP IN THE GRACE PERIOD: Show popup and set the remaining logout timer
    if (timeSinceLastActivity >= INACTIVITY_LIMIT) {
      setShowInactivityPopup(true);
      const remainingGrace = (INACTIVITY_LIMIT + GRACE_PERIOD) - timeSinceLastActivity;
      
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(async () => {
        if (signOutRef.current) await signOutRef.current();
      }, Math.max(0, remainingGrace));
    }
  };

  const resetTimer = () => {
    lastActivityRef.current = Date.now(); // Update timestamp
    if (warningTimer) clearTimeout(warningTimer);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    
    warningTimer = setTimeout(() => {
      if (user) {
        setShowInactivityPopup(true);
        logoutTimerRef.current = setTimeout(async () => {
          if (signOutRef.current) await signOutRef.current();
        }, GRACE_PERIOD);
      }
    }, INACTIVITY_LIMIT);
  };

  // Handle when the tab becomes visible (Mobile wake-up)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && user) {
      checkInactivity();
    }
  };

  if (user && !showInactivityPopup) {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    resetTimer();

    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }
}, [user, INACTIVITY_LIMIT, GRACE_PERIOD]);




  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("Supabase Session Error:", error);

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) await fetchProfileData(currentUser);
      } catch (err) {
        console.error("Critical Header Crash:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // --- ADD THIS START ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("Auth Event:", event);
  
  const currentUser = session?.user ?? null;

  if (event === 'SIGNED_OUT' || !currentUser) {
    setUser(null);
    setProfile({ firstName: "", lastName: "" });
    router.refresh();
    return; // Exit early
  }

  // Handle Sign In or Token Refresh
  setUser(currentUser);
  await fetchProfileData(currentUser);

  if (event === 'SIGNED_IN') {
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
      // Don't forget to unsubscribe to avoid memory leaks!
      subscription?.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router]);

  console.log("Current User State:", user);
console.log("Loading State:", loading);

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

       <div className="flex items-center gap-2 sm:gap-4">
  {!loading && (
    <>
      {user ? (
        <>
          {/* Dashboard Button */}
          <Link href={user.user_metadata?.user_role === 'teacher' ? "/teacher/dashboard" : `/student/${user.id}/dashboard`}>
            <Button 
              variant="outline" 
              className="h-10 sm:h-12 px-2 sm:px-4 rounded-xl sm:rounded-2xl border-2 border-[#2D2D2D] bg-[#FEFAF2] font-bold shadow-[2px_2px_0px_0px_#2D2D2D] sm:shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>

          {/* Sign Out Button */}
          <Button 
            variant="outline" 
            onClick={handleSignOut} 
            className="h-10 sm:h-12 px-2 sm:px-4 rounded-xl sm:rounded-2xl border-2 border-[#2D2D2D] bg-red-500 text-black font-bold shadow-[2px_2px_0px_0px_#2D2D2D] sm:shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

          {/* Account Icon */}
          <div className="relative" ref={popupRef}>
            <button 
              onClick={() => setShowPopup(!showPopup)} 
              className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl border-2 border-[#2D2D2D] bg-cyan-200 flex items-center justify-center shadow-[2px_2px_0px_0px_#2D2D2D] sm:shadow-[3px_3px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <div className="flex flex-col items-center">
                <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 text-[#2D2D2D]" />
                <span className="hidden sm:block text-[8px] sm:text-[10px] font-black uppercase">Account</span>
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
                <div className="flex gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="outline" className="h-10  sm:mt-1 items-center w-18 sm:w-25 px-3 sm:px-8 rounded-xl sm:rounded-2xl border-2 border-[#2D2D2D] bg-gray-300 hover:bg-gray-300 font-bold shadow-[2px_2px_0px_0px_#2D2D2D] sm:shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="h-10 sm:mt-1 w-18 sm:w-25 px-3 sm:px-8 rounded-xl sm:rounded-2xl border-2 border-[#2D2D2D] bg-blue-400 hover:bg-blue-400 font-bold shadow-[2px_2px_0px_0px_#2D2D2D] sm:shadow-[4px_4px_0px_0px_#2D2D2D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
              Sign Up
            </Button>
          </Link>
        </div>
      )}
    </>
  )}
</div>
      </nav>

     {showInactivityPopup && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    {/* The actual Modal Card */}
    <div className="w-full max-w-sm bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[24px] shadow-[8px_8px_0px_0px_#2D2D2D] p-8 text-center animate-in fade-in zoom-in duration-200">
      
      <div className="mx-auto w-16 h-16 bg-amber-100 border-2 border-[#2D2D2D] rounded-full flex items-center justify-center mb-4">
        <UserCircle className="h-8 w-8 text-amber-600" />
      </div>
      
      <h2 className="text-2xl font-black uppercase mb-2 text-[#2D2D2D]">Are you there?</h2>
      <p className="font-bold text-[#2D2D2D] mb-6 opacity-80">
        Your session will expire soon due to inactivity. Would you like to stay signed in?
      </p>

      <div className="flex flex-col gap-3">
        {/* BUTTON: STAY SIGNED IN */}
        <Button 
  onClick={staySignedIn}
  className="w-full h-12 bg-[#74C0FC] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_#2D2D2D] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
>
  I&apos;m Still Here
</Button>
        
        {/* BUTTON: SIGN OUT MANUALLY */}
        <button 
          onClick={async () => {
            console.log("User clicked 'Sign me out'");
            setShowInactivityPopup(false); 
            await handleSignOut();
          }}
          className="mt-2 text-xs font-black uppercase opacity-50 hover:opacity-100 transition-opacity underline decoration-2 underline-offset-4"
        >
          No, Sign me out
        </button>
      </div>
    </div>
  </div>
)}
    </header>
  );
};

export default Header;