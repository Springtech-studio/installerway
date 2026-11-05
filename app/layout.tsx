"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SolarDesignProvider } from "@/context/SolarDesignContext";
import AICopilot from "@/components/AICopilot";
import {
  Menu,
  X,
  Calculator,
  Cpu,
  GitBranch,
  FileSpreadsheet,
  FolderKanban,
  Users,
  UserCircle,
  LogOut,
  LogIn,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/auditor", label: "1. Audit", icon: Calculator },
  { href: "/equipment", label: "2. Sizing", icon: Cpu },
  { href: "/sld", label: "3. SLD", icon: GitBranch },
  { href: "/bom", label: "4. BOM", icon: FileSpreadsheet },
  { href: "/portfolio", label: "5. Projects", icon: FolderKanban },
  { href: "/community", label: "6. Community", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
        <SolarDesignProvider>
          {!isAuthPage && (
            <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-30">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Brand Logo with Image */}
                <Link
                  href="/auditor"
                  className="flex items-center gap-2.5 group"
                >
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 bg-slate-950 flex items-center justify-center p-0.5 shadow-sm">
                    <Image
                      src="/logo.png"
                      alt="InstallerWay Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div className="flex items-center font-black tracking-tight text-base">
                    <span className="text-white">INSTALLER</span>
                    <span className="text-orange-500">WAY</span>
                  </div>
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:flex items-center gap-1 text-xs">
                  {NAV_LINKS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`px-3 py-2 rounded-xl font-medium transition ${
                          isActive
                            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}

                  {user ? (
                    <button
                      onClick={() => signOut(auth)}
                      title="Sign Out"
                      className="ml-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition flex items-center gap-1.5 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="ml-2 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                  )}
                </nav>

                {/* Mobile Header: ONLY Hamburger Button */}
                <div className="flex items-center lg:hidden">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle Navigation Menu"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition"
                  >
                    {mobileMenuOpen ? (
                      <X className="w-5 h-5 text-orange-400" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Drawer */}
              {mobileMenuOpen && (
                <div className="lg:hidden border-b border-slate-800 bg-slate-900/98 backdrop-blur-md px-4 py-3 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-150">
                  {NAV_LINKS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                          isActive
                            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-orange-400" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  {/* Auth Actions Inside Mobile Drawer */}
                  <div className="pt-3 mt-2 border-t border-slate-800/80">
                    {user ? (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          signOut(auth);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 bg-red-950/20 hover:bg-red-950/50 hover:text-red-300 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out ({user.displayName || user.email?.split("@")[0] || "Engineer"})</span>
                      </button>
                    ) : (
                      <Link
                        href="/auth"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white transition shadow-lg shadow-orange-600/20"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Cloud Account</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </header>
          )}

          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>

          {!isAuthPage && <AICopilot />}
        </SolarDesignProvider>
      </body>
    </html>
  );
}