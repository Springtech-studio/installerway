"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  User as UserIcon,
  Building,
  ShieldCheck,
  Award,
  Mail,
  Phone,
  MapPin,
  Sliders,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
} from "lucide-react";

interface EngineerProfile {
  fullName: string;
  companyName: string;
  licenseId: string;
  accreditationBody: string;
  email: string;
  phone: string;
  address: string;
  inverterHeadroom: number;
  batteryDerating: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState<EngineerProfile>({
    fullName: "",
    companyName: "",
    licenseId: "",
    accreditationBody: "Field Technician / Independent Installer",
    email: "",
    phone: "",
    address: "",
    inverterHeadroom: 25,
    batteryDerating: 15,
  });

  // Track Auth and fetch profile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Guests or unauthenticated users can still edit local defaults or log in
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setProfile((prev) => ({
        ...prev,
        fullName: currentUser.displayName || prev.fullName,
        email: currentUser.email || prev.email,
      }));

      try {
        const docRef = doc(db, "engineers", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            fullName: data.fullName || currentUser.displayName || "",
            companyName: data.companyName || "",
            licenseId: data.licenseId === "Field Technician / Independent Installer" ? "" : (data.licenseId || ""),
            accreditationBody: data.accreditationBody || "Field Technician / Independent Installer",
            email: data.email || currentUser.email || "",
            phone: data.phone || "",
            address: data.address || "",
            inverterHeadroom: data.inverterHeadroom ?? 25,
            batteryDerating: data.batteryDerating ?? 15,
          });
        }
      } catch (err: any) {
        console.warn("Could not load Firestore profile directly:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!user) {
        // Fallback for Guest mode - save to local storage
        localStorage.setItem("installerway_profile", JSON.stringify(profile));
        setSuccessMessage("Preferences saved locally for this session!");
        setSaving(false);
        return;
      }

      const isTechnician = !profile.licenseId.trim();
      const payload = {
        fullName: profile.fullName.trim() || user.displayName || "Solar Installer",
        companyName: profile.companyName.trim() || "Independent Solar Practitioner",
        // License is optional: auto-assigns practitioner title if blank
        licenseId: isTechnician ? "Field Technician / Independent Installer" : profile.licenseId.trim(),
        accreditationBody: isTechnician
          ? (profile.accreditationBody.trim() || "Solar Technical Practitioner")
          : (profile.accreditationBody.trim() || "COREN / NEMSA Certified"),
        email: profile.email.trim() || user.email || "",
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        inverterHeadroom: Number(profile.inverterHeadroom) || 25,
        batteryDerating: Number(profile.batteryDerating) || 15,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "engineers", user.uid), payload, { merge: true });
      setSuccessMessage("Engineering & technician profile updated successfully!");
    } catch (err: any) {
      console.error("Save profile error:", err);
      setErrorMessage(err.message || "Failed to update profile. Please check connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 text-slate-300">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm font-semibold">Loading practitioner credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Engineer & Technician Credentials
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Practicing Practitioner Profile & Seal
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your technical branding, optional regulatory license, and default sizing margins.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Portfolio</span>
        </Link>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Professional Details */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur space-y-5">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <UserIcon className="w-4 h-4 text-emerald-400" />
            <span>Practitioner & Business Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name / Lead Practitioner Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="Engr. Emmanuel Oluwaferanmi"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Company / Solar Firm Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  placeholder="Springtech Studio / Solar Engineering Services"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>License / Registration Number</span>
                <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Optional for Technicians
                </span>
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profile.licenseId}
                  onChange={(e) => setProfile({ ...profile, licenseId: e.target.value })}
                  placeholder="e.g. COREN/R/1234 or NEMSA/2026 (Leave blank if technician)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Field installers & technicians without formal council registration can leave this blank.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Accreditation / Professional Category
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profile.accreditationBody}
                  onChange={(e) => setProfile({ ...profile, accreditationBody: e.target.value })}
                  placeholder="e.g. Certified PV Installer / COREN Registered"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="engineering@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+234 810 000 0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate / Workshop Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Workshop Address, Lagos / Ogun / Ekiti, Nigeria"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Default Engineering Safety Margins */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur space-y-5">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800/80 pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Default Sizing Margins & Environmental Derating</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Continuous Inverter Sizing Headroom
                </label>
                <span className="text-xs font-bold text-emerald-400">
                  +{profile.inverterHeadroom}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={profile.inverterHeadroom}
                onChange={(e) => setProfile({ ...profile, inverterHeadroom: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Recommended 20–25% cushion above continuous audited wattage.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Battery Temperature & Aging Derating
                </label>
                <span className="text-xs font-bold text-emerald-400">
                  +{profile.batteryDerating}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={5}
                value={profile.batteryDerating}
                onChange={(e) => setProfile({ ...profile, batteryDerating: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Compensates for tropical ambient temperatures, cabling resistance, and DoD limits.
              </p>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Credentials...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Credentials & Defaults</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}