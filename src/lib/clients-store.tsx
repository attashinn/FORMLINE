import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ClientStatus = "New" | "In Progress" | "Completed";

export type ActivityEntry = {
  id: string;
  label: string;
  timestamp: string;
  kind?: "submission" | "update" | "note" | "status";
};

export type ClientFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
};

export type ClientRecord = {
  id: string;
  // personal
  fullName: string;
  email: string;
  phone: string;
  company: string;
  // business
  industry: string;
  website: string;
  location: string;
  companySize: string;
  // branding
  brandColors: string[];
  styleReferences: string;
  logo?: ClientFile;
  // project
  goals: string;
  budget: string;
  deadline: string;
  services: string[];
  // misc
  notes: string;
  files: ClientFile[];
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  activity: ActivityEntry[];
};

const STORAGE_KEY = "cph.clients.v1";

const seed: ClientRecord[] = [
  {
    id: "c-aether",
    fullName: "Julian Vane",
    email: "julian@aether.co",
    phone: "+1 415 555 0142",
    company: "Aether Architecture",
    industry: "Urban Design",
    website: "aether-architecture.co",
    location: "Brooklyn, NY",
    companySize: "11–50",
    brandColors: ["#18181b", "#a8a29e", "#fafaf9"],
    styleReferences: "Editorial, minimal, grayscale photography with warm paper textures.",
    goals:
      "Rebrand the primary digital footprint to reflect a modern, sustainable approach to urban planning. Focus on minimalist aesthetic and high-performance load times.",
    budget: "$12,000 – $15,000",
    deadline: "2025-12-12",
    services: ["Brand identity", "Website design", "Content strategy"],
    notes: "Client prefers muted tones. Avoid high-contrast primary colors. Next meeting scheduled for Friday 2 PM.",
    files: [],
    status: "In Progress",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    activity: [
      { id: "a1", label: "Intake form submitted", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), kind: "submission" },
      { id: "a2", label: "Discovery call scheduled", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), kind: "update" },
      { id: "a3", label: "Status moved to In Progress", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), kind: "status" },
    ],
  },
  {
    id: "c-lumina",
    fullName: "Sasha Reyes",
    email: "sasha@lumina.co",
    phone: "+1 212 555 0188",
    company: "Lumina Skincare",
    industry: "E-commerce",
    website: "luminaskin.co",
    location: "Los Angeles, CA",
    companySize: "2–10",
    brandColors: ["#f5e6d3", "#c69b7b", "#3f3a36"],
    styleReferences: "Warm, soft, dermatology-meets-editorial.",
    goals: "Launch a Shopify storefront with subscription quiz and editorial product pages.",
    budget: "$7,000 – $9,000",
    deadline: "2025-11-04",
    services: ["E-commerce", "Brand identity"],
    notes: "Approved final color palette. Awaiting product photography.",
    files: [],
    status: "Completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    activity: [
      { id: "a1", label: "Intake form submitted", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(), kind: "submission" },
      { id: "a2", label: "Project marked Completed", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), kind: "status" },
    ],
  },
  {
    id: "c-northwood",
    fullName: "Mara Cole",
    email: "mara@northwood.studio",
    phone: "+1 503 555 0119",
    company: "Northwood Studio",
    industry: "Hospitality & Travel",
    website: "northwood.studio",
    location: "Portland, OR",
    companySize: "Solo",
    brandColors: ["#2c3a2f", "#dcd6c7", "#8a3324"],
    styleReferences: "Pacific Northwest, slow travel, journal-like type.",
    goals: "Build a boutique hotel website with booking integration and a stories section.",
    budget: "$18,000 – $22,000",
    deadline: "2026-02-20",
    services: ["Website design", "Brand identity", "Photography direction"],
    notes: "",
    files: [],
    status: "New",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    activity: [
      { id: "a1", label: "Intake form submitted", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), kind: "submission" },
    ],
  },
];

type Ctx = {
  clients: ClientRecord[];
  getClient: (id: string) => ClientRecord | undefined;
  addClient: (c: Omit<ClientRecord, "id" | "createdAt" | "updatedAt" | "activity" | "status"> & { status?: ClientStatus }) => ClientRecord;
  updateClient: (id: string, patch: Partial<ClientRecord>, activityLabel?: string) => void;
  removeClient: (id: string) => void;
};

const ClientsContext = createContext<Ctx | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientRecord[]>(seed);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClientRecord[];
        if (Array.isArray(parsed)) setClients(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch {}
  }, [clients]);

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const addClient: Ctx["addClient"] = useCallback((draft) => {
    const now = new Date().toISOString();
    const record: ClientRecord = {
      ...draft,
      id: `c-${Math.random().toString(36).slice(2, 9)}`,
      status: draft.status ?? "New",
      createdAt: now,
      updatedAt: now,
      activity: [{ id: `a-${Date.now()}`, label: "Intake form submitted", timestamp: now, kind: "submission" }],
    };
    setClients((prev) => [record, ...prev]);
    return record;
  }, []);

  const updateClient: Ctx["updateClient"] = useCallback((id, patch, activityLabel) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const now = new Date().toISOString();
        const activity = activityLabel
          ? [{ id: `a-${Date.now()}`, label: activityLabel, timestamp: now, kind: "update" as const }, ...c.activity]
          : c.activity;
        return { ...c, ...patch, updatedAt: now, activity };
      }),
    );
  }, []);

  const removeClient: Ctx["removeClient"] = useCallback((id) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(() => ({ clients, getClient, addClient, updateClient, removeClient }), [clients, getClient, addClient, updateClient, removeClient]);

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used inside ClientsProvider");
  return ctx;
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function exportClientsCsv(clients: ClientRecord[]) {
  const headers = [
    "id",
    "fullName",
    "email",
    "phone",
    "company",
    "industry",
    "website",
    "location",
    "companySize",
    "budget",
    "deadline",
    "services",
    "status",
    "createdAt",
  ];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = clients.map((c) =>
    [
      c.id,
      c.fullName,
      c.email,
      c.phone,
      c.company,
      c.industry,
      c.website,
      c.location,
      c.companySize,
      c.budget,
      c.deadline,
      c.services.join("; "),
      c.status,
      c.createdAt,
    ]
      .map(escape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
