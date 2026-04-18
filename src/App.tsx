import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Sparkles,
  Package,
  Car,
  HeartHandshake,
  CircleHelp,
  Layers3,
  Lock,
  Eye,
  Mail,
  BadgeCheck,
  RotateCcw,
} from "lucide-react";

const theme = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#FFFFFF",
  surfaceDark: "#151515",
  card: "#FFFFFF",
  border: "#D8CFBF",
  borderStrong: "#B8AC98",
  text: "#201B17",
  textSoft: "#5E564C",
  textMuted: "#7B7267",
  olive: "#687C2A",
  oliveDark: "#4E601D",
  navy: "#213A57",
  sage: "#E6EED4",
  shadow: "0 20px 50px rgba(26, 21, 16, 0.12)",
  radiusLg: 24,
  radiusMd: 18,
  radiusSm: 14,
};

const shop = {
  domain: "prepped.nz",
  imagePlaceholders: {
    preparation: "Preparation Pack image",
    water: "Water Security module image",
    power: "Power & Lighting module image",
    family: "Family Expansion module image",
    flood: "Flood Protection module image",
    vehicle: "Vehicle Survival module image",
    baby: "Baby Support module image",
    productLibrary: "Product collection image",
  },
};

const API_BASE = (((typeof window !== "undefined" && (window as any).__PREPPED_API_BASE__) || import.meta.env.VITE_API_BASE_URL || "") as string).replace(/\/$/, "");

const PROFILE_ID_STORAGE_KEY = "prepped_profile_id";
const SESSION_ID_STORAGE_KEY = "prepped_session_id";

