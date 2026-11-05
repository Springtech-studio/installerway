"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// --- Domain Models & Interfaces ---

export interface ApplianceLoad {
  id: string;
  name: string;
  qty: number;
  watts: number;
  hoursDay: number;
  hoursNight: number;
  surgeMultiplier: number;
  quantity?: number;
  wattage?: number;
  dailyHours?: number;
}

export interface InverterProduct {
  id: string;
  brand: string;
  model: string;
  type: string;
  name: string;
  ratedKw: number;
  kva: number;
  surgeKw: number;
  voltage: number;
  dcVoltage: number;
  efficiency: number;
  mpptRange: string;
  maxVoc: number;
  mpptMinV: number;
  maxPvKw: number;
  priceNgn: number;
  [key: string]: any;
}

export interface BatteryProduct {
  id: string;
  brand: string;
  model: string;
  name: string;
  chemistry: string;
  nominalKwh: number;
  capacityKwh: number;
  voltage: number;
  nominalVoltage: number;
  capacityAh: number;
  dod: number;
  recommendedDoD: number;
  cycles: number;
  priceNgn: number;
  [key: string]: any;
}

export interface PanelProduct {
  id: string;
  brand: string;
  model: string;
  name: string;
  tech: string;
  powerWp: number;
  pMax: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  efficiency: number;
  priceNgn: number;
  [key: string]: any;
}

export interface EngineerProfile {
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

export interface SolarDesignTotals {
  continuousWatts: number;
  peakSurgeWatts: number;
  dayWattHours: number;
  nightWattHours: number;
  dailyEnergyWattHours: number;
  dailyEnergyKwh: number;
  totalDailyKwh: number;
  dayKwh: number;
  nightKwh: number;
  peakKvaWithHeadroom: number;
}

export interface BatteryCalculationResults {
  requiredKwh: number;
  recommendedKwh: number;
  totalStorageKwh: number;
  usableKwhNeeded: number;
  modulesCount: number;
  recommendedAh: number;
  totalUnits: number;
  seriesCount: number;
  parallelCount: number;
  dodUsed: number;
  autonomyDays: number;
}

export interface PVConfigurationResults {
  targetKwp: number;
  totalPanels: number;
  panelsInSeries: number;
  seriesPanels: number;
  parallelStrings: number;
  actualKwp: number;
  dailyGenerationKwh: number;
  stringVocCold: number;
  stringVmpHot: number;
  isCompliant: boolean;
}

export interface BOMItem {
  id: string;
  category: "Solar PV" | "Inverter" | "Battery" | "BOS / Protection" | "Installation / Labor";
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export type DesignScale = "residential" | "commercial" | "minigrid";

interface SolarDesignContextType {
  currentUser: User | null;
  engineerProfile: EngineerProfile;
  setEngineerProfile: React.Dispatch<React.SetStateAction<EngineerProfile>>;
  saveEngineerProfileCloud: (profile: EngineerProfile) => Promise<void>;

  scale: DesignScale;
  setScale: (scale: DesignScale) => void;
  loadPresetForScale: (scale: DesignScale) => void;

  loads: ApplianceLoad[];
  setLoads: React.Dispatch<React.SetStateAction<ApplianceLoad[]>>;
  addLoad: (load: Omit<ApplianceLoad, "id">) => void;
  removeLoad: (id: string) => void;
  updateLoad: (id: string, updated: Partial<ApplianceLoad>) => void;

  totals: SolarDesignTotals;
  autonomyDays: number;
  setAutonomyDays: (days: number) => void;
  batteryResults: BatteryCalculationResults;
  targetKwp: number;
  pvConfig: PVConfigurationResults;

  selectedInverter: InverterProduct;
  setSelectedInverter: (inv: any) => void;
  selectedBattery: BatteryProduct;
  setSelectedBattery: (bat: any) => void;
  selectedPanel: PanelProduct;
  setSelectedPanel: (pnl: any) => void;

  psh: number;
  setPsh: (val: number) => void;
  peakSunHours: number;
  setPeakSunHours: (val: number) => void;
  systemVoltage: number;
  setSystemVoltage: (volts: number) => void;

