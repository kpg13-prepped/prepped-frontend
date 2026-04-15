import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Shield,
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
  SlidersHorizontal,
} from "lucide-react";

const theme = {
  bg: "#F5F0E6",
  surface: "#FBF8F2",
  surfaceAlt: "#F0E8DA",
  surfaceDark: "#151515",
  card: "#FFFDF8",
  border: "#D8CFBF",
  borderStrong: "#B8AC98",
  text: "#201B17",
  textSoft: "#5E564C",
  textMuted: "#7B7267",
  olive: "#687C2A",
  oliveDark: "#4E601D",
  navy: "#213A57",
  navySoft: "#36567D",
  sage: "#E6EED4",
  success: "#DCF3D8",
  warning: "#F5E7C4",
  shadow: "0 20px 50px rgba(26, 21, 16, 0.12)",
  radiusLg: 28,
  radiusMd: 18,
  radiusSm: 14,
};

const shop = {
  domain: "prepped-dev.myshopify.com",
  imagePlaceholders: {
    preparation: "Preparation Pack image",
    water: "Water Security module image",
    power: "Power & Lighting module image",
    family: "Family Expansion module image",
    flood: "Flood Protection module image",
    vehicle: "Vehicle Survival module image",
    baby: "Baby Support module image",
    personalisation: "Personalisation Kit image",
    productLibrary: "Product collection image",
  },
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
  systemNotes: string[];
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
    chips: ["Adult male", "Adult female", "Teenage male", "Teenage female", "Baby", "Young kids", "School-aged kids", "Older adult male", "Older adult female", "Guests / extended family", "Pets"],
  },
  {
    id: "context",
    eyebrow: "Step 3",
    title: "What feels most true right now?",
    helper: "This helps us keep the recommendation practical.",
    why: "Preparedness works better when the path feels realistic, not idealised.",
    type: "single",
    options: ["Life is full right now", "We’ve had recent changes", "Budget feels tight", "I’ve meant to do this for a while", "I’m ready to get sorted"],
  },
  {
    id: "home",
    eyebrow: "Step 4",
    title: "What kind of place are you living in?",
    helper: "Homes behave differently in outages, storms, and evacuation situations.",
    why: "The same starter setup does not work equally well across apartments, family homes, and rural properties.",
    type: "single",
    options: ["House (older style)", "House (modern)", "Townhouse / new build", "Apartment", "Rural / lifestyle block", "Temporary / shared / other"],
  },
  {
    id: "access",
    eyebrow: "Step 5",
    title: "How easy is it to move or get support if needed?",
    helper: "This helps us understand isolation, transport pressure, and what could become harder.",
    why: "Access changes how much you can rely on outside help and whether home, car, or split coverage matters more.",
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
    options: ["Recent weather or disruption", "Peace of mind", "Family safety", "A close call before", "Want to be more self-reliant", "Want to support others too"],
  },
  {
    id: "priority",
    eyebrow: "Step 7",
    title: "What do you want to feel prepared for first?",
    helper: "Choose up to three so we can keep the plan focused.",
    why: "Clear priorities help us avoid overwhelming you with too many directions at once.",
    type: "multiLimit",
    limit: 3,
    chips: ["Storms / cyclones", "Flooding", "Power outages", "Earthquakes", "Being stuck without access", "Cold / winter", "Heat / water shortages", "Evacuation", "Looking after kids / baby"],
  },
  {
    id: "current",
    eyebrow: "Step 8",
    title: "What do you already have covered?",
    helper: "Even a few things in place can shift the recommendation.",
    why: "We want to build from what you already have, not make you start from zero if you don’t need to.",
    type: "multi",
    chips: ["Some food stored", "Some water stored", "Torch / lighting", "Power bank", "First aid kit", "Baby supplies", "Car kit", "Important documents organised", "Not much yet"],
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
    title: "Any other places we should account for?",
    helper: "Sometimes the real picture includes work, school, or family.",
    why: "Split locations often change what should live at home, in the car, or near daily routines.",
    type: "multi",
    chips: ["Work location", "Childcare / school", "Holiday home", "Family home", "No"],
  },
  {
    id: "execution",
    eyebrow: "Step 12",
    title: "How would you like support to feel?",
    helper: "Some people want to build it themselves. Others want more guidance.",
    why: "This helps us decide how guided or self-directed the experience should feel later.",
    type: "single",
    options: ["I’m happy to DIY", "Guide me step by step", "Show me the best pre-built option", "I may want a done-for-me path"],
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

function countFromAnswers(answers: Answers, label: string, key: string) {
  const explicit = Number(answers[key] || 0);
  if (explicit > 0) return explicit;
  return ((answers.people as string[]) || []).includes(label) ? 1 : 0;
}

function buildRecommendation(answers: Answers): Recommendation {
  const people = (answers.people as string[]) || [];
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

  const adults = countFromAnswers(answers, "Adult male", "adult_male_count") + countFromAnswers(answers, "Adult female", "adult_female_count");
  const teenCount = countFromAnswers(answers, "Teenage male", "teen_male_count") + countFromAnswers(answers, "Teenage female", "teen_female_count");
  const babies = countFromAnswers(answers, "Baby", "babies_count");
  const children = Number(answers.children_count || 0) + (((answers.people as string[]) || []).includes("Young kids") ? 1 : 0) + (((answers.people as string[]) || []).includes("School-aged kids") ? 1 : 0);
  const older = countFromAnswers(answers, "Older adult male", "older_adult_male_count") + countFromAnswers(answers, "Older adult female", "older_adult_female_count");
  const pets = Number(answers.pets_count || 0) + (people.includes("Pets") ? 1 : 0);
  const householdWeight = Math.max(1, adults) + teenCount * 0.7 + children * 0.8 + babies * 1.15 + older * 0.9 + pets * 0.3;
  const readinessGap = Math.max(0, 5 - current.filter((x) => x !== "Not much yet").length) + (current.includes("Not much yet") ? 2 : 0);

  const prepQty = householdWeight <= 2.2 ? 1 : householdWeight <= 4.5 ? 2 : householdWeight <= 6.8 ? 3 : 4;
  const homeQty = home === "Apartment" ? 1 : Math.max(1, Math.ceil(prepQty / 2));
  const carQty = locations.includes("Work location") || priority.includes("Being stuck without access") ? 1 : 0;
  const secondBasePack = prepQty > 1 || locations.includes("Childcare / school") || homeQty > 1;

  const addOns: ProductCard[] = [];
  const pushAddOn = (item: ProductCard) => {
    if (!addOns.find((x) => x.handle === item.handle)) addOns.push(item);
  };

  if (priority.includes("Power outages") || !current.includes("Torch / lighting") || !current.includes("Power bank")) {
    pushAddOn({
      title: "Power & Lighting",
      handle: "expansion-pack-power-and-lighting",
      subtitle: "Keep communication and visibility going.",
      imageLabel: shop.imagePlaceholders.power,
      quantity: 1,
      reason: "Useful if outages are likely or your current setup is light.",
      badge: "High impact",
    });
  }
  if (priority.includes("Flooding") || priority.includes("Heat / water shortages") || location.includes("Near coast / river") || !current.includes("Some water stored")) {
    pushAddOn({
      title: "Water Security",
      handle: "expansion-pack-water-security",
      subtitle: "Improve water depth and flexibility.",
      imageLabel: shop.imagePlaceholders.water,
      quantity: Math.max(1, Math.ceil(prepQty / 2)),
      reason: "Water is often the fastest pressure point in disruption.",
      badge: "Core layer",
    });
  }
  if (children + babies >= 1) {
    pushAddOn({
      title: babies > 0 ? "Baby Support" : "Family Expansion",
      handle: babies > 0 ? "expansion-pack-baby-support" : "expansion-pack-family-expansion",
      subtitle: babies > 0 ? "Support infant continuity and comfort." : "Scale the setup for child-dependent households.",
      imageLabel: babies > 0 ? shop.imagePlaceholders.baby : shop.imagePlaceholders.family,
      quantity: 1,
      reason: "Dependency changes what preparedness needs to look like.",
      badge: "Household fit",
    });
  }
  if (priority.includes("Flooding") || priority.includes("Storms / cyclones")) {
    pushAddOn({
      title: "Flood Protection",
      handle: "expansion-pack-flood-protection",
      subtitle: "Protect documents, storage, and quick-move items.",
      imageLabel: shop.imagePlaceholders.flood,
      quantity: 1,
      reason: "Helps with waterproofing and rapid movement under pressure.",
      badge: "Risk fit",
    });
  }
  if (locations.includes("Work location") || accessChips.includes("Small car") || accessChips.includes("4WD / ute") || priority.includes("Being stuck without access")) {
    pushAddOn({
      title: "Vehicle Survival",
      handle: "expansion-pack-vehicle-survival",
      subtitle: "Adds support for travel or split-location routines.",
      imageLabel: shop.imagePlaceholders.vehicle,
      quantity: carQty || 1,
      reason: "Useful where travel, access, or car dependence changes the risk picture.",
      badge: "Lifestyle fit",
    });
  }

  const path: Recommendation["path"] =
    motivation === "Want to be more self-reliant" || complexity === "Show the longer-term path"
      ? "Family-led"
      : priority.some((p) => ["Flooding", "Storms / cyclones", "Earthquakes", "Power outages"].includes(p))
        ? "Risk-led"
        : "Starter";

  const stage: Recommendation["stage"] = readinessGap >= 5 ? "Preparing" : readinessGap >= 3 ? "Resourcing" : "Expanding";

  const mainProduct: ProductCard = {
    title: "Preparation Pack",
    handle: "preparation-pack",
    subtitle: "Your strongest first step for baseline coverage.",
    imageLabel: shop.imagePlaceholders.preparation,
    quantity: prepQty,
    reason: secondBasePack ? "Your household profile suggests more than one base setup is likely to be realistic." : "A strong baseline gives you the essentials before layering in modules.",
    badge: stage,
  };

  const why = [
    `You appear to be planning for ${householdWeight > 4 ? "a higher-demand household" : "a manageable starter household"}.`,
    priority.length ? `Your strongest pressure points look like ${priority.slice(0, 2).join(" and ").toLowerCase()}.` : "You’re looking for a calm, practical place to begin.",
    budget ? `Your stated budget preference points toward a ${budget.toLowerCase()} path.` : "We’ve kept the first recommendation realistic and editable.",
  ];

  const nextActions = [
    secondBasePack ? `Start with ${prepQty} Preparation Packs across home, car, or split locations.` : `Start with ${prepQty} Preparation Pack${prepQty > 1 ? "s" : ""}.`,
    addOns[0] ? `Add ${addOns[0].title} next for the biggest lift in coverage.` : "Add one extension module once the baseline is covered.",
    "Save your plan so it can evolve as life changes.",
  ];

  const systemNotes = [
    `Suggested home quantity: ${homeQty}x`,
    `Suggested car quantity: ${carQty}x`,
    secondBasePack ? "A second base layer is recommended for better realism and coverage." : "One base layer appears workable as a starting point.",
    execution === "I may want a done-for-me path" ? "A guided or managed pathway may suit you better over time." : "You can start simple and refine later.",
  ];

  const reflection = [
    `You’re preparing for ${[adults ? `${adults} adult${adults > 1 ? "s" : ""}` : null, children ? `${children} child${children > 1 ? "ren" : ""}` : null, babies ? `${babies} baby` : null, older ? `${older} older adult${older > 1 ? "s" : ""}` : null, pets ? `${pets} pet${pets > 1 ? "s" : ""}` : null].filter(Boolean).join(", ") || "your household"}.`,
    `Your main environment looks like ${home || location[0] || locationText}.`,
    `Right now the system reads your tone as ${context || "ready to begin"}.`,
  ];

  const genericBrowseNotes = [
    "You can still browse the PREPPED product range without unlocking the tailored layer.",
    "The deeper explanation, fit logic, and saved plan are reserved for households that choose to continue with email or account creation.",
    "This keeps the personalised pathway connected to an ongoing customer journey rather than a one-off anonymous browse.",
  ];

  return {
    path,
    summary:
      path === "Risk-led"
        ? "Start with a strong baseline and layer in the risks most likely to affect you first."
        : path === "Family-led"
          ? "Build around the people relying on you, then deepen the system over time."
          : "Begin with the simplest credible setup, then expand only where it matters most.",
    confidence: readinessGap >= 5 ? "High fit" : readinessGap >= 3 ? "Good fit" : "Needs refinement",
    preparationPackQty: prepQty,
    homePackQty: homeQty,
    carPackQty: carQty,
    secondBasePack,
    stage,
    mainProduct,
    addOns: addOns.slice(0, 3),
    why,
    nextActions,
    systemNotes,
    reflection,
    genericBrowseNotes,
  };
}

function Logo() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.92)", border: `1px solid ${theme.border}` }}>
      <Shield size={18} color={theme.oliveDark} />
      <span style={{ fontWeight: 900, letterSpacing: 3, color: theme.navy }}>PREPPED</span>
    </div>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <div style={{ width: "min(1240px, calc(100vw - 32px))", margin: "0 auto" }}>{children}</div>;
}

