"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SolarDesignProvider } from "@/context/SolarDesignContext";
import AICopilot from "@/components/AICopilot";
import {
  Menu,
  X,
  Zap,
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

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Track Firebase auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-black">
        <SolarDesignProvider>
          {/* Main Navigation Header */}
          {!isAuthPage && (
            <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Brand Logo */}
                <Link
                  href="/auditor"
                  className="font-extrabold text-white text-base tracking-tight flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-sm">
                    IW
                  </div>
                  <span>InstallerWay</span>
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
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
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
                      className="ml-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                    >
                      Sign In
                    </Link>
                  )}
                </nav>

                {/* Mobile Right Controls: Sign In/Out & Hamburger Button */}
                <div className="flex items-center gap-2 lg:hidden">
                  {user ? (
                    <button
                      onClick={() => signOut(auth)}
                      title="Sign Out"
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    >
                      Sign In
                    </Link>
                  )}

                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle Navigation Menu"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition"
                  >
                    {mobileMenuOpen ? (
                      <X className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Dropdown Menu Drawer */}
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
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </header>
          )}

          {/* Main App Canvas */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>

          {/* Non-obtrusive Copilot */}
          {!isAuthPage && <AICopilot />}
        </SolarDesignProvider>
      </body>
    </html>
  );
}