function ensureSessionId() {
  if (typeof window === "undefined") return undefined;

  let sessionId = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}`;
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

function buildProfileApiCandidates() {
  const candidates: string[] = [];

  if (API_BASE) candidates.push(API_BASE);

  if (typeof window !== "undefined") {
    candidates.push(window.location.origin);

    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalHost) {
      candidates.push("http://localhost:3001");
      candidates.push("http://127.0.0.1:3001");
    }
  }

  return [...new Set(candidates.map((value) => value.replace(/\/$/, "")))];
}

function estimateStorageSpace(home: string) {
  if (["Apartment", "Tiny home / minimal living", "Travelling / visiting from overseas"].includes(home)) return "low";
  if (["Townhouse / new build", "Temporary / shared / other"].includes(home)) return "medium";
  if (["Rural / lifestyle block", "House (older style)", "House (modern)", "Retirement Living"].includes(home)) return "medium";
  return "medium";
}

function estimateVehicleCapacity(accessChips: string[], statedCapacity: number) {
  if (statedCapacity > 0) return statedCapacity;
  if (accessChips.includes("No car")) return 0;
  if (accessChips.includes("Small car")) return 4;
  if (accessChips.includes("4WD / ute")) return 5;
  return 5;
}

function mapCurrentToDepth(current: string[], key: "food" | "water") {
  if (current.includes("I think I have everything")) return "3+ days";
  if (key === "food") return current.includes("Some food stored") ? "1-2 days" : "<1 day";
  return current.includes("Some water stored") ? "1-2 days" : "<1 day";
}

function buildBackendPayload(answers: Answers) {
  const current = (answers.current as string[]) || [];
  const accessChips = (answers.access_chips as string[]) || [];
  const locations = (answers.locations as string[]) || [];

  const adults = countFromAnswers(answers, "adult_count") + countFromAnswers(answers, "adult_support_count");
  const children =
    countFromAnswers(answers, "toddlers_count") +
    countFromAnswers(answers, "toddlers_support_count") +
    countFromAnswers(answers, "kids_count") +
    countFromAnswers(answers, "kids_support_count") +
    countFromAnswers(answers, "teens_count") +
    countFromAnswers(answers, "teens_support_count");
  const babies = countFromAnswers(answers, "infants_count") + countFromAnswers(answers, "infants_support_count");
  const pets = countFromAnswers(answers, "pets_count") + countFromAnswers(answers, "pets_support_count");
  const statedVehicleCount = Math.max(0, countFromAnswers(answers, "vehicle_count"));
  const vehicleCount = accessChips.includes("No car") ? 0 : Math.max(1, statedVehicleCount || 1);

  return {
    session_id: ensureSessionId(),
    email: (answers.email as string) || undefined,
    location_text: (answers.location_text as string) || undefined,
    location_region: (answers.location_region as string) || undefined,
    location_id: answers.location_id ?? undefined,
    location_lat: answers.location_lat ?? undefined,
    location_lng: answers.location_lng ?? undefined,
    location_suburb: (answers.location_suburb as string) || undefined,
    location_city: (answers.location_city as string) || undefined,
    adults,
    children,
    babies,
    pets,
    housing_type: (answers.home as string) || undefined,
    storage_space: estimateStorageSpace((answers.home as string) || ""),
    vehicle_count: vehicleCount,
    vehicle_capacity: estimateVehicleCapacity(accessChips, Math.max(0, countFromAnswers(answers, "vehicle_capacity"))),
    food_depth: mapCurrentToDepth(current, "food"),
    water_depth: mapCurrentToDepth(current, "water"),
    blackout_ready: current.includes("Torch / lighting") && current.includes("Power bank"),
    first_aid_ready: current.includes("First aid kit"),
    documents_ready: current.includes("Important documents organised"),
    multi_location: locations,
    raw_answers: answers,
  };
}

function buildAddressSearchCandidates() {
  const candidates: string[] = [];

  if (API_BASE) {
    candidates.push(`${API_BASE}/api/address-search`);
  }

  if (typeof window !== "undefined") {
    candidates.push(`${window.location.origin}/api/address-search`);

    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalHost) {
      candidates.push("http://localhost:3001/api/address-search");
      candidates.push("http://127.0.0.1:3001/api/address-search");
    }
  }

  return [...new Set(candidates)];
}

function mergeRestoredAnswers(profile: any) {
  const profileAnswers = (profile?.answers && typeof profile.answers === "object") ? profile.answers : {};
  const rawQuizAnswers = (profileAnswers?.raw_answers && typeof profileAnswers.raw_answers === "object") ? profileAnswers.raw_answers : {};
  const sourceAnswers = {
    ...profileAnswers,
    ...rawQuizAnswers,
  };
  const household = (profile?.household && typeof profile.household === "object") ? profile.household : {};
  const logistics = (profile?.logistics && typeof profile.logistics === "object") ? profile.logistics : {};
  const location = (profile?.location && typeof profile.location === "object") ? profile.location : {};
  const readiness = (profile?.readiness && typeof profile.readiness === "object") ? profile.readiness : {};

  const restored: Answers = { ...sourceAnswers } as Answers;

  if (restored.location_text == null && location.text != null) restored.location_text = location.text;
  if (restored.location_region == null && location.region != null) restored.location_region = location.region;
  if (restored.location_suburb == null && location.suburb != null) restored.location_suburb = location.suburb;
  if (restored.location_city == null && location.city != null) restored.location_city = location.city;

  if (!(Number(restored.adult_count || 0) > 0) && typeof household.adults === "number") {
    restored.adult_count = household.adults;
  }
  if (!(Number(restored.infants_count || 0) > 0) && typeof household.babies === "number") {
    restored.infants_count = household.babies;
  }
  const hasChildCounts = Number(restored.toddlers_count || 0) > 0 || Number(restored.kids_count || 0) > 0 || Number(restored.teens_count || 0) > 0;
  if (!hasChildCounts && typeof household.children === "number") {
    restored.kids_count = household.children;
  }
  if (!(Number(restored.pets_count || 0) > 0) && typeof household.pets === "number") {
    restored.pets_count = household.pets;
  }

  if (!Array.isArray(restored.location)) restored.location = [];
  if (!Array.isArray(restored.location_detail)) restored.location_detail = [];
  if (!Array.isArray(restored.access_chips)) restored.access_chips = [];
  if (!Array.isArray(restored.locations)) restored.locations = [];

  if (restored.home == null && logistics.housingType != null) restored.home = logistics.housingType;
  if (restored.storage_space == null && logistics.storageSpace != null) restored.storage_space = logistics.storageSpace;
  if ((restored.vehicle_count == null || restored.vehicle_count === "") && logistics.vehicleCount != null) {
    restored.vehicle_count = logistics.vehicleCount;
  }
  if ((restored.vehicle_capacity == null || restored.vehicle_capacity === "") && logistics.vehicleCapacity != null) {
    restored.vehicle_capacity = logistics.vehicleCapacity;
  }

  const totalSupportCount =
    Number(restored.adult_support_count || 0) +
    Number(restored.teens_support_count || 0) +
    Number(restored.kids_support_count || 0) +
    Number(restored.toddlers_support_count || 0) +
    Number(restored.infants_support_count || 0) +
    Number(restored.pets_support_count || 0);

  if (restored.household_dependency == null) {
    restored.household_dependency = totalSupportCount > 0 ? "Yes" : "No";
  }

  if (!Array.isArray(restored.current)) {
    const current: string[] = [];
    if (readiness.foodDepth && readiness.foodDepth !== "<1 day") current.push("Some food stored");
    if (readiness.waterDepth && readiness.waterDepth !== "<1 day") current.push("Some water stored");
    if (readiness.blackoutReady) {
      current.push("Torch / lighting");
      current.push("Power bank");
    }
    if (readiness.firstAidReady) current.push("First aid kit");
    if (readiness.documentsReady) current.push("Important documents organised");
    restored.current = current;
  }

  delete (restored as any).raw_answers;

  return restored;
}

function errorToMessage(error: unknown, fallback = "Something went wrong.") {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as Record<string, unknown>;
    if (typeof maybeError.error === "string") return maybeError.error;
    if (typeof maybeError.message === "string") return maybeError.message;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

type AddressResult = {
  id: string | number | null;
  fullAddress: string;
  suburb: string;
  city: string;
  region: string;
  lat: number | null;
  lng: number | null;
};

type Answers = Record<string, any>;

type Question = {
  id: string;
  eyebrow?: string;
  title: string;
  helper: string;
  why?: string;
  type: "single" | "multi" | "multiLimit" | "location" | "people" | "access" | "transition";
  options?: string[];
  chips?: string[];
  limit?: number;
  detailFields?: string[];
};

type Recommendation = {
  path: "Starter" | "Risk-led" | "Family-led";
  summary: string;
  confidence: "High fit" | "Good fit" | "Needs refinement";
  preparationPackQty: number;
  homePackQty: number;
  carPackQty: number;
  secondBasePack: boolean;
  stage: "Preparing" | "Resourcing" | "Expanding";
  mainProduct: ProductCard;
  addOns: ProductCard[];
  why: string[];
  nextActions: string[];
  reflection: string[];
  genericBrowseNotes: string[];
};

type ProductCard = {
  title: string;
  handle: string;
  subtitle: string;
  imageLabel: string;
  quantity: number;
  reason: string;
  badge?: string;
};


const landingPills = [
  "Tailored to your\nhousehold",
  "2–3 minutes to\ncomplete",
  "Customisable",
  "Designed for\ngrowth",
];

const questions: Question[] = [
  {
    id: "location",
    eyebrow: "Step 1",
    title: "Where are you usually based?",
    helper: "This helps us tailor likely risks, access pressure, and support needs.",
    why: "Location shapes disruption, travel pressure, and what a practical setup should prioritise first.",
    type: "location",
    chips: ["Rural / lifestyle", "Suburban", "Apartment / townhouse", "Near coast / river", "Not sure"],
    detailFields: ["Known flood area", "Steep hills / slips", "Single road in / out"],
  },
  {
    id: "people",
    eyebrow: "Step 2",
    title: "Who are you preparing for?",
    helper: "We’ll shape the plan around the people who rely on it.",
    why: "Household makeup changes quantity, comfort needs, and which add-ons matter most.",
    type: "people",
  },
  {
    id: "context",
    eyebrow: "Step 3",
    title: "What feels most true right now?",
    helper: "This helps us keep the recommendation practical.",
    why: "Preparedness works better when the path feels realistic, not idealised.",
    type: "single",
    options: [
      "Life is full right now",
      "We’ve had recent changes",
      "Budget feels tight",
      "I’ve meant to do this for a while",
      "I’m ready to get sorted",
      "Just curious",
    ],
  },
  {
    id: "home",
    eyebrow: "Step 4",
    title: "What kind of place are you living in?",
    helper: "Homes behave differently in outages, storms, and evacuation situations.",
    why: "The same starter setup does not work equally well across apartments, family homes, and rural properties.",
    type: "single",
    options: [
      "House (older style)",
      "House (modern)",
      "Townhouse / new build",
      "Apartment",
      "Retirement Living",
      "Travelling / visiting from overseas",
      "Tiny home / minimal living",
      "Rural / lifestyle block",
      "Temporary / shared / other",
    ],
  },
  {
    id: "access",
    eyebrow: "Step 5",
    title: "How easy is it to move or get support if needed?",
    helper: "This helps us understand isolation, transport pressure, vehicle reliance, and what could become harder.",
    why: "Access and vehicle availability change how much you can rely on outside help and whether home, car, or split coverage matters more.",
    type: "access",
    options: ["Easy — services are close", "Mostly manageable", "A bit limited", "Quite isolated"],
    chips: ["One road in / out", "No car", "Small car", "4WD / ute", "Family nearby", "Community hub nearby"],
  },
  {
    id: "motivation",
    eyebrow: "Step 6",
    title: "What brought you here?",
    helper: "There’s no wrong answer. We just want to understand your starting point.",
    why: "Motivation helps us frame the recommendation in a way that feels supportive rather than pushy.",
    type: "single",
    options: [
      "Recent weather or disruption",
      "Peace of mind",
      "Family safety",
      "A close call before",
      "Want to be more self-reliant",
      "Want to support others too",
    ],
  },
  {
    id: "priority",
    eyebrow: "Step 7",
    title: "What do you want to feel prepared for first?",
    helper: "Choose up to three so we can keep the plan focused.",
    why: "Clear priorities help us avoid overwhelming you with too many directions at once.",
    type: "multiLimit",
    limit: 3,
    chips: [
      "Storms / cyclones",
      "Flooding",
      "Power outages",
      "Earthquakes",
      "Being stuck without access",
      "Cold / winter",
      "Heat / water shortages",
      "Supply disruptions",
      "Evacuation",
      "Looking after kids / baby",
    ],
  },
  {
    id: "current",
    eyebrow: "Step 8",
    title: "What do you already have covered?",
    helper: "Even a few things in place can shift the recommendation.",
    why: "We want to build from what you already have, not make you start from zero if you don’t need to.",
    type: "multi",
    chips: [
      "Some food stored",
      "Some water stored",
      "Torch / lighting",
      "Power bank",
      "First aid kit",
      "Baby supplies",
      "Car kit",
      "Important documents organised",
      "I think I have everything",
      "Not much yet",
    ],
  },
  {
    id: "budget",
    eyebrow: "Step 9",
    title: "What feels realistic for a first step?",
    helper: "We want to match your situation, not overpush it.",
    why: "A strong first step should feel achievable enough to act on now.",
    type: "single",
    options: ["Start small", "Practical and affordable", "Happy to invest properly", "Show me the simplest option"],
  },
  {
    id: "complexity",
    eyebrow: "Step 10",
    title: "How would you like to begin?",
    helper: "We can keep it simple or show a broader path.",
    why: "Some people want a clear first step. Others want a fuller roadmap from day one.",
    type: "single",
    options: ["Keep it simple", "Give me a solid starter setup", "Show the longer-term path"],
  },
  {
    id: "locations",
    eyebrow: "Step 11",
    title: "Any other places we should account for (You or your household)?",
    helper: "Sometimes the real picture includes work, school, family, or regular movement.",
    why: "Split locations often change what should live at home, in the car, or near daily routines.",
    type: "multi",
    chips: ["Work location", "Childcare / school", "Holiday home", "Family home", "Regular travel", "No"],
  },
  {
    id: "execution",
    eyebrow: "Step 12",
    title: "How would you like support to feel?",
    helper: "Some people want to build it themselves. Others want more guidance.",
    why: "This helps us decide how guided or self-directed the experience should feel later.",
    type: "single",
    options: ["I’m happy to DIY", "Guide me step by step", "Show me the best pre-built option", "The less decisions, the better"],
  },
  {
    id: "transition",
    eyebrow: "Final step",
    title: "You’re almost there.",
    helper: "We’ll turn this into a starting point you can act on, save, and refine later.",
    why: "Your email unlocks the tailored layer so we can treat this as the beginning of an ongoing journey, not just a one-off browse.",
    type: "transition",
  },
];

function toggleValue(arr: string[], value: string, limit?: number) {
  if (arr.includes(value)) return arr.filter((v) => v !== value);
  if (limit && arr.length >= limit) return arr;
  return [...arr, value];
}

function countFromAnswers(answers: Answers, key: string) {
  return Number(answers[key] || 0);
}

const STAGE_SEQUENCE = ["Preparing", "Resourcing", "Expanding", "Personalising", "Practising", "Embedding", "Dependable"] as const;
type StageLabel = typeof STAGE_SEQUENCE[number];


function buildSelectedReasons(answers: Answers, recommendation: Recommendation) {
  const reasons: string[] = [];
  const locationText = (answers.location_text as string) || "";
  const home = (answers.home as string) || "";
  const priorities = ((answers.priority as string[]) || []).filter(Boolean);
  const current = ((answers.current as string[]) || []).filter(Boolean);
  const access = (answers.access as string) || "";
  const budget = (answers.budget as string) || "";

  const adultCount = countFromAnswers(answers, "adult_count") + countFromAnswers(answers, "adult_support_count");
  const babyCount = countFromAnswers(answers, "infants_count") + countFromAnswers(answers, "infants_support_count");
  const toddlerCount = countFromAnswers(answers, "toddlers_count") + countFromAnswers(answers, "toddlers_support_count");
  const childCount = countFromAnswers(answers, "kids_count") + countFromAnswers(answers, "kids_support_count");
  const teenCount = countFromAnswers(answers, "teens_count") + countFromAnswers(answers, "teens_support_count");
  const petCount = countFromAnswers(answers, "pets_count") + countFromAnswers(answers, "pets_support_count");

  const peopleBits = [
    adultCount ? `${adultCount} adult${adultCount === 1 ? "" : "s"}` : "",
    babyCount ? `${babyCount} bab${babyCount === 1 ? "y" : "ies"}` : "",
    toddlerCount ? `${toddlerCount} toddler${toddlerCount === 1 ? "" : "s"}` : "",
    childCount ? `${childCount} child${childCount === 1 ? "" : "ren"}` : "",
    teenCount ? `${teenCount} teen${teenCount === 1 ? "" : "s"}` : "",
    petCount ? `${petCount} pet${petCount === 1 ? "" : "s"}` : "",
  ].filter(Boolean);

  if (peopleBits.length) reasons.push(`You are preparing for ${peopleBits.join(", ")}.`);
  if (locationText || home) reasons.push(`Your setup needs to fit ${locationText || "your area"}${home ? `, in a ${home.toLowerCase()}` : ""}.`);
  if (priorities.length) reasons.push(`Your biggest stated pressure points were ${priorities.slice(0, 3).join(", ").toLowerCase()}.`);

  const lackingEssentials: string[] = [];
  if (!current.includes("Some water stored")) lackingEssentials.push("water depth");
  if (!current.includes("Torch / lighting")) lackingEssentials.push("lighting");
  if (!current.includes("Power bank")) lackingEssentials.push("backup charging");
  if (!current.includes("Important documents organised")) lackingEssentials.push("document readiness");
  if (lackingEssentials.length) reasons.push(`The current setup still looks light on ${lackingEssentials.slice(0, 3).join(", ")}.`);

  if (access) reasons.push(`Access currently looks ${access.toLowerCase()}, which affects how much can live at home versus in the car.`);
  if (budget) reasons.push(`Your preferred starting budget is ${budget.toLowerCase()}, so the first step is designed to stay realistic.`);

  if (!reasons.length) reasons.push(...recommendation.why);
  return reasons.slice(0, 5);
}

function buildRecommendation(answers: Answers): Recommendation {
  const current = (answers.current as string[]) || [];
  const priority = (answers.priority as string[]) || [];
  const location = (answers.location as string[]) || [];
  const accessChips = (answers.access_chips as string[]) || [];
  const locations = (answers.locations as string[]) || [];
  const home = (answers.home as string) || "";
  const budget = (answers.budget as string) || "";
  const motivation = (answers.motivation as string) || "";
  const execution = (answers.execution as string) || "";
  const complexity = (answers.complexity as string) || "";
  const context = (answers.context as string) || "";
  const locationText = (answers.location_text as string) || "your area";

  const adults = countFromAnswers(answers, "adult_count");
  const supportAdults = countFromAnswers(answers, "adult_support_count");
  const babies = countFromAnswers(answers, "infants_count");
  const supportBabies = countFromAnswers(answers, "infants_support_count");
  const toddlers = countFromAnswers(answers, "toddlers_count");
  const supportToddlers = countFromAnswers(answers, "toddlers_support_count");
  const children = countFromAnswers(answers, "kids_count");
  const supportChildren = countFromAnswers(answers, "kids_support_count");
  const teenCount = countFromAnswers(answers, "teens_count");
  const supportTeens = countFromAnswers(answers, "teens_support_count");
  const pets = countFromAnswers(answers, "pets_count");
  const supportPets = countFromAnswers(answers, "pets_support_count");
  const noCar = accessChips.includes("No car");
  const statedVehicleCount = Math.max(0, countFromAnswers(answers, "vehicle_count"));
  const statedVehicleCapacity = Math.max(0, countFromAnswers(answers, "vehicle_capacity"));
  const overseasVisitor = home === "Travelling / visiting from overseas";

  const householdWeight = Math.max(0, adults) + supportAdults * 0.75 + babies * 1.25 + supportBabies * 0.35 + toddlers * 1 + supportToddlers * 0.3 + children * 0.85 + supportChildren * 0.25 + teenCount * 0.75 + supportTeens * 0.25 + pets * 0.3 + supportPets * 0.1;
  const readinessGap = Math.max(0, 5 - current.filter((x) => x !== "Not much yet" && x !== "I think I have everything").length) + (current.includes("Not much yet") ? 2 : 0);

  const prepQty = Math.max(1, Math.ceil(Math.max(1, householdWeight) / 2));
  const multiplePropertySignal = locations.includes("Holiday home") || locations.includes("Family home");
  const homeQty = overseasVisitor ? 0 : (multiplePropertySignal ? 2 : 1);
  const carQty = noCar ? 0 : Math.max(1, statedVehicleCount || 1);
  const carCapacity = noCar ? 0 : Math.max(1, statedVehicleCapacity || 5);

  const addOns: ProductCard[] = [];
  const pushAddOn = (item: ProductCard) => {
    if (!addOns.find((x) => x.handle === item.handle)) addOns.push(item);
  };

  if (priority.includes("Power outages") || !current.includes("Torch / lighting") || !current.includes("Power bank")) {
    pushAddOn({ title: "Power & Lighting", handle: "expansion-pack-power-and-lighting", subtitle: "Keep communication and visibility going.", imageLabel: shop.imagePlaceholders.power, quantity: 1, reason: "Useful if outages are likely or your current setup is light.", badge: "High impact" });
  }
  if (priority.includes("Flooding") || priority.includes("Heat / water shortages") || priority.includes("Supply disruptions") || location.includes("Near coast / river") || !current.includes("Some water stored")) {
    pushAddOn({ title: "Water Security", handle: "expansion-pack-water-security", subtitle: "Improve water depth and flexibility.", imageLabel: shop.imagePlaceholders.water, quantity: Math.max(1, Math.ceil(prepQty / 2)), reason: "Water is often the fastest pressure point in disruption.", badge: "Core layer" });
  }
  if (children + toddlers + babies >= 1) {
    pushAddOn({ title: babies > 0 ? "Baby Support" : "Family Expansion", handle: babies > 0 ? "expansion-pack-baby-support" : "expansion-pack-family-expansion", subtitle: babies > 0 ? "Support infant continuity and comfort." : "Scale the setup for child-dependent households.", imageLabel: babies > 0 ? shop.imagePlaceholders.baby : shop.imagePlaceholders.family, quantity: 1, reason: "Dependency changes what preparedness needs to look like.", badge: "Household fit" });
  }
  if (priority.includes("Flooding") || priority.includes("Storms / cyclones")) {
    pushAddOn({ title: "Flood Protection", handle: "expansion-pack-flood-protection", subtitle: "Protect documents, storage, and quick-move items.", imageLabel: shop.imagePlaceholders.flood, quantity: 1, reason: "Helps with waterproofing and rapid movement under pressure.", badge: "Risk fit" });
  }
  if (!noCar) {
    pushAddOn({ title: "Vehicle Survival", handle: "expansion-pack-vehicle-survival", subtitle: "Adds support for travel, evacuation, and day-to-day vehicle dependence.", imageLabel: shop.imagePlaceholders.vehicle, quantity: Math.max(1, carQty), reason: "Recommended by default unless you tell us there is no car available.", badge: "Lifestyle fit" });
  }

  const path: Recommendation["path"] = motivation === "Want to be more self-reliant" || complexity === "Show the longer-term path"
    ? "Family-led"
    : priority.some((p) => ["Flooding", "Storms / cyclones", "Earthquakes", "Power outages"].includes(p))
      ? "Risk-led"
      : "Starter";

  const fullyCovered = current.includes("I think I have everything") && readinessGap <= 1 && current.includes("Some food stored") && current.includes("Some water stored") && current.includes("Torch / lighting") && current.includes("Power bank") && current.includes("First aid kit") && current.includes("Important documents organised");
  const stage: Recommendation["stage"] = fullyCovered ? "Expanding" : readinessGap >= 4 ? "Preparing" : "Resourcing";

  return {
    path,
    summary: path === "Risk-led"
      ? "Start with the absolute essentials first, then layer in the risks most likely to affect you."
      : path === "Family-led"
        ? "Start with essential coverage for the people relying on you, then deepen the home setup over time."
        : "Begin with the absolute essentials first, then expand only where it matters most.",
    confidence: readinessGap >= 5 ? "High fit" : readinessGap >= 3 ? "Good fit" : "Needs refinement",
    preparationPackQty: prepQty,
    homePackQty: homeQty,
    carPackQty: carQty,
    secondBasePack: prepQty > 1 || locations.includes("Childcare / school") || locations.includes("Work location") || homeQty > 1,
    stage,
    mainProduct: {
      title: "Preparation Pack",
      handle: "preparation-pack",
      subtitle: "Start with the absolute essentials first, then build into home coverage over time.",
      imageLabel: shop.imagePlaceholders.preparation,
      quantity: prepQty,
      reason: prepQty > 1 ? "Your household profile suggests more than one Preparation Pack is the most realistic way to cover the essentials first." : "A strong baseline gives you the absolute essentials before you move into home-based systems.",
      badge: stage,
    },
    addOns: addOns.slice(0, 3),
    why: [
      `You appear to be planning for ${householdWeight > 4 ? "a higher-demand household" : "a manageable starter household"}.`,
      priority.length ? `Your strongest pressure points look like ${priority.slice(0, 2).join(" and ").toLowerCase()}.` : "You’re looking for a calm, practical place to begin.",
      budget ? `Your stated budget preference points toward a ${budget.toLowerCase()} path.` : "We’ve kept the first recommendation realistic and editable.",
      execution ? `Your preferred support style is ${execution.toLowerCase()}.` : "",
    ].filter(Boolean) as string[],
    nextActions: [
      prepQty > 1 ? `Start with ${prepQty} Preparation Packs based on your household size and location split.` : `Start with ${prepQty} Preparation Pack${prepQty > 1 ? "s" : ""}.`,
      addOns[0] ? `Add ${addOns[0].title} next for the biggest lift in coverage.` : "Add one extension module once the baseline is covered.",
      carQty > 0 ? `Cover ${carQty} vehicle${carQty > 1 ? "s" : ""}${carCapacity ? ` at around ${carCapacity} seats each` : ""} if transport is part of your likely response.` : "Keep your next step focused on home and personal coverage first.",
      "Save your plan so it can evolve as life changes.",
    ],
    reflection: [
      `You’re preparing for ${[
        adults ? `${adults} adult${adults > 1 ? "s" : ""}` : null,
        supportAdults ? `${supportAdults} adult${supportAdults > 1 ? "s" : ""} requiring support` : null,
        babies ? `${babies} infant${babies > 1 ? "s" : ""}` : null,
        toddlers ? `${toddlers} toddler${toddlers > 1 ? "s" : ""}` : null,
        children ? `${children} kid${children > 1 ? "s" : ""}` : null,
        teenCount ? `${teenCount} teen${teenCount > 1 ? "s" : ""}` : null,
        pets ? `${pets} pet${pets > 1 ? "s" : ""}` : null,
      ].filter(Boolean).join(", ") || "your household"}.`,
      `Your main environment looks like ${home || location[0] || locationText}.`,
      `Right now the system reads your tone as ${context || "ready to begin"}.`,
    ],
    genericBrowseNotes: [
      "You can still browse the PREPPED product range without unlocking the tailored layer.",
      "The deeper explanation, fit logic, and saved plan are reserved for households that choose to continue with email or account creation.",
      "This keeps the personalised pathway connected to an ongoing customer journey rather than a one-off anonymous browse.",
    ],
  };
}


function Container({ children, maxWidth = "1240px" }: { children: React.ReactNode; maxWidth?: string }) {
  return <div style={{ width: `min(${maxWidth}, calc(100vw - 24px))`, margin: "0 auto", display: "block" }}>{children}</div>;
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 40,
    borderRadius: 12,
    fontSize: 14,
    border: `1px solid ${theme.border}`,
    padding: "0 12px",
    background: theme.surface,
    color: theme.text,
    outline: "none",
  };
}

function linkButtonStyle(): React.CSSProperties {
  return {
    background: "none",
    border: 0,
    padding: 0,
    color: theme.oliveDark,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    cursor: "pointer",
  };
}

function buttonStyle(variant: "primary" | "secondary" | "ghost" = "secondary"): React.CSSProperties {
  const primary = variant === "primary";
  const ghost = variant === "ghost";
  return {
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    background: primary ? theme.navy : ghost ? "transparent" : theme.card,
    color: primary ? "#fff" : theme.text,
    border: primary ? "none" : `1px solid ${theme.border}`,
    padding: "0 12px",
    cursor: "pointer",
    width: "100%",
  };
}

function MetricCard({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 10 }}>
      <div style={{ color: "#CDE29C", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.55, fontSize: 14 }}>{text}</div>
    </div>
  );
}

function HowItWorks({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 10, alignItems: "start" }}>
      <div style={{ width: 44, height: 38, borderRadius: 12, background: theme.surfaceAlt, display: "grid", placeItems: "center", fontWeight: 900, color: theme.navy }}>{number}</div>
      <div>
        <div style={{ fontWeight: 800, color: theme.text }}>{title}</div>
        <div style={{ color: theme.textSoft, lineHeight: 1.55, marginTop: 4 }}>{text}</div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>{children}</div>;
}

function DarkMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 10 }}>
      <div style={{ color: "#B7D67A", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(255,255,255,0.65)", fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function StepPill({ label, active, onClick, quiet = false }: { label: string; active: boolean; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 40,
        minWidth: 112,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${active ? theme.navy : quiet ? theme.border : theme.borderStrong}`,
        background: active ? theme.navy : theme.card,
        color: active ? "#fff" : theme.text,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "center",
        whiteSpace: "pre-line",
      }}
    >
      {label}
    </button>
  );
}