function StepPill({ label, active, onClick, quiet = false }: { label: string; active: boolean; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 52,
        minWidth: 152,
        padding: "0 18px",
        borderRadius: 999,
        border: `1px solid ${active ? theme.navy : quiet ? theme.border : theme.borderStrong}`,
        background: active ? theme.navy : theme.card,
        color: active ? "#fff" : theme.text,
        fontWeight: 700,
        transition: "all .2s ease",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      {label}
    </button>
  );
}

function OptionCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 78,
        textAlign: "left",
        padding: 20,
        borderRadius: theme.radiusSm,
        border: `1px solid ${active ? theme.navy : theme.border}`,
        background: active ? "#F2F6FB" : theme.card,
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        boxShadow: active ? "0 10px 28px rgba(33,58,87,0.08)" : "none",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: `2px solid ${active ? theme.navy : theme.borderStrong}`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: "#fff",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 999, background: active ? theme.navy : "transparent" }} />
      </div>
      <span style={{ fontWeight: 700, color: theme.text, lineHeight: 1.35 }}>{label}</span>
    </button>
  );
}

function MiniImage({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 136,
        borderRadius: 16,
        border: `1px dashed ${theme.borderStrong}`,
        background: `linear-gradient(135deg, ${theme.surfaceAlt}, ${theme.surface})`,
        display: "grid",
        placeItems: "center",
        color: theme.textMuted,
        fontSize: 13,
        textAlign: "center",
        padding: 18,
      }}
    >
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
    <div style={{ background: theme.card, border: `1px solid ${primary ? theme.navy : theme.border}`, borderRadius: 20, padding: 18, boxShadow: primary ? "0 18px 40px rgba(33,58,87,0.08)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: primary ? theme.navy : theme.textMuted }}>
          {primary ? "Best place to start" : "Recommended add-on"}
        </div>
        {item.badge && <div style={{ background: primary ? theme.sage : theme.surfaceAlt, color: theme.text, padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{item.badge}</div>}
      </div>
      <MiniImage label={item.imageLabel} />
      <div style={{ marginTop: 14, fontSize: 24, fontWeight: 850, color: theme.text }}>{item.title}</div>
      <div style={{ marginTop: 6, color: theme.textSoft, lineHeight: 1.55 }}>{item.subtitle}</div>
      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <InfoLine label="Suggested quantity" value={`${item.quantity}x`} />
        <InfoLine label="Why this fits" value={item.reason} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <a href={`https://${shop.domain}/products/${item.handle}`} target="_blank" rel="noreferrer" style={buttonStyle("primary")}>View product</a>
        <a href={`https://${shop.domain}/products/${item.handle}`} target="_blank" rel="noreferrer" style={buttonStyle("secondary")}>Open in Shopify</a>
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

function buttonStyle(variant: "primary" | "secondary" | "ghost" = "secondary"): React.CSSProperties {
  const primary = variant === "primary";
  const ghost = variant === "ghost";
  return {
    minHeight: 46,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    fontWeight: 800,
    background: primary ? theme.navy : ghost ? "transparent" : theme.card,
    color: primary ? "#fff" : theme.text,
    border: primary ? "none" : `1px solid ${theme.border}`,
    padding: "0 16px",
    cursor: "pointer",
  };
}

export default function PreppedShopifyDiscoveryExperienceV2() {
  const [view, setView] = useState<"landing" | "quiz" | "email_gate" | "results" | "browse_only">("landing");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showPeopleDetails, setShowPeopleDetails] = useState(false);
  const [confirmReflection, setConfirmReflection] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const q = questions[step];
  const recommendation = useMemo(() => buildRecommendation(answers), [answers]);
  const progress = Math.round(((step + 1) / questions.length) * 100);
  const hasEmail = Boolean((answers.email as string)?.trim());

  function setSingle(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function setMulti(id: string, value: string, limit?: number) {
    setAnswers((prev) => ({ ...prev, [id]: toggleValue((prev[id] as string[]) || [], value, limit) }));
  }

  function canContinue() {
    if (q.type === "transition") return Boolean(confirmReflection);
    if (q.type === "location") return Boolean((answers.location_text as string)?.trim()) || ((answers.location as string[]) || []).length > 0;
    if (q.type === "people") return ((answers.people as string[]) || []).length > 0 || Object.keys(answers).some((k) => k.endsWith("_count") && Number(answers[k]) > 0);
    if (q.type === "single") return Boolean(answers[q.id]);
    if (q.type === "multi" || q.type === "multiLimit") return ((answers[q.id] as string[]) || []).length > 0;
    if (q.type === "access") return Boolean(answers.access);
    return true;
  }

  function renderQuestionBody() {
    if (q.type === "location") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>Town, suburb, or nearest place</div>
            <input
              value={(answers.location_text as string) || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, location_text: e.target.value }))}
              placeholder="e.g. Lower Hutt"
              style={inputStyle()}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
            {q.chips?.map((chip) => (
              <StepPill key={chip} label={chip} active={((answers.location as string[]) || []).includes(chip)} onClick={() => setMulti("location", chip)} />
            ))}
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 16 }}>
            <button type="button" onClick={() => setShowLocationDetails((v) => !v)} style={linkButtonStyle()}>
              {showLocationDetails ? "Hide extra detail" : "Add more detail (optional)"}
            </button>
            {showLocationDetails && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch", marginTop: 14 }}>
                {q.detailFields?.map((chip) => (
                  <StepPill key={chip} label={chip} active={((answers.location_detail as string[]) || []).includes(chip)} onClick={() => setMulti("location_detail", chip)} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (q.type === "people") {
      const countFields: Array<[string, string]> = [
        ["adult_male_count", "Adult males"],
        ["adult_female_count", "Adult females"],
        ["babies_count", "Babies"],
        ["children_count", "Children"],
        ["teen_male_count", "Teenage males"],
        ["teen_female_count", "Teenage females"],
        ["older_adult_male_count", "Older adult males"],
        ["older_adult_female_count", "Older adult females"],
        ["pets_count", "Pets"],
      ];
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
            {q.chips?.map((chip) => (
              <StepPill key={chip} label={chip} active={((answers.people as string[]) || []).includes(chip)} onClick={() => setMulti("people", chip)} />
            ))}
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 16 }}>
            <button type="button" onClick={() => setShowPeopleDetails((v) => !v)} style={linkButtonStyle()}>
              {showPeopleDetails ? "Hide exact numbers" : "Add exact numbers (optional)"}
            </button>
            {showPeopleDetails && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginTop: 16 }}>
                {countFields.map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>{label}</div>
                    <input type="number" min={0} value={String(answers[key] || 0)} onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))} style={inputStyle()} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (q.type === "single") {
      return <div style={{ display: "grid", gap: 14 }}>{q.options?.map((option) => <OptionCard key={option} label={option} active={answers[q.id] === option} onClick={() => setSingle(q.id, option)} />)}</div>;
    }

    if (q.type === "multi") {
      return <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>{q.chips?.map((chip) => <StepPill key={chip} label={chip} active={((answers[q.id] as string[]) || []).includes(chip)} onClick={() => setMulti(q.id, chip)} />)}</div>;
    }

    if (q.type === "multiLimit") {
      return (
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", color: theme.textMuted, marginBottom: 10 }}>Choose up to {q.limit}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>{q.chips?.map((chip) => <StepPill key={chip} label={chip} active={((answers[q.id] as string[]) || []).includes(chip)} onClick={() => setMulti(q.id, chip, q.limit)} />)}</div>
        </div>
      );
    }

    if (q.type === "access") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 14 }}>{q.options?.map((option) => <OptionCard key={option} label={option} active={answers.access === option} onClick={() => setSingle("access", option)} />)}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>{q.chips?.map((chip) => <StepPill key={chip} label={chip} active={((answers.access_chips as string[]) || []).includes(chip)} onClick={() => setMulti("access_chips", chip)} />)}</div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <ReflectionCard recommendation={recommendation} />
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusSm, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Lock size={16} color={theme.navy} />
            <div style={{ fontWeight: 800, color: theme.text }}>Unlock your tailored recommendation</div>
          </div>
          <div style={{ color: theme.textSoft, lineHeight: 1.65, marginBottom: 16 }}>
            You can still browse PREPPED products without continuing, but the deeper explanation, fit logic, and saved plan are only unlocked once you choose to continue with email or account creation.
          </div>
          <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted }}>Email address</div>
            <input type="email" value={(answers.email as string) || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" style={inputStyle()} />
          </label>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: theme.surface, borderRadius: 16, border: `1px solid ${theme.border}` }}>
            <input type="checkbox" checked={confirmReflection} onChange={(e) => setConfirmReflection(e.target.checked)} />
            <span style={{ color: theme.text, lineHeight: 1.55 }}>Yes, this feels broadly right for my situation.</span>
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" onClick={() => setShowPreview((v) => !v)} style={buttonStyle("secondary")}>
              <Eye size={16} style={{ marginRight: 6 }} /> {showPreview ? "Hide preview" : "Preview what’s inside"}
            </button>
            <button type="button" onClick={() => setView("browse_only")} style={buttonStyle("ghost")}>
              Browse products instead
            </button>
          </div>
          {showPreview && (
            <div style={{ marginTop: 16, background: theme.surfaceAlt, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SlidersHorizontal size={16} color={theme.navy} />
                <div style={{ fontWeight: 800 }}>Preview</div>
              </div>
              <div style={{ color: theme.textSoft, lineHeight: 1.6 }}>
                We’ve already identified a likely starting point and the strongest next add-ons. Add your email to unlock the full explanation, quantities, and saved plan pathway.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${theme.bg} 0%, #EEE6D6 100%)`, color: theme.text, fontFamily: "Inter, Arial, sans-serif" }}>
      <Container>
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: "34px 0 56px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo /></div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(320px,0.9fr)", gap: 24, alignItems: "stretch" }}>
                <div style={{ background: theme.surfaceDark, color: "white", borderRadius: theme.radiusLg, padding: 32, boxShadow: theme.shadow, position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,0.08)", fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase" }}>
                    <Sparkles size={14} /> Household-first preparedness
                  </div>
                  <h1 style={{ margin: "18px 0 0", fontSize: "clamp(38px, 6vw, 66px)", lineHeight: 0.94, fontWeight: 900, letterSpacing: -1.6 }}>
                    Find the right
                    <br />
                    starting point
                    <br />
                    for your household
                  </h1>
                  <p style={{ margin: "18px 0 0", maxWidth: 680, color: "rgba(255,255,255,0.88)", fontSize: 18, lineHeight: 1.7 }}>
                    Answer a few quick questions and we’ll guide you to the most practical setup for your situation, your likely disruptions, and the people relying on you.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                    {[
                      "Tailored to your household",
                      "2–3 minutes to complete",
                      "Editable and built to grow",
                    ].map((pill) => (
                      <div key={pill} style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.94)", fontWeight: 700, fontSize: 14 }}>{pill}</div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
                    <button type="button" onClick={() => setView("quiz")} style={{ minHeight: 54, padding: "0 20px", borderRadius: 16, border: 0, background: theme.olive, color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 14px 28px rgba(104,124,42,0.25)" }}>
                      Start my plan
                    </button>
                    <a href={`https://${shop.domain}`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("secondary"), minHeight: 54 }}>
                      Visit PREPPED
                    </a>
                  </div>
                  <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <MetricCard icon={<MapPin size={18} />} label="Discover" text="We start with your place, people, and pressure points." />
                    <MetricCard icon={<Package size={18} />} label="Build" text="You get one clear starting point and best-fit add-ons." />
                    <MetricCard icon={<HeartHandshake size={18} />} label="Grow" text="The system is designed to evolve with your household later." />
                  </div>
                </div>
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusLg, padding: 22, boxShadow: theme.shadow }}>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: theme.textMuted, marginBottom: 10 }}>How it works</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <HowItWorks number="01" title="Tell us about your household" text="Place, people, priorities, and what you already have covered." />
                      <HowItWorks number="02" title="See what fits best" text="A clearer starting point, with reasons, not just products." />
                      <HowItWorks number="03" title="Save and refine later" text="This becomes the basis for a longer-term PREPPED journey." />
                    </div>
                  </div>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: theme.radiusLg, padding: 22 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: theme.textMuted, marginBottom: 10 }}>Designed for real households</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {[
                        "Couples",
                        "Families",
                        "Apartments",
                        "Rural homes",
                        "Low-storage setups",
                        "Pet households",
                        "Life-change moments",
                      ].map((item) => (
                        <StepPill key={item} label={item} active={false} onClick={() => {}} quiet />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} style={{ padding: "24px 0 40px" }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 30, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: "440px minmax(0,1fr)" }}>
                  <aside style={{ background: theme.surfaceDark, color: "white", padding: 34, display: "grid", alignContent: "space-between", gap: 28 }}>
                    <div>
                      <Logo />
                      <div style={{ marginTop: 24, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.72, fontWeight: 900 }}>{q.eyebrow}</div>
                      <h2 style={{ margin: "10px 0 0", fontSize: 38, lineHeight: 1.08, fontWeight: 900, maxWidth: 370 }}>{q.title}</h2>
                      <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.82)", lineHeight: 1.8, maxWidth: 360, fontSize: 15 }}>{q.helper}</p>
                      <div style={{ marginTop: 26, background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <CircleHelp size={16} />
                          <span style={{ fontWeight: 800 }}>Why this matters</span>
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.68, color: "rgba(255,255,255,0.76)" }}>
                          {q.why || "This first discover phase sets the quality of every later recommendation, automation, and support layer."}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${theme.olive}, #8EA53F)` }} />
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                        <button type="button" onClick={() => step === 0 ? setView("landing") : setStep((s) => Math.max(0, s - 1))} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.16)" }}>
                          <ChevronLeft size={16} style={{ marginRight: 6 }} /> Back
                        </button>
                        {step < questions.length - 1 ? (
                          <button type="button" disabled={!canContinue()} onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))} style={{ minHeight: 46, padding: "0 16px", borderRadius: 14, border: 0, background: canContinue() ? theme.olive : "#98A27A", color: "white", fontWeight: 900, cursor: canContinue() ? "pointer" : "not-allowed" }}>
                            Continue <ChevronRight size={16} style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle" }} />
                          </button>
                        ) : (
                          <button type="button" disabled={!canContinue()} onClick={() => setView("email_gate")} style={{ minHeight: 46, padding: "0 16px", borderRadius: 14, border: 0, background: theme.olive, color: "white", fontWeight: 900, cursor: "pointer" }}>
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  </aside>
                  <main style={{ padding: 34, background: `linear-gradient(180deg, ${theme.surface} 0%, ${theme.bg} 100%)` }}>
                    <div style={{ maxWidth: 840 }}>{renderQuestionBody()}</div>
                  </main>
                </div>
              </div>
            </motion.div>
          )}

          {view === "email_gate" && (
            <motion.div key="email_gate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} style={{ padding: "28px 0 50px" }}>
              <div style={{ maxWidth: 960, margin: "0 auto", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 28, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr" }}>
                  <section style={{ background: theme.surfaceDark, color: "white", padding: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Lock size={18} />
                      <div style={{ fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>Unlock tailored results</div>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 38, lineHeight: 1.02, fontWeight: 900, maxWidth: 420 }}>Your full PREPPED explanation is ready</h2>
                    <p style={{ marginTop: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, maxWidth: 440 }}>
                      You can still browse the PREPPED product range without email, but the deeper fit logic, explanation, and saved plan pathway are reserved for households that choose to continue.
                    </p>
                    <div style={{ marginTop: 22, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <Eye size={16} />
                        <div style={{ fontWeight: 800 }}>What’s already inside</div>
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {recommendation.why.map((item) => (
                          <div key={item} style={{ display: "flex", gap: 10 }}>
                            <Check size={16} style={{ marginTop: 4, color: "#B7D67A" }} />
                            <div style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.6 }}>{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section style={{ padding: 28, background: theme.surface }}>
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <Mail size={18} color={theme.navy} />
                        <div style={{ fontWeight: 800 }}>Continue with email</div>
                      </div>
                      <label style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, textTransform: "uppercase", color: theme.textMuted }}>Email address</div>
                        <input type="email" value={(answers.email as string) || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" style={inputStyle()} />
                      </label>
                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        <button type="button" disabled={!hasEmail} onClick={() => setView("results")} style={{ ...buttonStyle("primary"), width: "100%", opacity: hasEmail ? 1 : 0.55 }}>
                          Unlock my tailored plan
                        </button>
                        <a href={`https://${shop.domain}/account/register`} target="_blank" rel="noreferrer" style={{ ...buttonStyle("secondary"), width: "100%" }}>
                          Create account instead
                        </a>
                        <button type="button" onClick={() => setView("browse_only")} style={{ ...buttonStyle("ghost"), justifyContent: "flex-start", padding: 0 }}>
                          Continue without email and browse products
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: "24px 0 50px" }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 30, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ background: `linear-gradient(90deg, ${theme.oliveDark}, ${theme.olive})`, color: "white", padding: "18px 24px", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.86 }}>Your PREPPED starting point</div>
                    <div style={{ marginTop: 4, fontSize: 16, opacity: 0.96 }}>{recommendation.summary}</div>
                  </div>
                  <button type="button" onClick={() => setView("landing")} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.18)" }}>Close</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(320px,0.95fr)", gap: 0 }}>
                  <section style={{ padding: 24, background: theme.surfaceDark, color: "white" }}>
                    <div style={{ display: "grid", gap: 18 }}>
                      <div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                          <Tag>{recommendation.path}</Tag>
                          <Tag>{recommendation.confidence}</Tag>
                          <Tag>{recommendation.stage}</Tag>
                        </div>
                        <h2 style={{ margin: 0, fontSize: 44, lineHeight: 0.98, fontWeight: 900 }}>A clearer first step, built around your situation</h2>
                        <p style={{ marginTop: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.75, maxWidth: 720 }}>
                          This is designed to feel useful now and flexible later. The goal is not to overwhelm you. It is to help you begin with the most credible next step and build from there over time. {recommendation.mainProduct.reason}
                        </p>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <BadgeCheck size={16} color="#B7D67A" />
                          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>Because you selected</div>
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {recommendation.why.map((line) => (
                            <div key={line} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <Check size={16} style={{ marginTop: 4, color: "#B7D67A" }} />
                              <div style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>{line}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                        <DarkMetric icon={<Package size={18} />} label="Preparation Packs" value={`${recommendation.preparationPackQty}x`} />
                        <DarkMetric icon={<Home size={18} />} label="Home setup" value={`${recommendation.homePackQty}x`} />
                        <DarkMetric icon={<Car size={18} />} label="Car setup" value={`${recommendation.carPackQty}x`} />
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase", color: "rgba(255,255,255,0.68)", marginBottom: 10 }}>What to do first</div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {recommendation.nextActions.map((item, idx) => (
                            <div key={item} style={{ display: "flex", gap: 12 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center", fontWeight: 900 }}>{idx + 1}</div>
                              <div style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>{item}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                  <section style={{ padding: 24, background: theme.surface }}>
                    <div style={{ display: "grid", gap: 16 }}>
                      <ProductResultCard item={recommendation.mainProduct} primary />
                      {recommendation.addOns.map((item) => (
                        <ProductResultCard key={item.handle} item={item} />
                      ))}
                      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 18 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase", color: theme.textMuted, marginBottom: 10 }}>System notes</div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {recommendation.systemNotes.map((note) => (
                            <div key={note} style={{ color: theme.textSoft, lineHeight: 1.55 }}>{note}</div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                          <a href={`https://${shop.domain}/collections/all`} target="_blank" rel="noreferrer" style={buttonStyle("primary")}>Browse all products</a>
                          <a href={`https://${shop.domain}/account/register`} target="_blank" rel="noreferrer" style={buttonStyle("secondary")}>Create account</a>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {view === "browse_only" && (
            <motion.div key="browse_only" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} style={{ padding: "28px 0 56px" }}>
              <div style={{ maxWidth: 1080, margin: "0 auto", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 28, overflow: "hidden", boxShadow: theme.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <section style={{ padding: 28, background: theme.surfaceDark, color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Eye size={18} />
                      <div style={{ fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>Browse mode</div>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 40, lineHeight: 1.02, fontWeight: 900 }}>Explore PREPPED products without unlocking the tailored layer</h2>
                    <p style={{ marginTop: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, maxWidth: 460 }}>
                      You can still explore the PREPPED range right away. The tailored explanation, saved plan, and deeper fit logic are held back until you choose to continue with email or account creation.
                    </p>
                    <div style={{ marginTop: 20, background: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        {recommendation.genericBrowseNotes.map((item) => (
                          <div key={item} style={{ display: "flex", gap: 10 }}>
                            <Check size={16} style={{ marginTop: 4, color: "#B7D67A" }} />
                            <div style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.6 }}>{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section style={{ padding: 28, background: theme.surface }}>
                    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20 }}>
                      <MiniImage label={shop.imagePlaceholders.productLibrary} />
                      <div style={{ marginTop: 16, fontSize: 24, fontWeight: 850, color: theme.text }}>Browse the PREPPED product range</div>
                      <div style={{ marginTop: 8, color: theme.textSoft, lineHeight: 1.6 }}>
                        Start with the broader collection now, or come back and unlock the tailored path when you’re ready.
                      </div>
                      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                        <a href={`https://${shop.domain}/collections/all`} target="_blank" rel="noreferrer" style={buttonStyle("primary")}>Browse all products</a>
                        <button type="button" onClick={() => setView("email_gate")} style={buttonStyle("secondary")}>Unlock tailored results instead</button>
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

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: 50,
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    padding: "0 14px",
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

function MetricCard({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 16 }}>
      <div style={{ color: "#CDE29C", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.55, fontSize: 14 }}>{text}</div>
    </div>
  );
}

function HowItWorks({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: theme.surfaceAlt, display: "grid", placeItems: "center", fontWeight: 900, color: theme.navy }}>{number}</div>
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
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 16 }}>
      <div style={{ color: "#B7D67A", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "rgba(255,255,255,0.65)", fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
