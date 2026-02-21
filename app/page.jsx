"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageSquare, Sparkles, ShieldCheck, Users, GraduationCap, User2, Apple } from "lucide-react";
import Link from "next/link";
import Header from "@/components/header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f7ebd4] text-[#2D2D2D]">
      <Header />
      
      {/* HERO SECTION */}
      <section className="pt-20 pb-12 md:pt-32 md:pb-24 px-4">
        <div className="container mx-auto text-center">
          {/* <div className="inline-block border-2 border-[#2D2D2D] bg-[#B2F2BB] px-4 py-1 mb-6 shadow-[4px_4px_0px_0px_#2D2D2D]">
            <span className="text-xs font-black uppercase tracking-widest">The Future of Language Learning</span>
          </div> */}
          <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
            WELCOME TO <br />
            <span className="text-[#5bb3f6] drop-shadow-[4px_4px_0px_#2D2D2D]">THE FUTURE OF LANGUAGE LEARNING</span>
          </h1>
         <p className="max-w-3xl mx-auto text-lg md:text-2xl font-bold mb-10 text-[#2D2D2D]/70 leading-tight">
  Stop memorizing flashcards. Start holding <b className="text-gray-800">real conversations</b>. <br className="hidden md:block" />
  Lingua is the AI-powered language learning platform that finally makes your students fluent. <br className="hidden md:block" />
</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/signup">
              <Button variant="outline" className="h-16 px-10 bg-[#FF914D] text-[#2D2D2D] border-4 border-[#2D2D2D] rounded-3 shadow-[8px_8px_0px_0px_#2D2D2D] hover:bg-[#FF914D] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all text-xl font-black uppercase">
                GET STARTED
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-16 px-10 bg-white text-[#2D2D2D] border-4 border-[#2D2D2D] rounded-3 shadow-[8px_8px_0px_0px_#2D2D2D] hover:shadow-none hover:bg-white hover:translate-x-[4px] hover:translate-y-[4px] transition-all text-xl font-black uppercase">
                LOG IN
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section className="py-20 border-t-4 border-[#2D2D2D] bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">An extension of the classroom</h2>
          <h3 className="text-2xl font-bold text-gray-500  mb-16"> Lingua doesn't replace the language classroom - it <span className="font-black text-gray-800">enhances</span> it, providing benefits for both students and teachers.</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 border-4 border-[#2D2D2D] bg-[#74C0FC] shadow-[8px_8px_0px_0px_#2D2D2D] rounded-2xl hover:translate-x-1 hover:shadow-none transition-all">
              <GraduationCap className="h-12 w-12 mb-6" />
              <h3 className="text-2xl font-black uppercase mb-4">For Students</h3>
              <ul className="list-disc text-2xl pl-6 mb-4 space-y-2">
                <li className="font-bold">Simulate real-world conversations with engaging, authentic AI characters</li>
                <li className="font-bold">Recieve detailed feedback and performance analysis to improve conversational skills</li>
                <li className="font-bold">Create vocabulary lists and view interactive lessons to strengthen language foundation</li>
              </ul>
              
            </div>

            {/* Feature 2 */}
            <div className="p-8 border-4 border-[#2D2D2D] bg-[#B2F2BB] shadow-[8px_8px_0px_0px_#2D2D2D] rounded-2xl hover:translate-x-1 hover:shadow-none transition-all">
              <Apple className="h-12 w-12 mb-6" />
              <h3 className="text-2xl font-black uppercase mb-4">For Teachers</h3>
              <ul className="list-disc text-2xl pl-6 mb-4 space-y-2">
                <li className="font-bold">Assign students conversations based on specific concepts and themes discussed in class</li>
                <li className="font-bold">Track student progress through AI analytics and performance reports</li>
                <li className="font-bold">Access insights on what students are struggling with most, to focus extra time on in class</li>
              </ul>
              </div>


          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      {/* <section className="py-12 border-y-4 border-[#2D2D2D] bg-[#2D2D2D] text-white overflow-hidden whitespace-nowrap">
        <div className="flex justify-around animate-marquee font-black text-2xl md:text-4xl uppercase tracking-tighter">
          <span>99% Fluency Rate • 50+ Languages • 24/7 AI Tutor • 10k+ Active Students • </span>
          <span className="hidden md:inline">99% Fluency Rate • 50+ Languages • 24/7 AI Tutor • </span>
        </div>
      </section> */}

      {/* FAQ SECTION */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 tracking-tighter text-center">Questions?</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-4 border-[#2D2D2D] bg-white px-6 shadow-[6px_6px_0px_0px_#2D2D2D]">
              <AccordionTrigger className="text-xl font-black uppercase hover:no-underline">Is it better than a human teacher?</AccordionTrigger>
              <AccordionContent className="font-bold text-lg pb-6">
                Lingua doesn't replace teachers; it augments them. It provides the 24/7 practice environment that humans can't provide.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-4 border-[#2D2D2D] bg-white px-6 shadow-[6px_6px_0px_0px_#2D2D2D]">
              <AccordionTrigger className="text-xl font-black uppercase hover:no-underline">Which languages are supported?</AccordionTrigger>
              <AccordionContent className="font-bold text-lg pb-6">
                Everything from Spanish and French to Mandarin and Japanese. Our AI models are trained on global datasets.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-20 px-4 bg-[#FF914D] border-t-4 border-[#2D2D2D]">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-8">Ready to talk?</h2>
          <Link href="/signup">
            <Button className="h-20 px-12 bg-[#2D2D2D] text-white border-4 border-white rounded-none shadow-[10px_10px_0px_0px_white] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all text-2xl font-black uppercase">
              JOIN LINGUA NOW <ArrowRight className="ml-4 h-8 w-8" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}