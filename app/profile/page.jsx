"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Hash, 
  Trash2, 
  Save, 
  AlertTriangle, 
  ArrowLeft,
  ShieldAlert
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
  });

  // Modal States
  const [showFirstWarning, setShowFirstWarning] = useState(false);
  const [showSecondWarning, setShowSecondWarning] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      const isTeacher = authUser.user_metadata?.user_role === 'teacher';

      if (isTeacher) {
        setFormData({
          firstName: authUser.user_metadata?.first_name || "",
          lastName: authUser.user_metadata?.last_name || "",
          studentId: "",
        });
      } else {
        const { data } = await supabase
          .from("course_enrollments")
          .select("First_Name, Last_Name, Student_id")
          .eq("student_id", authUser.id)
          .limit(1)
          .single();

        if (data) {
          setFormData({
            firstName: data.First_Name || "",
            lastName: data.Last_Name || "",
            studentId: data.Student_id || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const isTeacher = user.user_metadata?.user_role === 'teacher';

      if (isTeacher) {
        // Update Auth Metadata for Teachers
        const { error } = await supabase.auth.updateUser({
          data: { 
            first_name: formData.firstName, 
            last_name: formData.lastName 
          }
        });
        if (error) throw error;
      } else {
        // Update course_enrollments for Students
        const { error } = await supabase
          .from("course_enrollments")
          .update({
            First_Name: formData.firstName,
            Last_Name: formData.lastName,
            Student_id: formData.studentId
          })
          .eq("student_id", user.id);
        
        if (error) throw error;
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Note: Supabase Client SDK doesn't allow users to delete themselves directly for safety.
    // Usually, you'd call an Edge Function or a server action here.
    toast.error("Account deletion requires administrative verification.");
    setShowSecondWarning(false);
  };

  if (loading) return <div className="min-h-screen bg-[#FEFAF2] flex items-center justify-center font-black">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FEFAF2] pt-28 pb-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 font-black uppercase text-sm hover:translate-x-[-4px] transition-all">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="bg-white border-4 border-[#2D2D2D] rounded-[40px] shadow-[12px_12px_0px_0px_#2D2D2D] p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-6 mb-12">
            <div className="h-24 w-24 bg-[#FFD966] border-4 border-[#2D2D2D] rounded-[32px] flex items-center justify-center shadow-[6px_6px_0px_0px_#2D2D2D]">
              <User className="h-12 w-12 text-[#2D2D2D]" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-[#2D2D2D]">
                My <span className="text-[#74C0FC]">Profile</span>
              </h1>
              <p className="font-bold opacity-60 uppercase text-xs tracking-widest">
                {user?.user_metadata?.user_role || "User Settings"}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest ml-1">First Name</Label>
                <Input 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="h-14 bg-white border-2 border-[#2D2D2D] rounded-2xl font-bold focus-visible:ring-0 focus-visible:border-[#74C0FC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest ml-1">Last Name</Label>
                <Input 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="h-14 bg-white border-2 border-[#2D2D2D] rounded-2xl font-bold focus-visible:ring-0 focus-visible:border-[#74C0FC]"
                />
              </div>
            </div>

            {user?.user_metadata?.user_role !== 'teacher' && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest ml-1">Student ID Number</Label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                  <Input 
                    value={formData.studentId}
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                    className="h-14 pl-12 bg-white border-2 border-[#2D2D2D] rounded-2xl font-bold focus-visible:ring-0 focus-visible:border-[#74C0FC]"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="w-full h-16 bg-[#B2F2BB] text-[#2D2D2D] border-4 border-[#2D2D2D] rounded-2xl font-black uppercase text-xl shadow-[6px_6px_0px_0px_#2D2D2D] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              {isSaving ? "Saving..." : <><Save className="mr-2 h-6 w-6" /> Save Changes</>}
            </Button>

            <div className="pt-8 border-t-4 border-[#2D2D2D] border-dashed">
              <h3 className="font-black uppercase text-red-500 mb-4">Danger Zone</h3>
              <Button 
                onClick={() => setShowFirstWarning(true)}
                variant="destructive"
                className="w-full h-14 bg-[#FFADAD] text-[#2D2D2D] border-2 border-[#2D2D2D] rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_#2D2D2D] hover:shadow-none transition-all"
              >
                <Trash2 className="mr-2 h-5 w-5" /> Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal 1 */}
      <Dialog open={showFirstWarning} onOpenChange={setShowFirstWarning}>
        <DialogContent className="bg-[#FEFAF2] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <AlertTriangle className="text-orange-500" /> Wait a minute!
            </DialogTitle>
          </DialogHeader>
          <p className="font-bold py-4">Deleting your account will erase all course progress and data. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button onClick={() => setShowFirstWarning(false)} className="bg-white border-2 border-[#2D2D2D] text-black font-black rounded-xl shadow-[3px_3px_0px_0px_#2D2D2D]">Cancel</Button>
            <Button onClick={() => { setShowFirstWarning(false); setShowSecondWarning(true); }} className="bg-red-500 border-2 border-[#2D2D2D] text-white font-black rounded-xl shadow-[3px_3px_0px_0px_#2D2D2D]">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Modal 2 (REALLY SURE) */}
      <Dialog open={showSecondWarning} onOpenChange={setShowSecondWarning}>
        <DialogContent className="bg-[#FFADAD] border-4 border-[#2D2D2D] rounded-[32px] shadow-[8px_8px_0px_0px_#2D2D2D]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <ShieldAlert className="h-8 w-8" /> ARE YOU REALLY SURE?
            </DialogTitle>
          </DialogHeader>
          <p className="font-black text-lg py-4 uppercase tracking-tighter">This is your last chance to turn back. Once you click delete, your data is gone forever.</p>
          <DialogFooter>
            <Button onClick={handleDeleteAccount} className="w-full h-14 bg-[#2D2D2D] text-white border-2 border-white rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_#white] active:shadow-none transition-all">
              YES, DELETE PERMANENTLY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}