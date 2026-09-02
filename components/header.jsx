import React from "react";
import { Button } from "./ui/button";
import { PenBox, LayoutDashboard, Sparkles } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { checkUser } from "@/lib/checkUser";
import Image from "next/image";

const Header = async () => {
  await checkUser();

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-200/70 shadow-sm shadow-slate-950/[0.02]">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <Image
            src={"/logo.png"}
            alt="FinanceScan Logo"
            width={200}
            height={60}
            className="h-11 w-auto object-contain"
          />
        </Link>

        {/* Navigation Links - Different for signed in/out users */}
        <div className="hidden md:flex items-center space-x-8">
          <SignedOut>
            <a href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">
              Features
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700"
            >
              Testimonials
            </a>
          </SignedOut>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <SignedIn>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Button variant="outline" className="border-slate-200 bg-white shadow-sm hover:bg-slate-50">
                <LayoutDashboard size={18} />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>
            <Link href="/transaction/create">
              <Button className="flex items-center gap-2 bg-slate-950 shadow-lg shadow-slate-950/15 hover:bg-slate-800">
                <PenBox size={18} />
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button className="gap-2 bg-slate-950 hover:bg-slate-800"><Sparkles className="h-4 w-4" />Get started</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;
