import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClients,
  createClient,
  updateClient as updateClientServer,
  deleteClient as deleteClientServer,
} from "@/lib/clients.functions";

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
  url?: string;
  signedUrl?: string;
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
  portalToken?: string;
  createdAt: string;
  updatedAt: string;
  activity: ActivityEntry[];
};

type Ctx = {
  clients: ClientRecord[];
  isLoading: boolean;
  getClient: (id: string) => ClientRecord | undefined;
  addClient: (
    c: Omit<ClientRecord, "id" | "createdAt" | "updatedAt" | "activity" | "status"> & {
      status?: ClientStatus;
    },
  ) => Promise<ClientRecord & { isNew: boolean }>;
  updateClient: (
    id: string,
    patch: Partial<ClientRecord>,
    activityLabel?: string,
  ) => Promise<ClientRecord>;
  removeClient: (id: string) => Promise<void>;
};

const ClientsContext = createContext<Ctx | null>(null);

function upsertClientInCache(queryClient: ReturnType<typeof useQueryClient>, client: ClientRecord) {
  queryClient.setQueryData<ClientRecord[]>(["clients"], (prev) => {
    const list = prev ?? [];
    const without = list.filter((c) => c.id !== client.id);
    return [client, ...without];
  });
}

export function ClientsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchClients = useServerFn(listClients);
  const addClientFn = useServerFn(createClient);
  const updateClientFn = useServerFn(updateClientServer);
  const deleteClientFn = useServerFn(deleteClientServer);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => fetchClients(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const addClient: Ctx["addClient"] = useCallback(
    async (draft) => {
      const result = await addClientFn({ data: draft });
      const record = result.client as ClientRecord;
      upsertClientInCache(queryClient, record);
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      return { ...record, isNew: result.isNew };
    },
    [addClientFn, queryClient],
  );

  const updateClient: Ctx["updateClient"] = useCallback(
    async (id, patch, activityLabel) => {
      const record = await updateClientFn({ data: { id, patch, activityLabel } });
      upsertClientInCache(queryClient, record as ClientRecord);
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      return record as ClientRecord;
    },
    [updateClientFn, queryClient],
  );

  const removeClient: Ctx["removeClient"] = useCallback(
    async (id) => {
      await deleteClientFn({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    [deleteClientFn, queryClient],
  );

  const value = useMemo(
    () => ({ clients, isLoading, getClient, addClient, updateClient, removeClient }),
    [clients, isLoading, getClient, addClient, updateClient, removeClient],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used inside ClientsProvider");
  return ctx;
}

export function formatRelative(iso: string) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Recently";

  const diff = Date.now() - ts;
  if (diff < 0) return "Just now";

  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