  bomItems: BOMItem[];
  setBomItems: React.Dispatch<React.SetStateAction<BOMItem[]>>;
  currency: string;
  setCurrency: (curr: string) => void;
  isSyncing: boolean;
  saveActiveProjectToCloud: () => Promise<void>;
}

// --- Concrete Non-Undefined Defaults ---

const DEFAULT_PROFILE: EngineerProfile = {
  fullName: "Field Solar Practitioner",
  companyName: "Independent Solar Services",
  licenseId: "Field Technician / Independent Installer",
  accreditationBody: "Solar Technical Practitioner",
  email: "",
  phone: "",
  address: "",
  inverterHeadroom: 25,
  batteryDerating: 15,
};

const DEFAULT_INVERTER: InverterProduct = {
  id: "inv-5kw",
  name: "Deye 5kW Pure Sine Wave Hybrid Inverter",
  brand: "Deye",
  model: "SUN-5K-SG03LP1",
  type: "Hybrid Pure Sine Wave",
  ratedKw: 5.0,
  kva: 5.0,
  surgeKw: 10.0,
  voltage: 48,
  dcVoltage: 48,
  efficiency: 0.965,
  mpptRange: "125V - 425V",
  maxVoc: 500,
  mpptMinV: 125,
  maxPvKw: 6.5,
  priceNgn: 1250000,
};

const DEFAULT_BATTERY: BatteryProduct = {
  id: "bat-5kwh",
  name: "Felicity 5.12kWh 48V 100Ah LiFePO4 Battery",
  brand: "Felicity Solar",
  model: "FL-LPBF48100",
  chemistry: "Lithium Iron Phosphate (LiFePO4)",
  nominalKwh: 5.12,
  capacityKwh: 5.12,
  voltage: 48,
  nominalVoltage: 48,
  capacityAh: 100,
  dod: 0.85,
  recommendedDoD: 0.85,
  cycles: 6000,
  priceNgn: 1450000,
};

const DEFAULT_PANEL: PanelProduct = {
  id: "pv-550w",
  name: "Jinko Solar 550W Tiger Pro Half-Cell",
  brand: "Jinko Solar",
  model: "JKM550M-72HL4-V",
  tech: "Monocrystalline Half-Cell",
  powerWp: 550,
  pMax: 550,
  voc: 49.8,
  vmp: 41.9,
  isc: 14.0,
  imp: 13.13,
  efficiency: 0.213,
  priceNgn: 95000,
};

const PRESETS: Record<DesignScale, ApplianceLoad[]> = {
  residential: [
    { id: "1", name: "LED Lighting Network", qty: 10, watts: 15, hoursDay: 1, hoursNight: 6, surgeMultiplier: 1.0 },
    { id: "2", name: "Inverter Refrigerator", qty: 1, watts: 180, hoursDay: 12, hoursNight: 12, surgeMultiplier: 2.5 },
    { id: "3", name: "Smart TV & Soundbar", qty: 1, watts: 120, hoursDay: 2, hoursNight: 5, surgeMultiplier: 1.2 },
    { id: "4", name: "Standing Fans", qty: 3, watts: 55, hoursDay: 4, hoursNight: 8, surgeMultiplier: 1.5 },
    { id: "5", name: "Inverter AC (1.5 HP)", qty: 1, watts: 1100, hoursDay: 4, hoursNight: 2, surgeMultiplier: 2.2 },
  ],
  commercial: [
    { id: "c1", name: "Inverter AC Units (2 HP)", qty: 4, watts: 1600, hoursDay: 8, hoursNight: 0, surgeMultiplier: 2.5 },
    { id: "c2", name: "Workstations & Displays", qty: 12, watts: 250, hoursDay: 9, hoursNight: 0, surgeMultiplier: 1.1 },
    { id: "c3", name: "Commercial Server Rack & UPS", qty: 1, watts: 850, hoursDay: 12, hoursNight: 12, surgeMultiplier: 1.2 },
    { id: "c4", name: "Perimeter Security & Lighting", qty: 20, watts: 50, hoursDay: 0, hoursNight: 12, surgeMultiplier: 1.0 },
  ],
  minigrid: [
    { id: "m1", name: "Agricultural Solar Pump (5 HP)", qty: 2, watts: 3750, hoursDay: 6, hoursNight: 0, surgeMultiplier: 3.5 },
    { id: "m2", name: "Clinic Cold Chain & Vaccines", qty: 3, watts: 450, hoursDay: 12, hoursNight: 12, surgeMultiplier: 2.0 },
    { id: "m3", name: "Market Lighting & Retail Hubs", qty: 40, watts: 80, hoursDay: 2, hoursNight: 10, surgeMultiplier: 1.0 },
  ],
};

const SolarDesignContext = createContext<SolarDesignContextType | undefined>(undefined);

export function SolarDesignProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [engineerProfile, setEngineerProfile] = useState<EngineerProfile>(DEFAULT_PROFILE);
  const [scale, setScale] = useState<DesignScale>("residential");
  const [loads, setLoads] = useState<ApplianceLoad[]>(PRESETS.residential);

