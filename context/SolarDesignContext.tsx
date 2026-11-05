"use client";

import React, { createContext, useContext, useState } from "react";
import {
  INVERTER_CATALOG,
  BATTERY_CATALOG,
  PANEL_CATALOG,
  InverterSpec,
  BatterySpec,
  SolarPanelSpec
} from "@/lib/hardwareCatalog";
import {
  ApplianceLoad,
  calculateLoadTotals,
  calculateBatteryRequirements,
  calculatePVArrayRequirements,
  calculateStringConfiguration
} from "@/lib/solarMath";

export type InstallationScale = "residential" | "commercial" | "minigrid";

// 1. Residential Profile (Domestic inductive & lighting loads)
export const RESIDENTIAL_PRESETS: ApplianceLoad[] = [
  { id: "r1", name: "LED Lighting Network (Rooms & Security)", qty: 15, watts: 12, hoursDay: 2, hoursNight: 8, surgeMultiplier: 1.0 },
  { id: "r2", name: "Inverter Refrigerator / Freezer", qty: 1, watts: 160, hoursDay: 10, hoursNight: 10, surgeMultiplier: 2.5 },
  { id: "r3", name: "Ceiling / Standing Fans", qty: 4, watts: 65, hoursDay: 5, hoursNight: 8, surgeMultiplier: 1.3 },
  { id: "r4", name: "Smart TV & Home Theater System", qty: 1, watts: 120, hoursDay: 3, hoursNight: 5, surgeMultiplier: 1.0 },
  { id: "r5", name: "1.5 HP Inverter Air Conditioner", qty: 1, watts: 1100, hoursDay: 4, hoursNight: 4, surgeMultiplier: 2.2 },
  { id: "r6", name: "Submersible Borehole Water Pump (1 HP)", qty: 1, watts: 750, hoursDay: 1.5, hoursNight: 0, surgeMultiplier: 3.5 }
];

// 2. Commercial & Industrial Profile (Daytime peak, 3-phase machinery, servers, heavy HVAC)
export const COMMERCIAL_PRESETS: ApplianceLoad[] = [
  { id: "c1", name: "Commercial Office LED Troffers (50 Fixtures)", qty: 50, watts: 36, hoursDay: 10, hoursNight: 2, surgeMultiplier: 1.0 },
  { id: "c2", name: "Workstations & Office Desktop PCs", qty: 25, watts: 180, hoursDay: 9, hoursNight: 1, surgeMultiplier: 1.1 },
  { id: "c3", name: "Central Ducted VRF Air Conditioning (10 Tons)", qty: 2, watts: 3500, hoursDay: 9, hoursNight: 0, surgeMultiplier: 2.8 },
  { id: "c4", name: "IT Server Rack & Network Core Switch", qty: 1, watts: 1200, hoursDay: 12, hoursNight: 12, surgeMultiplier: 1.2 },
  { id: "c5", name: "Commercial Cold Room Compressor (3-Phase)", qty: 1, watts: 4500, hoursDay: 10, hoursNight: 8, surgeMultiplier: 3.8 },
  { id: "c6", name: "Heavy Multi-Function Copiers & Printers", qty: 3, watts: 650, hoursDay: 4, hoursNight: 0, surgeMultiplier: 1.8 }
];

// 3. Mini-Grid Profile (Community micro-utility, productive use, milling, street lighting, clinic)
export const MINIGRID_PRESETS: ApplianceLoad[] = [
  { id: "m1", name: "Household Basic Connections (60 Homes @ 80W)", qty: 60, watts: 80, hoursDay: 4, hoursNight: 8, surgeMultiplier: 1.2 },
  { id: "m2", name: "Central Community Water Scheme Pump (7.5 kW)", qty: 1, watts: 7500, hoursDay: 5, hoursNight: 0, surgeMultiplier: 4.0 },
  { id: "m3", name: "Primary Healthcare Clinic (Vaccine Fridge & Lights)", qty: 1, watts: 850, hoursDay: 12, hoursNight: 12, surgeMultiplier: 2.2 },
  { id: "m4", name: "Agro-Processing Grain / Cassava Mill (10 HP)", qty: 1, watts: 7500, hoursDay: 6, hoursNight: 0, surgeMultiplier: 4.5 },
  { id: "m5", name: "Solar Streetlight Grid (30 Poles)", qty: 30, watts: 40, hoursDay: 0, hoursNight: 11, surgeMultiplier: 1.0 },
  { id: "m6", name: "Commercial Center Retail Shops (10 Small Kiosks)", qty: 10, watts: 250, hoursDay: 8, hoursNight: 4, surgeMultiplier: 1.5 }
];

interface SolarDesignState {
  scale: InstallationScale;
  setScale: (scale: InstallationScale) => void;
  peakSunHours: number;
  setPeakSunHours: (psh: number) => void;
  autonomyDays: number;
  setAutonomyDays: (days: number) => void;

  loads: ApplianceLoad[];
  addLoad: (load: Omit<ApplianceLoad, "id">) => void;
  removeLoad: (id: string) => void;
  updateLoad: (id: string, updated: Partial<ApplianceLoad>) => void;
  loadPresetForScale: (targetScale: InstallationScale) => void;