function OptionCard({ label, active, onClick, compact = false }: { label: string; active: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: compact ? 46 : 52,
        textAlign: "left",
        padding: 14,
        borderRadius: theme.radiusSm,
        border: `1px solid ${active ? theme.navy : theme.border}`,
        background: active ? "#F2F6FB" : theme.card,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        boxShadow: active ? "0 10px 28px rgba(33,58,87,0.08)" : "none",
      }}
    >
      <div style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${active ? theme.navy : theme.borderStrong}`, display: "grid", placeItems: "center", flexShrink: 0, background: "#fff" }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, background: active ? theme.navy : "transparent" }} />
      </div>
      <span style={{ fontWeight: 700, color: theme.text, lineHeight: 1.35 }}>{label}</span>
    </button>
  );
}

function CountStepper({ label, value, onChange, compact = false }: { label: string; value: number; onChange: (next: number) => void; compact?: boolean }) {
  const labelSize = compact ? 10.5 : 12;
  const controlHeight = compact ? 38 : 46;
  const buttonWidth = compact ? 34 : 38;
  const borderRadius = compact ? 10 : 12;
  const fontSize = compact ? 18 : 22;
  return (
    <div>
      <div style={{ fontSize: labelSize, fontWeight: 900, letterSpacing: 1.0, textTransform: "uppercase", color: theme.textMuted, marginBottom: compact ? 6 : 8, lineHeight: 1.2 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: `${buttonWidth}px 1fr ${buttonWidth}px`, alignItems: "center", border: `1px solid ${theme.border}`, borderRadius, overflow: "hidden", background: theme.surface, width: "100%" }}>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} style={{ height: controlHeight, border: 0, background: value <= 0 ? theme.surfaceAlt : theme.card, color: value <= 0 ? theme.textMuted : theme.text, fontSize, cursor: value <= 0 ? "not-allowed" : "pointer" }}>−</button>
        <div style={{ height: controlHeight, display: "grid", placeItems: "center", fontWeight: 800, color: theme.text, fontSize: compact ? 14 : 16 }}>{value}</div>
        <button type="button" onClick={() => onChange(value + 1)} style={{ height: controlHeight, border: 0, background: theme.card, color: theme.text, fontSize, cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

function MiniImage({ label }: { label: string }) {
  return (
    <div style={{ height: 96, borderRadius: 14, border: `1px dashed ${theme.borderStrong}`, background: `linear-gradient(135deg, ${theme.surfaceAlt}, ${theme.surface})`, display: "grid", placeItems: "center", color: theme.textMuted, fontSize: 13, textAlign: "center", padding: 18 }}>
      <div>
        <Layers3 size={22} style={{ margin: "0 auto 8px" }} />
        {label}
      </div>
    </div>
  );
}

function ReflectionCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusMd, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Sparkles size={18} color={theme.oliveDark} />
        <div style={{ fontWeight: 800, color: theme.text }}>Here’s what we’re seeing</div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {recommendation.reflection.map((line) => (
          <div key={line} style={{ color: theme.textSoft, lineHeight: 1.6 }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function ProductResultCard({ item, primary = false }: { item: ProductCard; primary?: boolean }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${primary ? theme.navy : theme.border}`, borderRadius: 20, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: primary ? theme.navy : theme.textMuted }}>
          {primary ? "Best place to start" : "Recommended add-on"}
        </div>
        {item.badge && <div style={{ background: primary ? theme.sage : theme.surfaceAlt, color: theme.text, padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{item.badge}</div>}
      </div>
      <div style={{ marginTop: 2, fontSize: 17, fontWeight: 850, color: theme.text, lineHeight: 1.1 }}>{item.title}</div>
      <div style={{ marginTop: 6, color: theme.textSoft, lineHeight: 1.55 }}>{item.subtitle}</div>
      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <InfoLine label="Suggested quantity" value={`${item.quantity}x`} />
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <a href={`https://${shop.domain}/products/${item.handle}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("primary"), width: "auto" }}>View Product</a>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted }}>{label}</div>
      <div style={{ color: theme.text, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

export default function PreppedShopifyDiscoveryExperienceV2({ onRequestClose }: { onRequestClose?: () => void }) {
  const [view, setView] = useState<"landing" | "quiz" | "email_gate" | "results" | "browse_only">("landing");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showAccessDetails, setShowAccessDetails] = useState(false);
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [showWhyPanel, setShowWhyPanel] = useState(false);
  const [showBrowseNotes, setShowBrowseNotes] = useState(false);
  const [showProgression, setShowProgression] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showPrimaryPack, setShowPrimaryPack] = useState(true);
  const [showAddOns, setShowAddOns] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [backendProfileId, setBackendProfileId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSavedProfile(profileId: string) {
      const endpoints = buildProfileApiCandidates();
      let lastError = "Could not restore your saved PREPPED plan.";

      for (const base of endpoints) {
        try {
          const response = await fetch(`${base}/api/profile-load/${encodeURIComponent(profileId)}`, {
            headers: { Accept: "application/json" },
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Failed to load saved plan from ${base}.`);
          }

          const data = await response.json();
          if (cancelled || !data?.profile) return;

          const restoredAnswers = mergeRestoredAnswers(data.profile);
          setAnswers(restoredAnswers);
          setBackendProfileId(data.profile.profileId || profileId);
          setSaveSuccess("Loaded your saved PREPPED plan.");
          setSaveError("");
          if (data.profile.sessionId && typeof window !== "undefined") {
            window.localStorage.setItem(SESSION_ID_STORAGE_KEY, data.profile.sessionId);
          }
          setView("results");
          return;
        } catch (error) {
          lastError = errorToMessage(error, lastError);
        }
      }

      if (!cancelled) setSaveError(lastError);
    }

    if (typeof window === "undefined") return () => { cancelled = true; };

    const savedProfileId = window.localStorage.getItem(PROFILE_ID_STORAGE_KEY);
    if (savedProfileId) void restoreSavedProfile(savedProfileId);

    return () => {
      cancelled = true;
    };
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1100;
  const compactTopPad = isMobile ? "2px 0 6px" : "4px 0 8px";
  const twoCol = isMobile ? "1fr" : "1fr 1fr";
  const threeCol = isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))";
  const quizShellCols = isMobile ? "1fr" : isTablet ? "minmax(0,0.42fr) minmax(0,0.58fr)" : "minmax(430px,0.48fr) minmax(0,0.52fr)";
  const resultCols = isMobile ? "1fr" : isTablet ? "1fr" : "minmax(0,1fr) minmax(300px,1fr)";

  const q = questions[step];
  const recommendation = useMemo(() => buildRecommendation(answers), [answers]);
  const selectedReasons = useMemo(() => buildSelectedReasons(answers, recommendation), [answers, recommendation]);
  const progress = Math.round(((step + 1) / questions.length) * 100);
  const hasEmail = Boolean((answers.email as string)?.trim());

  function setSingle(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function setMulti(id: string, value: string, limit?: number) {
    setAnswers((prev) => ({ ...prev, [id]: toggleValue((prev[id] as string[]) || [], value, limit) }));
  }

  function resetAll() {
    setStep(0);
    setAnswers({});
    setShowLocationDetails(false);
    setShowAccessDetails(false);
    setSaveError("");
    setSaveSuccess("");
    setBackendProfileId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROFILE_ID_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    }
    setView("landing");
  }

  async function searchAddresses(query: string) {
    setAnswers((prev) => ({
      ...prev,
      location_text: query,
      location_id: undefined,
      location_lat: undefined,
      location_lng: undefined,
      location_suburb: undefined,
      location_city: undefined,
      location_region: undefined,
    }));
    setAddressLookupError("");

    if (query.trim().length < 3) {
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }

    setAddressLoading(true);

    const endpoints = buildAddressSearchCandidates();

    if (!endpoints.length) {
      setAddressResults([]);
      setAddressLoading(false);
      setAddressLookupError("Address lookup is not configured. Set VITE_API_BASE_URL or expose /api/address-search.");
      return;
    }

    let lastError = "Failed to fetch address suggestions.";

    try {
      let results: AddressResult[] = [];

      for (const endpoint of endpoints) {
        try {
          results = await fetchAddressResultsFrom(endpoint, query);
          if (results.length || endpoint) {
            setAddressResults(results);
            if (!results.length) {
              setAddressLookupError("No matching addresses found yet. Try a fuller street, suburb, or postcode.");
            }
            return;
          }
        } catch (error) {
          lastError = errorToMessage(error, `Could not reach ${endpoint}.`);
        }
      }

      setAddressResults([]);
      setAddressLookupError(lastError);
    } catch (error) {
      setAddressResults([]);
      setAddressLookupError(
        errorToMessage(error, "Could not reach the LINZ-backed address lookup.")
      );
    } finally {
      setAddressLoading(false);
    }
  }

  function selectAddress(result: AddressResult) {
    setAddressResults([]);
    setAddressLookupError("");
    setAnswers((prev) => ({
      ...prev,
      location_text: result.fullAddress,
      location_id: result.id,
      location_lat: result.lat,
      location_lng: result.lng,
      location_suburb: result.suburb,
      location_city: result.city,
      location_region: result.region,
    }));
  }

  async function fetchAddressResultsFrom(endpoint: string, query: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Address lookup returned an unexpected response from ${endpoint}.`);
      }

      if (!response.ok) {
        throw new Error(
          errorToMessage(data?.error || data?.message || data, `Address lookup failed at ${endpoint}.`)
        );
      }

      return Array.isArray(data?.results) ? data.results : [];
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function saveProfileToBackend() {
    const endpoints = buildProfileApiCandidates();
    const payload = buildBackendPayload(answers);
    let lastError = "Failed to save your PREPPED plan.";

    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      for (const base of endpoints) {
        try {
          const response = await fetch(`${base}/api/profile-save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          let data: any = {};
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            throw new Error(`Profile save returned an unexpected response from ${base}.`);
          }

          if (!response.ok) {
            throw new Error(errorToMessage(data, `Profile save failed at ${base}.`));
          }

          const savedProfileId = data?.profileId || data?.profile_id || data?.profile?.profileId || data?.profile?.profile_id;
          const savedSessionId = data?.sessionId || data?.session_id || data?.profile?.sessionId || payload.session_id;

          if (typeof window !== "undefined") {
            if (savedProfileId) window.localStorage.setItem(PROFILE_ID_STORAGE_KEY, savedProfileId);
            if (savedSessionId) window.localStorage.setItem(SESSION_ID_STORAGE_KEY, savedSessionId);
          }

          setBackendProfileId(savedProfileId || null);
          setSaveSuccess("Your PREPPED plan has been saved on this device and can now reload on refresh.");
          return data;
        } catch (error) {
          lastError = errorToMessage(error, lastError);
        }
      }

      throw new Error(lastError);
    } catch (error) {
      const message = errorToMessage(error, "Failed to save your PREPPED plan.");
      setSaveError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleUnlockTailoredPlan() {
    if (!hasEmail || saveLoading) return;

    try {
      await saveProfileToBackend();
      setView("results");
    } catch (error) {
      console.error(error);
    }
  }

  function canContinue() {
    if (q.type === "transition") return true;
    if (q.type === "location") return Boolean((answers.location_text as string)?.trim()) || ((answers.location as string[]) || []).length > 0;
    if (q.type === "people") return Object.keys(answers).some((k) => k.endsWith("_count") && Number(answers[k]) > 0);
    if (q.type === "single") return Boolean(answers[q.id]);
    if (q.type === "multi" || q.type === "multiLimit") return ((answers[q.id] as string[]) || []).length > 0;
    if (q.type === "access") return Boolean(answers.access);
    return true;
  }

  function renderQuestionBody() {
    if (q.type === "location") {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>NZ address or suburb</div>

            <div style={{ position: "relative", zIndex: 20 }}>
              <input
                value={(answers.location_text as string) || ""}
                onChange={(e) => void searchAddresses(e.target.value)}
                placeholder="Search NZ address, suburb, or postcode"
                style={inputStyle()}
              />

              {addressResults.length > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radiusSm,
                    overflow: "hidden",
                    background: theme.surface,
                    maxHeight: 220,
                    overflowY: "auto",
                    boxShadow: "0 18px 42px rgba(26, 21, 16, 0.16)",
                  }}
                >
                  {addressResults.map((result, index) => (
                    <button
                      key={`${result.id ?? result.fullAddress}-${index}`}
                      type="button"
                      onClick={() => selectAddress(result)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: 0,
                        borderBottom: index === addressResults.length - 1 ? 0 : `1px solid ${theme.border}`,
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "grid",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{result.fullAddress}</span>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>
                        {[result.suburb, result.city, result.region].filter(Boolean).join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: theme.textMuted }}>
              Address suggestions use the LINZ-backed lookup. If nothing appears, the app will try your configured backend, same-origin /api, and localhost:3001 in local development.
            </div>

            {addressLoading ? (
              <div style={{ marginTop: 8, fontSize: 12, color: theme.textMuted }}>Searching addresses…</div>
            ) : null}

            {addressLookupError ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#A64B2A" }}>{addressLookupError}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {q.chips?.map((chip) => <StepPill key={chip} label={chip} active={((answers.location as string[]) || []).includes(chip)} onClick={() => setMulti("location", chip)} />)}
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <button type="button" onClick={() => setShowLocationDetails((v) => !v)} style={linkButtonStyle()}>{showLocationDetails ? "Hide extra detail" : "Add more detail (optional)"}</button>
            {showLocationDetails && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                {q.detailFields?.map((chip) => <StepPill key={chip} label={chip} active={((answers.location_detail as string[]) || []).includes(chip)} onClick={() => setMulti("location_detail", chip)} />)}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (q.type === "people") {
      const householdFields: Array<[string, string]> = [
        ["adult_count", "Adults"],
        ["teens_count", "Teens"],
        ["kids_count", "Kids"],
        ["toddlers_count", "Toddlers"],
        ["infants_count", "Infants"],
        ["pets_count", "Pets"],
      ];
      const supportFields: Array<[string, string, string]> = [
        ["adult_support_count", "Adults", "adult_count"],
        ["teens_support_count", "Teens", "teens_count"],
        ["kids_support_count", "Kids", "kids_count"],
        ["toddlers_support_count", "Toddlers", "toddlers_count"],
        ["infants_support_count", "Infants", "infants_count"],
        ["pets_support_count", "Pets", "pets_count"],
      ];
      const hasDependency = answers.household_dependency === "Yes";
      const threeCol = isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))";
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: threeCol, gap: 8 }}>
              {householdFields.map(([key, label]) => (
                <CountStepper key={key} label={label} value={Number(answers[key] || 0)} onChange={(next) => setAnswers((prev) => ({ ...prev, [key]: next }))} compact />
              ))}
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(180px, 220px)", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 10.5, lineHeight: 1.35, color: theme.textMuted }}>
                Use this if anyone in the household has increased dependency due to accessibility, age, health, support needs, or other factors that increase assistance.
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.0, color: theme.textMuted, marginBottom: 6 }}>
                  Any increased dependency needs?
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["No", "Yes"].map((option) => (
                    <OptionCard key={option} label={option} active={answers.household_dependency === option} onClick={() => setSingle("household_dependency", option)} compact />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {hasDependency && (
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.0, color: theme.textMuted, marginBottom: 6 }}>
                Requiring support
              </div>
              <div style={{ display: "grid", gridTemplateColumns: threeCol, gap: 8 }}>
                {supportFields.map(([key, label, parentKey]) => {
                  const maxVal = Number(answers[parentKey] || 0);
                  if (maxVal < 1) {
                    return null;
                  }
                  return (
                    <CountStepper
                      key={key}
                      label={label}
                      value={Math.min(Number(answers[key] || 0), maxVal)}
                      onChange={(next) => setAnswers((prev) => ({ ...prev, [key]: Math.min(next, maxVal) }))}
                      compact
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (q.type === "single") {
      const twoColSteps = ["context", "home", "motivation", "budget", "execution"];
      const cols = twoColSteps.includes(q.id) ? twoCol : "1fr";
      return <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>{q.options?.map((option) => <OptionCard key={option} label={option} active={answers[q.id] === option} onClick={() => setSingle(q.id, option)} compact />)}</div>;
    }

    if (q.type === "multi") {
      const cardMode = ["current", "locations"].includes(q.id);
      if (cardMode) return <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 10 }}>{q.chips?.map((chip) => <OptionCard key={chip} label={chip} active={((answers[q.id] as string[]) || []).includes(chip)} onClick={() => setMulti(q.id, chip)} />)}</div>;
      return <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{q.chips?.map((chip) => <StepPill key={chip} label={chip} active={((answers[q.id] as string[]) || []).includes(chip)} onClick={() => setMulti(q.id, chip)} />)}</div>;
    }

    if (q.type === "multiLimit") {
      return (
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: theme.textMuted, marginBottom: 10 }}>Choose up to {q.limit}</div>
          <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 10 }}>{q.chips?.map((chip) => <OptionCard key={chip} label={chip} active={((answers[q.id] as string[]) || []).includes(chip)} onClick={() => setMulti(q.id, chip, q.limit)} />)}</div>
        </div>
      );
    }

    if (q.type === "access") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 10 }}>
            {q.options?.map((option) => (
              <OptionCard key={option} label={option} active={answers.access === option} onClick={() => setSingle("access", option)} compact />
            ))}
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.0, color: theme.textMuted }}>
                Vehicle setup
              </div>
              <div style={{ color: theme.textMuted, lineHeight: 1.35, fontSize: 10.5 }}>
                Tell us about the vehicles your household actually relies on. This helps us decide whether a vehicle layer should sit beside the home or mobile setup.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <CountStepper
                  label="Vehicle count"
                  value={Number(answers.vehicle_count || 0)}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, vehicle_count: next }))}
                  compact
                />
                <CountStepper
                  label="Seats per vehicle"
                  value={Number(answers.vehicle_capacity || 0)}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, vehicle_capacity: next }))}
                  compact
                />
              </div>
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 10 }}>
            <button type="button" onClick={() => setShowAccessDetails((v) => !v)} style={linkButtonStyle()}>{showAccessDetails ? "Hide additional options" : "Additional options (optional)"}</button>
            {showAccessDetails && <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 10, marginTop: 14 }}>{q.chips?.map((chip) => <OptionCard key={chip} label={chip} active={((answers.access_chips as string[]) || []).includes(chip)} onClick={() => setMulti("access_chips", chip)} />)}</div>}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 10 }}>
        <ReflectionCard recommendation={recommendation} />
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 14 }}>
          <div style={{ color: theme.textSoft, lineHeight: 1.5, marginBottom: 12, fontSize: 13 }}>Browse the PREPPED range, continue with email, or start again.</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : twoCol, gap: 10 }}>
            <button type="button" onClick={() => setView("browse_only")} style={buttonStyle("secondary")}>Browse PREPPED Product Range</button>
            <button type="button" onClick={resetAll} style={buttonStyle("ghost")}><RotateCcw size={16} style={{ marginRight: 6 }} /> Start again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-prepped-quiz-root style={{ minHeight: "100vh", width: "100%", background: theme.bg, color: theme.text, fontFamily: "Inter, Arial, sans-serif", display: "flex", justifyContent: "center" }}>
      <Container>
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: compactTopPad }}>
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,0.5fr) minmax(0,0.5fr)", gap: 10, alignItems: "stretch" }}>
                <div style={{ background: theme.surfaceDark, color: "white", borderRadius: theme.radiusLg, padding: 16, boxShadow: theme.shadow, overflow: "hidden", display: "grid", alignContent: "center", justifyItems: "start" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,0.08)", fontSize: 11, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase" }}><Sparkles size={12} /> Household-first preparedness</div>
                  <h1 style={{ margin: "12px 0 0", fontSize: "clamp(22px, 3vw, 34px)", lineHeight: 0.98, fontWeight: 900, letterSpacing: -1.1, color: "#FFFFFF", textAlign: isMobile ? "left" : "center", width: "100%" }}>Find the right starting point for your household</h1>
                  <p style={{ margin: "10px 0 0", maxWidth: 560, color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 1.45, textAlign: isMobile ? "left" : "center", width: "100%" }}>Answer a few quick questions and we’ll guide you to the most practical setup for your situation, likely disruptions, and the people relying on you.</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, justifyContent: isMobile ? "flex-start" : "center", width: "100%" }}>
                    {landingPills.map((pill) => (
                      <div key={pill} style={{ padding: "7px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.94)", fontWeight: 700, fontSize: 12, whiteSpace: "pre-line" }}>
                        {pill}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, width: "100%" }}>
                    <button type="button" onClick={() => setView("quiz")} style={{ minHeight: 44, width: "100%", borderRadius: 12, border: 0, background: theme.olive, color: "white", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>CREATE MY PLAN</button>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: threeCol, gap: 10, width: "100%" }}>
                    <MetricCard icon={<MapPin size={16} />} label="Discover" text="Place, people, and likely pressure points." />
                    <MetricCard icon={<Package size={16} />} label="Build" text="One clear starting point and best-fit add-ons." />
                    <MetricCard icon={<HeartHandshake size={16} />} label="Grow" text="A setup designed to evolve later." />
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusLg, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>PREPPED progression</div>
                    <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                      {[["Preparing", "Understand your situation and start clearly."], ["Resourcing", "Cover the essential baseline."], ["Expanding", "Build beyond the first shock."], ["Personalising", "Fit the setup to your real life."], ["Practising", "Know what to do, not just what to own."], ["Embedding", "Make readiness part of routine."], ["Dependable", "Become steady and able to support others."]].map(([stage, text], idx) => (
                        <div key={String(stage)} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, alignItems: "start" }}>
                          <div style={{ width: 24, height: 24, borderRadius: 999, background: idx < 2 ? theme.sage : theme.surfaceAlt, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: theme.navy }}>{idx + 1}</div>
                          <div><div style={{ fontWeight: 800, color: theme.text, fontSize: 13 }}>{stage}</div><div style={{ color: theme.textSoft, lineHeight: 1.35, marginTop: 1, fontSize: 12 }}>{text}</div></div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setShowHowItWorks((v) => !v)} style={{ ...buttonStyle("secondary"), minHeight: 36, fontSize: 12 }}>{showHowItWorks ? "Hide how it works" : "How it works"}</button>
                    {showHowItWorks && (
                      <div style={{ marginTop: 10, background: theme.surfaceAlt, borderRadius: 14, padding: 12, border: `1px solid ${theme.border}` }}>
                        <div style={{ display: "grid", gap: 10 }}>
                          <HowItWorks number="01" title="Tell us about your household" text="Place, people, priorities, and what you already have covered." />
                          <HowItWorks number="02" title="See what fits best" text="A clearer starting point, with reasons, not just products." />
                          <HowItWorks number="03" title="Save and refine later" text="This becomes the basis for a longer-term PREPPED journey." />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} style={{ padding: compactTopPad }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: quizShellCols }}>
                  <aside style={{ background: theme.surfaceDark, color: "white", padding: isMobile ? 12 : 14, display: "grid", alignContent: "space-between", gap: 10, position: "relative", justifyItems: isMobile ? "start" : "center" }}>
                    <div>
                      <div style={{ marginTop: 12, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.72, fontWeight: 900 }}>{q.eyebrow}</div>
                      <h2 style={{ margin: "10px 0 0", fontSize: isMobile ? 22 : 24, lineHeight: 1.02, fontWeight: 900, maxWidth: 420, color: "#FFFFFF", textAlign: isMobile ? "left" : "center", width: "100%" }}>{q.title}</h2>
                      <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.88)", lineHeight: 1.5, maxWidth: 400, fontSize: 12, textAlign: isMobile ? "left" : "center", width: "100%" }}>{q.helper}</p>
                      <div style={{ marginTop: 12, background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: isMobile ? 12 : 16 }}>
                        <button type="button" onClick={() => setShowWhyPanel((v) => !v)} style={{ background: "none", border: 0, color: "white", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CircleHelp size={16} /><span style={{ fontWeight: 800 }}>Why this matters</span></div>
                            <span style={{ fontSize: 12, opacity: 0.78 }}>{showWhyPanel ? "Hide" : "Show"}</span>
                          </div>
                        </button>
                        {showWhyPanel && <div style={{ fontSize: 14, lineHeight: 1.62, color: "rgba(255,255,255,0.76)", marginTop: 6 }}>{q.why || "This first discover phase sets the quality of every later recommendation, automation, and support layer."}</div>}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.7)" }}><span>Progress</span><span>{progress}%</span></div>
                      <div style={{ height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${theme.olive}, #8EA53F)` }} /></div>
                      <div style={{ display: isMobile ? "none" : "grid", gridTemplateColumns: isMobile ? "1fr" : "92px minmax(0, 1fr)", gap: 10, marginTop: 18 }}>
                        <button
                          type="button"
                          onClick={() => step === 0 ? setView("landing") : setStep((s) => Math.max(0, s - 1))}
                          style={{
                            ...buttonStyle("secondary"),
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.16)",
                            width: "92px",
                            padding: "0 10px"
                          }}
                        >
                          <ChevronLeft size={16} style={{ marginRight: 4 }} /> Back
                        </button>
                        {step < questions.length - 1 ? (
                          <button
                            type="button"
                            disabled={!canContinue()}
                            onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))}
                            style={{
                              ...buttonStyle("primary"),
                              background: canContinue() ? theme.olive : "#98A27A",
                              width: "100%"
                            }}
                          >
                            Continue <ChevronRight size={16} style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle" }} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canContinue()}
                            onClick={() => setView("email_gate")}
                            style={{
                              ...buttonStyle("primary"),
                              background: theme.olive,
                              width: "100%"
                            }}
                          >
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  </aside>
                  <main style={{ padding: isMobile ? 12 : 16, background: theme.bg, paddingBottom: isMobile ? 84 : 16 }}>
                    <div style={{ maxWidth: 760 }}>{renderQuestionBody()}</div>
                    {isMobile && (
                      <div style={{ position: "sticky", bottom: 10, marginTop: 16, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", border: `1px solid ${theme.border}`, borderRadius: 18, padding: 10, display: "grid", gridTemplateColumns: twoCol, gap: 10 }}>
                        <button type="button" onClick={() => step === 0 ? setView("landing") : setStep((s) => Math.max(0, s - 1))} style={{ ...buttonStyle("secondary"), width: "100%" }}>Back</button>
                        {step < questions.length - 1 ? (
                          <button type="button" disabled={!canContinue()} onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))} style={{ ...buttonStyle("primary"), background: canContinue() ? theme.olive : "#98A27A", width: "100%" }}>Continue</button>
                        ) : (
                          <button type="button" disabled={!canContinue()} onClick={() => setView("email_gate")} style={{ ...buttonStyle("primary"), background: theme.olive, width: "100%" }}>Continue</button>
                        )}
                      </div>
                    )}
                  </main>
                </div>
              </div>
            </motion.div>
          )}

          {view === "email_gate" && (
            <motion.div key="email_gate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} style={{ padding: compactTopPad }}>
              <div style={{ maxWidth: 960, margin: "0 auto", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.05fr 0.95fr" }}>
                  <section style={{ background: theme.surfaceDark, color: "white", padding: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Lock size={18} /><div style={{ fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>Unlock tailored results</div></div>
                    <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.04, fontWeight: 900, maxWidth: 380, color: "#FFFFFF" }}>Your full PREPPED explanation is ready</h2>
                    <p style={{ marginTop: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, maxWidth: 440 }}>You can still browse the PREPPED product range without email, but the deeper fit logic, explanation, and saved plan pathway are reserved for households that choose to continue.</p>
                    <div style={{ marginTop: 22, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 14 }}>
                      <button type="button" onClick={() => setShowWhyPanel((v) => !v)} style={{ background: "none", border: 0, color: "white", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Eye size={16} /><div style={{ fontWeight: 800 }}>We’re also seeing</div></div><span style={{ fontSize: 12, opacity: 0.78 }}>{showWhyPanel ? "Hide" : "Show"}</span></div>
                      </button>
                      {showWhyPanel && <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{recommendation.why.map((item) => <div key={item} style={{ display: "flex", gap: 10 }}><Check size={16} style={{ marginTop: 4, color: "#B7D67A" }} /><div style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.6 }}>{item}</div></div>)}</div>}
                    </div>
                  </section>
                  <section style={{ padding: 28, background: theme.surface }}>
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Mail size={18} color={theme.navy} /><div style={{ fontWeight: 800 }}>Continue with email</div></div>
                      <label style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted }}>Email address</div>
                        <input type="email" value={(answers.email as string) || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" style={inputStyle()} />
                      </label>
                      <div style={{ display: "grid", gap: 10, marginTop: 16, justifyItems: "center" }}>
                        <button type="button" disabled={!hasEmail || saveLoading} onClick={() => void handleUnlockTailoredPlan()} style={{ ...buttonStyle("primary"), maxWidth: 320 }}>{saveLoading ? "Saving your plan..." : "Unlock my tailored plan"}</button>
                        <a href={`https://${shop.domain}/account/register`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("secondary"), maxWidth: 320 }}>Create account instead</a>
                        <button type="button" onClick={() => setView("browse_only")} style={{ ...buttonStyle("ghost"), maxWidth: 320 }}>Continue without email</button>
                      </div>
                      {saveError ? <div style={{ marginTop: 12, color: "#A03C2D", fontSize: 13, lineHeight: 1.5 }}>{saveError}</div> : null}
                      {saveSuccess ? <div style={{ marginTop: 12, color: theme.oliveDark, fontSize: 13, lineHeight: 1.5 }}>{saveSuccess}</div> : null}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: compactTopPad }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ background: `linear-gradient(90deg, ${theme.oliveDark}, ${theme.olive})`, color: "white", padding: "8px 14px", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.84 }}>Your PREPPED starting point</div>
                    <div style={{ marginTop: 2, fontSize: 12.5, opacity: 0.94 }}>{recommendation.summary}</div>
                  </div>
                  <button type="button" onClick={() => onRequestClose ? onRequestClose() : setView("landing")} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.18)", width: "auto" }}>Close</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: resultCols }}>
                  <section style={{ padding: 16, background: theme.surfaceDark, color: "white" }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}><Tag>{recommendation.path}</Tag><Tag>{recommendation.confidence}</Tag><Tag>{recommendation.stage}</Tag>{backendProfileId ? <Tag>Saved plan</Tag> : null}</div>
                        <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.0, fontWeight: 900, color: "#FFFFFF" }}>A clearer first step, built around your situation</h2>
                        <p style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", lineHeight: 1.42, fontSize: 12.5 }}>{recommendation.mainProduct.reason}</p>{saveSuccess ? <div style={{ marginTop: 8, color: "rgba(205,226,156,0.95)", fontSize: 13 }}>{saveSuccess}</div> : null}
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 10 }}>
                        <button type="button" onClick={() => setShowWhyPanel((v) => !v)} style={{ background: "none", border: 0, color: "white", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><BadgeCheck size={16} color="#B7D67A" /><div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>Because you selected</div></div><span style={{ fontSize: 12, opacity: 0.78 }}>{showWhyPanel ? "Hide" : "Show"}</span></div>
                        </button>
                        {showWhyPanel && <div style={{ display: "grid", gap: 7, marginTop: 6 }}>{selectedReasons.map((line) => <div key={line} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Check size={14} style={{ marginTop: 3, color: "#B7D67A" }} /><div style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.42, fontSize: 13 }}>{line}</div></div>)}</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: recommendation.homePackQty > 0 ? threeCol : (isMobile ? "1fr" : "1fr 1fr"), gap: 10 }}>
                        <DarkMetric icon={<Package size={18} />} label="Preparation Packs" value={`${recommendation.preparationPackQty}x`} />
                        {recommendation.homePackQty > 0 && <DarkMetric icon={<Home size={18} />} label="Home setup" value={`${recommendation.homePackQty}x`} />}
                        {recommendation.carPackQty > 0 && <DarkMetric icon={<Car size={18} />} label="Car setup" value={`${recommendation.carPackQty}x`} />}
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 10 }}>
                        <button type="button" onClick={() => setShowProgression((v) => !v)} style={{ background: "none", border: 0, color: "white", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>PREPPED progression path</div><span style={{ fontSize: 12, opacity: 0.78 }}>{showProgression ? "Hide" : "Show"}</span></div>
                        </button>
                        {showProgression && <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {[["Preparing", recommendation.stage === "Preparing"], ["Resourcing", recommendation.stage === "Resourcing"], ["Expanding", recommendation.stage === "Expanding"], ["Personalising", false], ["Practising", false], ["Embedding", false], ["Dependable", false]].map(([stage, active]) => (
                            <div key={String(stage)} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center" }}>
                              <div style={{ width: 24, height: 24, borderRadius: 999, background: active ? "rgba(183,214,122,0.25)" : "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontWeight: 900, color: "#FFFFFF", fontSize: 12 }}>{active ? "✓" : "•"}</div>
                              <div style={{ color: "#FFFFFF", fontWeight: active ? 800 : 700, fontSize: 14 }}>{stage}</div>
                            </div>
                          ))}
                        </div>}
                      </div>
                    </div>
                  </section>
                  <section style={{ padding: 16, background: theme.surface }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 10 }}>
                        <button type="button" onClick={() => setShowRecommendations((v) => !v)} style={{ background: "none", border: 0, width: "100%", padding: 0, textAlign: "left", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: theme.textMuted }}>Recommendations</div>
                            <span style={{ fontSize: 12, color: theme.textMuted }}>{showRecommendations ? "Hide" : "Show"}</span>
                          </div>
                        </button>
                        {showRecommendations && <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 10 }}>
                            <button type="button" onClick={() => setShowPrimaryPack((v) => !v)} style={{ background: "none", border: 0, width: "100%", padding: 0, textAlign: "left", cursor: "pointer" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: theme.textMuted }}>Preparation Pack</div>
                                <span style={{ fontSize: 12, color: theme.textMuted }}>{showPrimaryPack ? "Hide" : "Show"}</span>
                              </div>
                            </button>
                            {showPrimaryPack && <div style={{ marginTop: 10 }}><ProductResultCard item={recommendation.mainProduct} primary /></div>}
                          </div>
                          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 10 }}>
                            <button type="button" onClick={() => setShowAddOns((v) => !v)} style={{ background: "none", border: 0, width: "100%", padding: 0, textAlign: "left", cursor: "pointer" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: theme.textMuted }}>Your next best expansion packs</div>
                                <span style={{ fontSize: 12, color: theme.textMuted }}>{showAddOns ? "Hide" : "Show"}</span>
                              </div>
                            </button>
                            {showAddOns && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                              {recommendation.addOns.map((item) => (
                                <div key={item.handle} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: 10, borderRadius: 12, background: theme.card, border: `1px solid ${theme.border}` }}>
                                  <div>
                                    <div style={{ color: theme.text, fontWeight: 700 }}>{item.title}</div>
                                    <div style={{ color: theme.textSoft, fontSize: 13, marginTop: 2 }}>Recommended expansion pack</div>
                                  </div>
                                  <a href={`https://${shop.domain}/products/${item.handle}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("secondary"), minHeight: 38, width: "auto" }}>View Product</a>
                                </div>
                              ))}
                            </div>}
                          </div>
                        </div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        <a href={`https://${shop.domain}/collections/all`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("primary"), width: "auto" }}>Browse all products</a>
                        <a href={`https://${shop.domain}/pages/dashboard`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("secondary"), width: "auto" }}>Open dashboard page</a>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {view === "browse_only" && (
            <motion.div key="browse_only" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: compactTopPad }}>
              <div style={{ maxWidth: 1080, margin: "0 auto", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: twoCol }}>
                  <section style={{ padding: 28, background: theme.surfaceDark, color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><Eye size={18} /><div style={{ fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>Browse mode</div></div>
                    <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.04, fontWeight: 900, color: "#FFFFFF" }}>Explore PREPPED products without unlocking the tailored layer</h2>
                    <div style={{ marginTop: 14, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 14 }}>
                      <button type="button" onClick={() => setShowBrowseNotes((v) => !v)} style={{ background: "none", border: 0, color: "white", padding: 0, width: "100%", textAlign: "left", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ fontWeight: 800 }}>You can still…</div><span style={{ fontSize: 12, opacity: 0.78 }}>{showBrowseNotes ? "Hide" : "Show"}</span></div>
                      </button>
                      {showBrowseNotes && <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{recommendation.genericBrowseNotes.map((item) => <div key={item} style={{ display: "flex", gap: 10 }}><Check size={16} style={{ marginTop: 4, color: "#B7D67A" }} /><div style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.6 }}>{item}</div></div>)}</div>}
                    </div>
                  </section>
                  <section style={{ padding: 28, background: theme.surface }}>
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20 }}>
                      <MiniImage label={shop.imagePlaceholders.productLibrary} />
                      <div style={{ marginTop: 16, fontSize: 22, fontWeight: 850, color: theme.text }}>Browse the PREPPED product range</div>
                      <div style={{ marginTop: 6, color: theme.textSoft, lineHeight: 1.6 }}>Start with the broader collection now, or come back and unlock the tailored path when you’re ready.</div>
                      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                        <a href={`https://${shop.domain}/collections/all`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("primary"), width: "auto" }}>Browse all products</a>
                        <button type="button" onClick={() => setView("email_gate")} style={{ ...buttonStyle("secondary"), width: "auto" }}>Unlock tailored results instead</button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </div>
  );
}