  const [autonomyDays, setAutonomyDays] = useState<number>(1);
  const [psh, setPsh] = useState<number>(5.2);
  const [systemVoltage, setSystemVoltage] = useState<number>(48);
  const [currency, setCurrency] = useState<string>("NGN");

  const [selectedInverter, setSelectedInverter] = useState<InverterProduct>(DEFAULT_INVERTER);
  const [selectedBattery, setSelectedBattery] = useState<BatteryProduct>(DEFAULT_BATTERY);
  const [selectedPanel, setSelectedPanel] = useState<PanelProduct>(DEFAULT_PANEL);

  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Firestore Cross-Device Hydration
  useEffect(() => {
    const cachedProfile = localStorage.getItem("installerway_profile");
    if (cachedProfile) {
      try {
        setEngineerProfile(JSON.parse(cachedProfile));
      } catch (e) {
        console.warn("Local profile parse error:", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setCurrentUser(user);
      if (!user) return;

      try {
        const profRef = doc(db, "engineers", user.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) {
          const cloudData = profSnap.data() as EngineerProfile;
          setEngineerProfile(cloudData);
          localStorage.setItem("installerway_profile", JSON.stringify(cloudData));
        }

        const projRef = doc(db, "projects", user.uid);
        const projSnap = await getDoc(projRef);
        if (projSnap.exists()) {
          const pData = projSnap.data();
          if (pData.scale) setScale(pData.scale);
          if (pData.loads && Array.isArray(pData.loads)) setLoads(pData.loads);
          if (pData.systemVoltage) setSystemVoltage(pData.systemVoltage);
          if (pData.autonomyDays) setAutonomyDays(pData.autonomyDays);
          if (pData.psh) setPsh(pData.psh);
        }
      } catch (err) {
        console.warn("Hydration error:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPresetForScale = (selectedScale: DesignScale) => {
    setScale(selectedScale);
    setLoads(PRESETS[selectedScale] || PRESETS.residential);
    if (selectedScale === "residential") setSystemVoltage(48);
    if (selectedScale === "commercial") setSystemVoltage(48);
    if (selectedScale === "minigrid") setSystemVoltage(384);
  };

  // Electrical Load Totals
  const continuousWatts = loads.reduce((acc, item) => {
    const q = item.qty ?? item.quantity ?? 1;
    const w = item.watts ?? item.wattage ?? 0;
    return acc + q * w;
  }, 0);

  const peakSurgeWatts = loads.reduce((acc, item) => {
    const q = item.qty ?? item.quantity ?? 1;
    const w = item.watts ?? item.wattage ?? 0;
    const s = item.surgeMultiplier || 1.0;
    return acc + q * w * s;
  }, 0);

  const dayWattHours = loads.reduce((acc, item) => {
    const q = item.qty ?? item.quantity ?? 1;
    const w = item.watts ?? item.wattage ?? 0;
    const h = item.hoursDay ?? 0;
    return acc + q * w * h;
  }, 0);

  const nightWattHours = loads.reduce((acc, item) => {
    const q = item.qty ?? item.quantity ?? 1;
    const w = item.watts ?? item.wattage ?? 0;
    const h = item.hoursNight ?? item.dailyHours ?? 0;
    return acc + q * w * h;
  }, 0);

  const dailyEnergyWattHours = dayWattHours + nightWattHours;
  const dailyEnergyKwh = Math.round((dailyEnergyWattHours / 1000) * 100) / 100;
  const dayKwh = Math.round((dayWattHours / 1000) * 100) / 100;
  const nightKwh = Math.round((nightWattHours / 1000) * 100) / 100;

  const headroomMultiplier = 1 + (engineerProfile.inverterHeadroom || 25) / 100;
  const peakKvaWithHeadroom =
    Math.ceil(((continuousWatts * headroomMultiplier) / 1000) * 10) / 10;

  const totals: SolarDesignTotals = {
    continuousWatts,
    peakSurgeWatts,
    dayWattHours,
    nightWattHours,
    dailyEnergyWattHours,
    dailyEnergyKwh,
    totalDailyKwh: dailyEnergyKwh,
    dayKwh,
    nightKwh,
    peakKvaWithHeadroom: Math.max(peakKvaWithHeadroom, 1.0),
  };

  // Battery Calculation Results
  const deratingMultiplier = 1 + (engineerProfile.batteryDerating || 15) / 100;
  const dod = selectedBattery.recommendedDoD || selectedBattery.dod || 0.85;
  const batteryRequiredKwh = (nightWattHours / 1000) * autonomyDays;
  const recommendedKwh =
    Math.ceil(((batteryRequiredKwh * deratingMultiplier) / dod) * 10) / 10;
  const recommendedAh =
    Math.round(((recommendedKwh * 1000) / (systemVoltage || 48)) * 10) / 10;
  const unitCapacity = selectedBattery.capacityKwh || selectedBattery.nominalKwh || 5.12;
  const totalBatteryUnits = Math.max(1, Math.ceil(recommendedKwh / unitCapacity));

  const batteryResults: BatteryCalculationResults = {
    requiredKwh: Math.round(batteryRequiredKwh * 100) / 100,
    recommendedKwh: Math.max(recommendedKwh, 2.4),
    totalStorageKwh: Math.max(recommendedKwh, 2.4),
    usableKwhNeeded: Math.round(batteryRequiredKwh * 100) / 100,
    modulesCount: totalBatteryUnits,
    recommendedAh,
    totalUnits: totalBatteryUnits,
    seriesCount: 1,
    parallelCount: totalBatteryUnits,
    dodUsed: dod,
    autonomyDays,
  };

  // PV Configuration Results
  const targetKwp =
    Math.ceil((dailyEnergyWattHours / ((psh || 5.2) * 0.8 * 1000)) * 100) / 100;
  const panelPower = selectedPanel.pMax || selectedPanel.powerWp || 550;
  const totalPanelsRaw = Math.max(2, Math.ceil((targetKwp * 1000) / panelPower));
  const totalPanels = totalPanelsRaw % 2 === 0 ? totalPanelsRaw : totalPanelsRaw + 1;
  const seriesPanels = totalPanels / 2;
  const parallelStrings = 2;
  const actualKwp = Math.round(((totalPanels * panelPower) / 1000) * 100) / 100;
  const dailyGenerationKwh = Math.round(actualKwp * (psh || 5.2) * 0.8 * 10) / 10;

  const stringVocCold = Math.round(seriesPanels * (selectedPanel.voc || 49.8) * 1.12 * 10) / 10;
  const stringVmpHot = Math.round(seriesPanels * (selectedPanel.vmp || 41.9) * 0.88 * 10) / 10;
  const isCompliant =
    stringVocCold <= (selectedInverter.maxVoc || 500) &&
    stringVmpHot >= (selectedInverter.mpptMinV || 120);

  const pvConfig: PVConfigurationResults = {
    targetKwp: Math.max(targetKwp, 0.8),
    totalPanels,
    panelsInSeries: seriesPanels,
    seriesPanels,
    parallelStrings,
    actualKwp,
    dailyGenerationKwh,
    stringVocCold,
    stringVmpHot,
    isCompliant,
  };

  // Load Handlers
  const addLoad = (load: Omit<ApplianceLoad, "id">) => {
    const newLoad: ApplianceLoad = {
      ...load,
      id: Date.now().toString(),
      qty: load.qty ?? (load as any).quantity ?? 1,
      watts: load.watts ?? (load as any).wattage ?? 0,
      hoursDay: load.hoursDay ?? 0,
      hoursNight: load.hoursNight ?? (load as any).dailyHours ?? 0,
    };
    setLoads((prev) => [...prev, newLoad]);
  };

  const removeLoad = (id: string) => {
    setLoads((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLoad = (id: string, updated: Partial<ApplianceLoad>) => {
    setLoads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          ...updated,
          qty: updated.qty ?? updated.quantity ?? item.qty,
          watts: updated.watts ?? updated.wattage ?? item.watts,
          hoursDay: updated.hoursDay ?? item.hoursDay,
          hoursNight: updated.hoursNight ?? updated.dailyHours ?? item.hoursNight,
        };
      })
    );
  };

  const saveEngineerProfileCloud = async (newProfile: EngineerProfile) => {
    setEngineerProfile(newProfile);
    localStorage.setItem("installerway_profile", JSON.stringify(newProfile));

    if (currentUser) {
      try {
        await setDoc(
          doc(db, "engineers", currentUser.uid),
          {
            ...newProfile,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Failed saving profile to cloud:", err);
      }
    }
  };

  const saveActiveProjectToCloud = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      await setDoc(
        doc(db, "projects", currentUser.uid),
        {
          scale,
          loads,
          systemVoltage,
          autonomyDays,
          psh,
          totals,
          pvConfig,
          batteryResults,
          selectedInverter,
          selectedBattery,
          selectedPanel,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Project sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SolarDesignContext.Provider
      value={{
        currentUser,
        engineerProfile,
        setEngineerProfile,
        saveEngineerProfileCloud,
        scale,
        setScale,
        loadPresetForScale,
        loads,
        setLoads,
        addLoad,
        removeLoad,
        updateLoad,
        totals,
        autonomyDays,
        setAutonomyDays,
        batteryResults,
        targetKwp,
        pvConfig,
        selectedInverter,
        setSelectedInverter: (inv: any) =>
          setSelectedInverter((prev) => ({
            ...prev,
            ...inv,
            ratedKw: inv.ratedKw ?? prev.ratedKw,
            surgeKw: inv.surgeKw ?? prev.surgeKw,
            type: inv.type ?? prev.type,
          })),
        selectedBattery,
        setSelectedBattery: (bat: any) =>
          setSelectedBattery((prev) => ({
            ...prev,
            ...bat,
            recommendedDoD: bat.recommendedDoD ?? bat.dod ?? prev.recommendedDoD,
            capacityKwh: bat.capacityKwh ?? bat.nominalKwh ?? prev.capacityKwh,
            nominalKwh: bat.nominalKwh ?? bat.capacityKwh ?? prev.nominalKwh,
          })),
        selectedPanel,
        setSelectedPanel: (pnl: any) =>
          setSelectedPanel((prev) => ({
            ...prev,
            ...pnl,
            powerWp: pnl.powerWp ?? pnl.pMax ?? prev.powerWp,
            pMax: pnl.pMax ?? pnl.powerWp ?? prev.pMax,
            tech: pnl.tech ?? prev.tech,
          })),
        psh,
        setPsh,
        peakSunHours: psh,
        setPeakSunHours: setPsh,
        systemVoltage,
        setSystemVoltage,
        bomItems,
        setBomItems,
        currency,
        setCurrency,
        isSyncing,
        saveActiveProjectToCloud,
      }}
    >
      {children}
    </SolarDesignContext.Provider>
  );
}

export function useSolarDesign() {
  const context = useContext(SolarDesignContext);
  if (!context) {
    throw new Error("useSolarDesign must be used within a SolarDesignProvider");
  }
  return context;
}