  selectedInverter: InverterSpec;
  setSelectedInverter: (inverter: InverterSpec) => void;
  selectedBattery: BatterySpec;
  setSelectedBattery: (battery: BatterySpec) => void;
  selectedPanel: SolarPanelSpec;
  setSelectedPanel: (panel: SolarPanelSpec) => void;

  totals: ReturnType<typeof calculateLoadTotals>;
  batteryResults: ReturnType<typeof calculateBatteryRequirements>;
  targetKwp: number;
  pvConfig: ReturnType<typeof calculateStringConfiguration>;
}

const SolarDesignContext = createContext<SolarDesignState | undefined>(undefined);

export function SolarDesignProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<InstallationScale>("residential");
  const [peakSunHours, setPeakSunHours] = useState<number>(5.2);
  const [autonomyDays, setAutonomyDays] = useState<number>(1);
  const [loads, setLoads] = useState<ApplianceLoad[]>(RESIDENTIAL_PRESETS);

  const [selectedInverter, setSelectedInverter] = useState<InverterSpec>(INVERTER_CATALOG[0]);
  const [selectedBattery, setSelectedBattery] = useState<BatterySpec>(BATTERY_CATALOG[0]);
  const [selectedPanel, setSelectedPanel] = useState<SolarPanelSpec>(PANEL_CATALOG[0]);

  // Handler to switch scale and load its matching parameters & presets
  const handleScaleChange = (newScale: InstallationScale) => {
    setScaleState(newScale);
    if (newScale === "residential") {
      setLoads(RESIDENTIAL_PRESETS);
      setAutonomyDays(1);
      // Default to 5kW residential hybrid
      const resInverter = INVERTER_CATALOG.find((i) => i.ratedKw === 5.0) || INVERTER_CATALOG[0];
      setSelectedInverter(resInverter);
    } else if (newScale === "commercial") {
      setLoads(COMMERCIAL_PRESETS);
      setAutonomyDays(1); // C&I typically optimizes for daytime self-consumption
      // Default to 12kW+ 3-phase hybrid or commercial unit
      const commInverter = INVERTER_CATALOG.find((i) => i.ratedKw >= 10.0) || INVERTER_CATALOG[2];
      setSelectedInverter(commInverter);
    } else if (newScale === "minigrid") {
      setLoads(MINIGRID_PRESETS);
      setAutonomyDays(2); // Mini-grids require deeper autonomy for rural reliability
      const miniGridInverter = INVERTER_CATALOG.find((i) => i.ratedKw >= 12.0) || INVERTER_CATALOG[2];
      setSelectedInverter(miniGridInverter);
    }
  };

  const loadPresetForScale = (targetScale: InstallationScale) => {
    handleScaleChange(targetScale);
  };

  const totals = calculateLoadTotals(loads);
  const batteryResults = calculateBatteryRequirements(totals.nightKwh, autonomyDays, selectedBattery);
  const targetKwp = calculatePVArrayRequirements(totals.totalDailyKwh, peakSunHours);
  const pvConfig = calculateStringConfiguration(selectedInverter, selectedPanel, targetKwp);

  const addLoad = (load: Omit<ApplianceLoad, "id">) => {
    setLoads((prev) => [...prev, { ...load, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const removeLoad = (id: string) => {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLoad = (id: string, updated: Partial<ApplianceLoad>) => {
    setLoads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
  };

  return (
    <SolarDesignContext.Provider
      value={{
        scale,
        setScale: handleScaleChange,
        peakSunHours,
        setPeakSunHours,
        autonomyDays,
        setAutonomyDays,
        loads,
        addLoad,
        removeLoad,
        updateLoad,
        loadPresetForScale,
        selectedInverter,
        setSelectedInverter,
        selectedBattery,
        setSelectedBattery,
        selectedPanel,
        setSelectedPanel,
        totals,
        batteryResults,
        targetKwp,
        pvConfig
      }}
    >
      {children}
    </SolarDesignContext.Provider>
  );
}

export function useSolarDesign() {
  const context = useContext(SolarDesignContext);
  if (!context) throw new Error("useSolarDesign must be used within a SolarDesignProvider");
  return context;
}
// Inside SolarDesignProvider in context/SolarDesignContext.tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) return;

    try {
      // 1. Fetch cross-device engineer profile
      const profRef = doc(db, "engineers", currentUser.uid);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        const cloudData = profSnap.data();
        // Update context state and local cache
        setEngineerProfile(cloudData);
        localStorage.setItem("installerway_profile", JSON.stringify(cloudData));
      }

      // 2. Fetch cross-device active project / designs if available
      const projRef = doc(db, "projects", currentUser.uid);
      const projSnap = await getDoc(projRef);
      if (projSnap.exists()) {
        const cloudProject = projSnap.data();
        if (cloudProject.loads) setAuditLoads(cloudProject.loads);
        if (cloudProject.systemSize) setSystemSizing(cloudProject.systemSize);
      }
    } catch (err) {
      console.warn("Cross-device sync note:", err);
    }
  });

  return () => unsubscribe();
}, []);