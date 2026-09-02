"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight, ReceiptText, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";

const HeroSection = () => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-16 px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_22%,rgba(191,219,254,0.65),transparent_26%),radial-gradient(circle_at_82%_30%,rgba(233,213,255,0.7),transparent_28%)]" />
      <div className="container mx-auto text-center">
        <div className="eyebrow mb-6"><Sparkles className="h-3.5 w-3.5" /> AI-powered money clarity</div>
        <h1 className="mx-auto max-w-5xl text-5xl md:text-7xl lg:text-[86px] leading-[0.96] pb-6 gradient-title">
          Make every rupee <br /> feel intentional.
        </h1>
        <p className="text-lg md:text-xl leading-8 text-slate-600 mb-8 max-w-2xl mx-auto">
          FinanceScan turns everyday spending into useful insight—scan receipts,
          track accounts, and stay ahead of your monthly goals.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
          <SignInButton forceRedirectUrl="/dashboard">
            <Button size="lg" className="h-12 gap-2 rounded-xl bg-slate-950 px-6 shadow-xl shadow-slate-950/15 hover:bg-slate-800">Start tracking free <ArrowRight className="h-4 w-4" /></Button>
          </SignInButton>
          <a href="#features"><Button size="lg" variant="outline" className="h-12 rounded-xl border-slate-200 bg-white/80 px-6">Explore features</Button></a>
        </div>
        <div className="mx-auto mb-9 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-1.5"><ReceiptText className="h-4 w-4 text-blue-600" /> Smart receipt scan</span>
          <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-violet-600" /> Real-time budget health</span>
        </div>
        <div className="hero-image-wrapper mt-5 md:mt-0">
          <div ref={imageRef} className="hero-image rounded-[1.75rem] bg-white p-2 shadow-2xl shadow-blue-950/15">
            <Image
              src="/banner.jpeg"
              width={1280}
              height={720}
              alt="Dashboard Preview"
              className="rounded-[1.35rem] border border-slate-200 mx-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
