"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  ShieldCheck,
  User as UserIcon,
  Mail,
  Lock,
  ArrowRight,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(false);
  const [fullName, setFullName] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingInitialAuth, setCheckingInitialAuth] = useState(true);

  // If already authenticated, redirect straight to the auditor
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/auditor");
      } else {
        setCheckingInitialAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Clean user-friendly error translation
  const formatFirebaseError = (errCode: string): string => {
    switch (errCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Switch to 'Sign In' below.";
      case "auth/invalid-email":
        return "Please provide a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password. Please verify your credentials.";
      case "auth/too-many-requests":
        return "Access temporarily disabled due to many failed attempts. Try again shortly.";
      case "auth/network-request-failed":
        return "Network connection issue. Check your internet connectivity.";
      case "auth/api-key-not-valid":
        return "Firebase API configuration issue. Ensure environment variables are loaded.";
      default:
        return "Authentication failed. Please verify your details.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // --- 1. SIGN IN FLOW ---
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.push("/auditor");
      } else {
        // --- 2. REGISTRATION FLOW ---
        if (!fullName.trim()) {
          setError("Please enter your Full Name / Engineering Title.");
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        const user = userCredential.user;

        // Update Auth Display Name
        await updateProfile(user, { displayName: fullName.trim() });

        // Save metadata to Firestore (non-blocking)
        try {
          await setDoc(doc(db, "engineers", user.uid), {
            fullName: fullName.trim(),
            licenseId: licenseId.trim() || "N/A",
            email: email.trim(),
            role: "Certified Solar PV Engineer",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        } catch (firestoreError) {
          console.warn("Firestore engineer profile write deferred:", firestoreError);
        }

        router.push("/auditor");
      }
    } catch (err: any) {
      console.error("Firebase Authentication Error:", err);
      const code = err?.code || "";
      setError(formatFirebaseError(code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestEntry = () => {
    // Allows proceeding without saving cloud credentials
    router.push("/auditor");
  };

  if (checkingInitialAuth) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 text-slate-300">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm font-medium">Verifying Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400 font-black text-xl mb-3 shadow-inner">
            IW
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            InstallerWay Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isLogin
              ? "Access your saved designs, proposals & community"
              : "Register your engineering credentials"}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name / Engineer Title
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Engr. Emmanuel Oluwaferanmi"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  License / NEMSA / COREN ID{" "}
                  <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value)}
                    placeholder="e.g. NEMSA/SOL/2026/8941"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : isLogin ? (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Create Certified Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {isLogin ? (
              <span>
                Need an account?{" "}
                <span className="text-emerald-400 font-semibold underline underline-offset-4">
                  Create one
                </span>
              </span>
            ) : (
              <span>
                Already have an engineering account?{" "}
                <span className="text-emerald-400 font-semibold underline underline-offset-4">
                  Sign In
                </span>
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-slate-900 px-3 text-slate-500">Or</span>
          </div>
        </div>

        {/* Guest Mode Fallback */}
        <button
          type="button"
          onClick={handleGuestEntry}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 font-medium flex items-center justify-center gap-2 transition"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Continue as Guest Engineer (Offline Mode)</span>
        </button>
      </div>
    </div>
  );
}