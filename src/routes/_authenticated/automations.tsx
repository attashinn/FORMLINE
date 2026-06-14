import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, X, Mail, Users, FileText, Check,
  Trash2, Calendar, Loader2, GlobeAlt, ArrowLeft,
  Settings, BarChart3, ClipboardList, Sparkles,
} from "@/components/heroicons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Formline" },
      { name: "description", content: "Build visual no-code workflows that run automatically on your workspace events." },
    ],
  }),
  component: AutomationsPage,
});

/* ─────────────────────────────── Types ─────────────────────────────── */

type NodeCategory = "trigger" | "action" | "condition";

type NodeDef = {
  kind: string;
  label: string;
  desc: string;
  category: NodeCategory;
  color: string;
  bg: string;
};

type CanvasNode = { id: string; kind: string; x: number; y: number };
type Connection  = { id: string; from: string; to: string };

type Automation = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: CanvasNode[];
  connections: Connection[];
  runs: number;
  lastRun: string | null;
};

/* ──────────────────────────── Catalogue ────────────────────────────── */

const NODE_W = 210;
const NODE_H = 72;

const DEFS: NodeDef[] = [
  // Triggers
  { kind: "trigger_form_submit",   label: "Form Submitted",   desc: "Fires when a form gets a new response",    category: "trigger",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  { kind: "trigger_new_client",    label: "New Client",       desc: "Fires when a client is created",           category: "trigger",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  { kind: "trigger_status_change", label: "Status Changed",   desc: "Fires when a client's status changes",     category: "trigger",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  { kind: "trigger_schedule",      label: "Schedule",         desc: "Runs on a time-based schedule",            category: "trigger",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  // Actions
  { kind: "action_send_email",     label: "Send Email",       desc: "Send an email to a recipient",             category: "action",    color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  { kind: "action_create_client",  label: "Create Client",    desc: "Convert a response into a client",         category: "action",    color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  { kind: "action_update_status",  label: "Update Status",    desc: "Change a client's pipeline status",        category: "action",    color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  { kind: "action_webhook",        label: "HTTP Request",     desc: "POST data to any external URL",            category: "action",    color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  { kind: "action_notify",         label: "Notification",     desc: "Trigger an in-app notification",           category: "action",    color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" },
  // Conditions
  { kind: "condition_if",          label: "If / Else",        desc: "Branch the flow based on a condition",     category: "condition", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
];

const DEF_MAP = Object.fromEntries(DEFS.map(d => [d.kind, d]));

function getDef(kind: string): NodeDef {
  return DEF_MAP[kind] ?? { kind, label: kind, desc: "", category: "action", color: "#7C5CFF", bg: "rgba(124,92,255,0.12)" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KIND_ICONS: Record<string, React.ComponentType<any>> = {
  trigger_form_submit:   FileText,
  trigger_new_client:    Users,
  trigger_status_change: Loader2,
  trigger_schedule:      Calendar,
  action_send_email:     Mail,
  action_create_client:  Users,
  action_update_status:  Check,
  action_webhook:        GlobeAlt,
  action_notify:         Zap,
  condition_if:          BarChart3,
};

function getIcon(kind: string) { return KIND_ICONS[kind] ?? Zap; }

function formatAge(iso: string | null) {
  if (!iso) return "Never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function bezier(from: CanvasNode, to: CanvasNode) {
  const sx = from.x + NODE_W, sy = from.y + NODE_H / 2;
  const ex = to.x,            ey = to.y   + NODE_H / 2;
  const dx = Math.max(Math.abs(ex - sx) * 0.45, 80);
  return `M ${sx} ${sy} C ${sx + dx} ${sy} ${ex - dx} ${ey} ${ex} ${ey}`;
}

/* ─────────────────────────── Initial data ──────────────────────────── */

const NOW = Date.now();

const INITIAL: Automation[] = [
  {
    id: "a1", name: "Welcome New Clients",
    description: "Send a welcome email when a form is submitted",
    enabled: true, runs: 47, lastRun: new Date(NOW - 2 * 3600000).toISOString(),
    nodes: [
      { id: "n1", kind: "trigger_form_submit", x: 80,  y: 120 },
      { id: "n2", kind: "action_send_email",   x: 380, y: 120 },
    ],
    connections: [{ id: "c1", from: "n1", to: "n2" }],
  },
  {
    id: "a2", name: "Auto-Convert Leads",
    description: "Convert form responses to clients automatically",
    enabled: false, runs: 12, lastRun: new Date(NOW - 86400000).toISOString(),
    nodes: [
      { id: "n1", kind: "trigger_form_submit",  x: 60,  y: 130 },
      { id: "n2", kind: "action_create_client", x: 360, y: 130 },
      { id: "n3", kind: "action_send_email",    x: 660, y: 130 },
    ],
    connections: [
      { id: "c1", from: "n1", to: "n2" },
      { id: "c2", from: "n2", to: "n3" },
    ],
  },
  {
    id: "a3", name: "Status Change Notifier",
    description: "Get notified when a client's status changes",
    enabled: true, runs: 23, lastRun: new Date(NOW - 6 * 3600000).toISOString(),
    nodes: [
      { id: "n1", kind: "trigger_status_change", x: 60,  y: 140 },
      { id: "n2", kind: "condition_if",           x: 360, y: 140 },
      { id: "n3", kind: "action_send_email",      x: 660, y: 70  },
      { id: "n4", kind: "action_notify",          x: 660, y: 210 },
    ],
    connections: [
      { id: "c1", from: "n1", to: "n2" },
      { id: "c2", from: "n2", to: "n3" },
      { id: "c3", from: "n2", to: "n4" },
    ],
  },
  {
    id: "a4", name: "Weekly Summary",
    description: "Send a workspace digest every Monday",
    enabled: false, runs: 8, lastRun: new Date(NOW - 7 * 86400000).toISOString(),
    nodes: [
      { id: "n1", kind: "trigger_schedule",  x: 80,  y: 120 },
      { id: "n2", kind: "action_send_email", x: 380, y: 120 },
    ],
    connections: [{ id: "c1", from: "n1", to: "n2" }],
  },
];

/* ─────────────────────── Mini-canvas preview ───────────────────────── */

function MiniPreview({ nodes, connections, enabled }: { nodes: CanvasNode[]; connections: Connection[]; enabled: boolean }) {
  if (nodes.length === 0) return (
    <div className="h-24 rounded-xl bg-surface-muted/50 flex items-center justify-center text-xs text-muted-foreground">
      Empty — open editor to add nodes
    </div>
  );
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const pad = 24;
  const vMinX = Math.min(...xs) - pad;
  const vMinY = Math.min(...ys) - pad;
  const vW    = Math.max(...xs) + NODE_W + pad - vMinX;
  const vH    = Math.max(...ys) + NODE_H + pad - vMinY;

  return (
    <svg
      viewBox={`${vMinX} ${vMinY} ${vW} ${vH}`}
      className="w-full h-24 rounded-xl"
      style={{ background: "rgba(10,10,18,0.55)" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={`dp`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>
      <rect x={vMinX} y={vMinY} width={vW} height={vH} fill="url(#dp)" />
      {connections.map(c => {
        const f = nodes.find(n => n.id === c.from);
        const t = nodes.find(n => n.id === c.to);
        if (!f || !t) return null;
        const pathD = bezier(f, t);
        return (
          <g key={c.id}>
            <path d={pathD} fill="none" stroke="rgba(124,92,255,0.35)" strokeWidth="2.2" />
            {enabled && (
              <path d={pathD} fill="none" stroke="#A28CFF" strokeWidth="1.8" strokeDasharray="5 5" className="animate-flow-dash opacity-60" />
            )}
          </g>
        );
      })}
      {nodes.map(n => {
        const d = getDef(n.kind);
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx="8"
              fill="rgba(16,16,26,0.96)" stroke={d.color} strokeWidth="1.2" />
            <rect x={n.x} y={n.y} width={4} height={NODE_H} rx="2" fill={d.color} />
            <text x={n.x + 18} y={n.y + NODE_H / 2 - 4} fill="rgba(255,255,255,0.5)" fontSize="8.5" fontWeight="700">
              {d.category.toUpperCase()}
            </text>
            <text x={n.x + 18} y={n.y + NODE_H / 2 + 9} fill="white" fontSize="10.5" fontWeight="600">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────── Canvas Editor ─────────────────────────── */

function Canvas({ auto, onChange }: { auto: Automation; onChange: (a: Automation) => void }) {
  const [nodes,      setNodes]      = useState<CanvasNode[]>(auto.nodes);
  const [conns,      setConns]      = useState<Connection[]>(auto.connections);
  const [selId,      setSelId]      = useState<string | null>(null);
  const [linking,    setLinking]    = useState<string | null>(null); // source node id
  const [showPalette, setShowPalette] = useState(false);
  const dragRef = useRef<{ nid: string; mx: number; my: number; nx: number; ny: number } | null>(null);

  const selNode = nodes.find(n => n.id === selId) ?? null;
  const selDef  = selNode ? getDef(selNode.kind) : null;

  function addNode(kind: string) {
    const n: CanvasNode = { id: `n-${Date.now()}`, kind, x: 80 + nodes.length * 30, y: 100 + (nodes.length % 4) * 90 };
    const nxt = [...nodes, n];
    setNodes(nxt); onChange({ ...auto, nodes: nxt, connections: conns });
    setShowPalette(false); // Auto close drawer on mobile
  }

  function delNode(id: string) {
    const nxtN = nodes.filter(n => n.id !== id);
    const nxtC = conns.filter(c => c.from !== id && c.to !== id);
    setNodes(nxtN); setConns(nxtC); setSelId(null);
    onChange({ ...auto, nodes: nxtN, connections: nxtC });
  }

  function delConn(id: string) {
    const nxt = conns.filter(c => c.id !== id);
    setConns(nxt); onChange({ ...auto, nodes, connections: nxt });
  }

  function nodeDown(e: React.MouseEvent, id: string) {
    if (linking) {
      if (id !== linking && !conns.find(c => c.from === linking && c.to === id)) {
        const nxt = [...conns, { id: `c-${Date.now()}`, from: linking, to: id }];
        setConns(nxt); onChange({ ...auto, nodes, connections: nxt });
      }
      setLinking(null); return;
    }
    e.stopPropagation();
    setSelId(id);
    const node = nodes.find(n => n.id === id)!;
    dragRef.current = { nid: id, mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
  }

  function touchStart(e: React.TouchEvent, id: string) {
    if (linking) {
      if (id !== linking && !conns.find(c => c.from === linking && c.to === id)) {
        const nxt = [...conns, { id: `c-${Date.now()}`, from: linking, to: id }];
        setConns(nxt); onChange({ ...auto, nodes, connections: nxt });
      }
      setLinking(null); return;
    }
    setSelId(id);
    const node = nodes.find(n => n.id === id)!;
    const touch = e.touches[0];
    dragRef.current = { nid: id, mx: touch.clientX, my: touch.clientY, nx: node.x, ny: node.y };
  }

  function onMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.mx;
    const dy = e.clientY - dragRef.current.my;
    setNodes(prev => prev.map(n => n.id === dragRef.current!.nid
      ? { ...n, x: dragRef.current!.nx + dx, y: dragRef.current!.ny + dy } : n));
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragRef.current.mx;
    const dy = touch.clientY - dragRef.current.my;
    setNodes(prev => prev.map(n => n.id === dragRef.current!.nid
      ? { ...n, x: dragRef.current!.nx + dx, y: dragRef.current!.ny + dy } : n));
  }

  function onUp() {
    if (dragRef.current) onChange({ ...auto, nodes, connections: conns });
    dragRef.current = null;
  }

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Left Sidebar Overlay Backdrop on Mobile ── */}
      <AnimatePresence>
        {showPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPalette(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          />
        )}
      </AnimatePresence>

      {/* ── Node Palette ── */}
      <aside className={`
        fixed inset-y-0 left-0 w-60 z-50 md:z-auto md:relative md:flex flex-col bg-[#0D0D14] border-r border-hairline transition-transform duration-300 ease-in-out shrink-0 overflow-y-auto
        ${showPalette ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Node Library</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">Click to add to canvas</div>
          </div>
          <button onClick={() => setShowPalette(false)} className="md:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {(["trigger", "action", "condition"] as NodeCategory[]).map(cat => (
          <div key={cat} className="p-3 border-b border-hairline/50">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 mb-2"
              style={{ color: cat === "trigger" ? "#22c55e" : cat === "action" ? "#7C5CFF" : "#f59e0b" }}>
              {cat}s
            </div>
            {DEFS.filter(d => d.category === cat).map(def => {
              const Icon = getIcon(def.kind);
              return (
                <button key={def.kind} onClick={() => addNode(def.kind)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left hover:bg-white/5 transition-colors group">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: def.bg, color: def.color }}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{def.label}</div>
                  </div>
                  <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ── Main Canvas ── */}
      <div
        className="relative flex-1 overflow-hidden select-none"
        style={{ background: "#08080F", backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.055) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onUp}
        onClick={() => { if (linking) setLinking(null); else setSelId(null); }}
      >
        {/* Floating Add Node FAB on Mobile */}
        <div className="absolute bottom-4 left-4 z-30 md:hidden">
          <button
            onClick={(e) => { e.stopPropagation(); setShowPalette(true); }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#7C5CFF] text-white text-xs font-bold shadow-lg shadow-[#7C5CFF]/30 active:scale-95 transition-transform"
          >
            <Plus className="size-4" /> Node Library
          </button>
        </div>

        {/* Linking hint */}
        <AnimatePresence>
          {linking && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#7C5CFF] px-4 py-1.5 text-xs font-medium text-white shadow-xl pointer-events-none">
              Click another node to connect → or click canvas to cancel
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="rgba(124,92,255,0.7)" />
            </marker>
          </defs>
          {conns.map(c => {
            const f = nodes.find(n => n.id === c.from);
            const t = nodes.find(n => n.id === c.to);
            if (!f || !t) return null;
            const pathD = bezier(f, t);
            return (
              <g key={c.id} className="group pointer-events-none">
                {/* Visual Line */}
                <path d={pathD} fill="none"
                  stroke="rgba(124,92,255,0.5)" strokeWidth="2.5"
                  markerEnd="url(#arr)"
                  className="group-hover:stroke-[#7C5CFF] transition-colors"
                />
                
                {/* Animated active pulse */}
                {auto.enabled && (
                  <path d={pathD} fill="none"
                    stroke="#A28CFF" strokeWidth="2" strokeDasharray="6 6"
                    className="animate-flow-dash opacity-70"
                  />
                )}
                
                {/* Thick interactive hit target for easy deletion */}
                <path d={pathD} fill="none"
                  stroke="transparent" strokeWidth="12"
                  className="pointer-events-auto cursor-pointer"
                  onClick={e => { e.stopPropagation(); delConn(c.id); }}
                >
                  <title>Click to delete connection</title>
                </path>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const def  = getDef(node.kind);
          const Icon = getIcon(node.kind);
          const isSel = selId === node.id;
          return (
            <div
              key={node.id}
              className={`absolute rounded-xl border cursor-grab active:cursor-grabbing transition-shadow ${
                isSel ? "border-[#7C5CFF] shadow-[0_0_0_2px_rgba(124,92,255,0.25),0_8px_32px_rgba(0,0,0,0.6)]"
                       : "border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-white/20"
              }`}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, background: "rgba(16,16,26,0.97)" }}
              onMouseDown={e => nodeDown(e, node.id)}
              onTouchStart={e => touchStart(e, node.id)}
            >
              {/* Accent bar */}
              <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full" style={{ background: def.color }} />

              {/* Content */}
              <div className="flex items-center gap-3 h-full px-4 pl-5">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: def.bg, color: def.color }}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: def.color, opacity: 0.8 }}>{def.category}</div>
                  <div className="text-sm font-semibold text-foreground truncate">{def.label}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); delNode(node.id); }}
                  className="grid size-5 place-items-center rounded text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                  <X className="size-3" />
                </button>
              </div>

              {/* Output port */}
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-4 rounded-full border-2 z-10 transition-all hover:scale-125"
                style={{ background: linking === node.id ? def.color : "#12121e", borderColor: def.color }}
                onClick={e => { e.stopPropagation(); setLinking(node.id); }}
                title="Connect to another node"
              />
              {/* Input port */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full border-2 pointer-events-none"
                style={{ background: "#12121e", borderColor: "rgba(255,255,255,0.2)" }} />
            </div>
          );
        })}

        {/* Empty canvas hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="grid size-14 place-items-center rounded-2xl bg-surface border border-hairline">
              <Zap className="size-6 text-[#7C5CFF]" />
            </div>
            <div className="text-sm font-semibold text-foreground">Canvas is empty</div>
            <div className="text-xs text-muted-foreground">Click any node in the library to add it here</div>
          </div>
        )}
      </div>

      {/* ── Config Overlay Backdrop on Mobile ── */}
      <AnimatePresence>
        {selDef && selNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelId(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          />
        )}
      </AnimatePresence>

      {/* ── Node Config Panel ── */}
      <AnimatePresence>
        {selDef && selNode && (
          <motion.aside
            key="cfg"
            initial={{ x: 280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 280, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-72 md:relative md:flex z-50 md:z-auto border-l border-hairline bg-[#0D0D14] flex flex-col overflow-y-auto shadow-2xl md:shadow-none"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Configure</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{selDef.label}</div>
              </div>
              <button onClick={() => setSelId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1">
              <p className="text-xs text-muted-foreground">{selDef.desc}</p>

              {/* Trigger configs */}
              {selNode.kind === "trigger_form_submit" && (
                <Field label="Watch form">
                  <select className={INPUT}><option>Any form</option><option>Client Intake Form</option><option>Project Brief</option></select>
                </Field>
              )}
              {selNode.kind === "trigger_schedule" && (
                <Field label="Schedule">
                  <select className={INPUT}><option>Every Monday 9am</option><option>Daily at 9am</option><option>Every hour</option><option>Custom (cron)</option></select>
                </Field>
              )}
              {selNode.kind === "trigger_status_change" && (
                <Field label="New status">
                  <select className={INPUT}><option>Any change</option><option>→ New</option><option>→ In Progress</option><option>→ Completed</option></select>
                </Field>
              )}

              {/* Action configs */}
              {selNode.kind === "action_send_email" && (<>
                <Field label="To"><input type="text" placeholder="{{client.email}}" className={INPUT} /></Field>
                <Field label="Subject"><input type="text" placeholder="Welcome to Formline" className={INPUT} /></Field>
                <Field label="Body">
                  <textarea rows={4} placeholder="Hi {{client.name}}, thanks for submitting..." className={`${INPUT} resize-none`} />
                </Field>
              </>)}
              {selNode.kind === "action_webhook" && (<>
                <Field label="URL"><input type="url" placeholder="https://hooks.example.com/..." className={INPUT} /></Field>
                <Field label="Method">
                  <select className={INPUT}><option>POST</option><option>GET</option><option>PUT</option><option>PATCH</option></select>
                </Field>
                <Field label="Auth token (optional)"><input type="text" placeholder="Bearer …" className={INPUT} /></Field>
              </>)}
              {selNode.kind === "action_update_status" && (
                <Field label="Set status to">
                  <select className={INPUT}><option>New</option><option>In Progress</option><option>Completed</option></select>
                </Field>
              )}
              {(selNode.kind === "action_create_client" || selNode.kind === "action_notify" || selNode.kind === "trigger_new_client") && (
                <div className="rounded-xl bg-surface-muted/50 p-3 text-xs text-muted-foreground ring-1 ring-hairline">
                  ✦ This node runs automatically using data from upstream. No additional configuration needed.
                </div>
              )}

              {/* Condition config */}
              {selNode.kind === "condition_if" && (<>
                <Field label="Field">
                  <select className={INPUT}><option>client.status</option><option>client.industry</option><option>submission.email</option></select>
                </Field>
                <Field label="Operator">
                  <select className={INPUT}><option>equals</option><option>contains</option><option>is not empty</option><option>is empty</option></select>
                </Field>
                <Field label="Value"><input type="text" placeholder="Completed" className={INPUT} /></Field>
              </>)}
            </div>

            <div className="p-4 border-t border-hairline">
              <button onClick={() => delNode(selNode.id)}
                className="flex w-full items-center justify-center gap-2 h-9 rounded-xl text-sm text-red-400 hover:bg-red-400/10 ring-1 ring-red-400/20 transition-colors">
                <Trash2 className="size-3.5" /> Delete node
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── Small field helper ─────────────────────────── */

const INPUT = "mt-1.5 w-full h-9 rounded-lg bg-surface-muted px-3 text-sm ring-1 ring-hairline outline-none focus:ring-[#7C5CFF]/60 focus:ring-2 transition-shadow";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────────────────── Main page ─────────────────────────────── */

function AutomationsPage() {
  const [autos,     setAutos]     = useState<Automation[]>(INITIAL);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editName,  setEditName]  = useState("");

  const editing = autos.find(a => a.id === editId) ?? null;

  function newAuto() {
    const id = `a-${Date.now()}`;
    const a: Automation = { id, name: "Untitled Automation", description: "New workflow", enabled: false, nodes: [], connections: [], runs: 0, lastRun: null };
    setAutos(prev => [a, ...prev]);
    setEditId(id); setEditName(a.name);
  }

  function toggle(id: string) {
    setAutos(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    toast.success("Automation updated");
  }

  function del(id: string) {
    setAutos(prev => prev.filter(a => a.id !== id));
    if (editId === id) setEditId(null);
    toast.success("Automation deleted");
  }

  function saveChange(updated: Automation) {
    setAutos(prev => prev.map(a => a.id === updated.id ? updated : a));
  }

  function closeEditor() {
    if (editId && editName.trim()) setAutos(prev => prev.map(a => a.id === editId ? { ...a, name: editName } : a));
    setEditId(null);
    toast.success("Automation saved");
  }

  /* ── Editor ── */
  if (editId && editing) return (
    <div className="flex flex-col h-screen bg-[#08080F]">
      {/* Editor header */}
      <header className="flex items-center justify-between px-5 h-14 border-b border-hairline bg-[#0D0D14]/80 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={closeEditor} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="h-5 w-px bg-hairline" />
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="bg-transparent text-sm font-semibold text-foreground outline-none border-b border-transparent hover:border-hairline focus:border-[#7C5CFF] transition-colors pb-0.5 w-60"
          />
          <span className="text-xs text-muted-foreground hidden md:block">— drag nodes · click port to connect · click line to delete</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{editing.enabled ? "Active" : "Paused"}</span>
          <button onClick={() => toggle(editId)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${editing.enabled ? "bg-[#7C5CFF]" : "bg-surface-muted ring-1 ring-hairline"}`}>
            <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform mt-0.5 ${editing.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
          <button onClick={closeEditor}
            className="h-8 px-4 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
            Save & Close
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Canvas auto={editing} onChange={saveChange} />
      </div>
    </div>
  );

  /* ── List ── */
  const totalRuns = autos.reduce((s, a) => s + a.runs, 0);
  const active    = autos.filter(a => a.enabled).length;

  return (
    <div className="relative min-h-screen bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[480px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.15),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-6xl px-6 py-12 lg:px-8 space-y-12">

        {/* Header */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">Workspace automation</span>
            <h1 className="mt-3 font-serif text-5xl leading-[1.05] md:text-6xl">
              Automations <span className="italic text-muted-foreground">workspace</span>
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-muted-foreground text-sm leading-relaxed">
              Connect your forms, custom webhooks, notifications, and client database to automate your workflow pipeline.
            </p>
          </div>
          <button onClick={newAuto}
            className="inline-flex h-10.5 items-center gap-2 rounded-xl bg-foreground px-5 text-xs font-semibold text-background hover:opacity-90 transition-opacity self-start md:self-auto shadow-md">
            <Plus className="size-4" /> Create Automation
          </button>
        </motion.section>

        {/* Stats */}
        <section className="grid gap-6 sm:grid-cols-3">
          {[
            { label: "Total automations", value: autos.length, color: "from-[#7C5CFF]/15 to-[#A28CFF]/2", icon: Zap, iconColor: "text-[#7C5CFF]" },
            { label: "Active workflows",   value: active, color: "from-emerald-500/15 to-[#4ade80]/2", icon: Check, iconColor: "text-emerald-400" },
            { label: "Total runs triggered", value: totalRuns, color: "from-[#0ea5e9]/15 to-[#38bdf8]/2", icon: BarChart3, iconColor: "text-sky-400" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06 }}
                className="relative overflow-hidden rounded-2xl bg-surface p-6 ring-1 ring-hairline shadow-md hover:shadow-lg transition-shadow"
              >
                {/* Decorative glow */}
                <div className={`absolute -right-4 -bottom-4 size-20 rounded-full bg-gradient-to-tr ${s.color} blur-2xl opacity-50`} />
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{s.label}</div>
                  <div className="grid size-8 place-items-center rounded-xl bg-surface-muted ring-1 ring-hairline text-muted-foreground">
                    <Icon className={`size-4 ${s.iconColor}`} />
                  </div>
                </div>
                <div className="mt-4 font-serif text-5xl leading-none text-foreground">{s.value}</div>
              </motion.div>
            );
          })}
        </section>

        {/* Cards Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Active Flows</h2>
            <span className="text-xs text-muted-foreground">{autos.length} items</span>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {autos.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative flex flex-col justify-between rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden shadow-sm hover:shadow-xl hover:ring-[#7C5CFF]/30 transition-all duration-300"
              >
                {/* Visual Header */}
                <div className="p-6 pb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-300 ${a.enabled ? "bg-[#7C5CFF]/15 text-[#7C5CFF] shadow-[0_0_12px_rgba(124,92,255,0.2)]" : "bg-surface-muted text-muted-foreground"}`}>
                      <Zap className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-base truncate group-hover:text-[#A28CFF] transition-colors">{a.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{a.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-[#08080F]/40 px-2.5 py-1 rounded-full border border-hairline/40">
                    <span className={`inline-block size-2 rounded-full ${a.enabled ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-muted-foreground/35"}`} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{a.enabled ? "Active" : "Paused"}</span>
                  </div>
                </div>

                {/* Flow preview block */}
                <div className="px-6 pb-4">
                  <div className="rounded-xl border border-hairline bg-[#08080F]/60 backdrop-blur-sm overflow-hidden p-1 shadow-inner group-hover:border-[#7C5CFF]/25 transition-colors">
                    <MiniPreview nodes={a.nodes} connections={a.connections} enabled={a.enabled} />
                  </div>
                </div>

                {/* Actions and Metrics Footer */}
                <div className="mt-auto border-t border-hairline bg-surface-muted/30 px-6 py-4 flex items-center justify-between gap-4">
                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground">{a.nodes.length}</span> nodes
                    </div>
                    <div className="size-1 rounded-full bg-hairline" />
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground">{a.runs}</span> runs
                    </div>
                    <div className="size-1 rounded-full bg-hairline" />
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground">{formatAge(a.lastRun)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Tiny Switch */}
                    <button
                      onClick={() => toggle(a.id)}
                      className={`relative inline-flex h-5 w-8.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${a.enabled ? "bg-[#7C5CFF]" : "bg-white/10"}`}
                      aria-label="Toggle automation state"
                    >
                      <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-[0.5px] ${a.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </button>
                    <button
                      onClick={() => { setEditId(a.id); setEditName(a.name); }}
                      className="h-8 px-3 rounded-lg bg-surface-muted text-xs font-semibold text-foreground hover:text-white hover:bg-[#7C5CFF]/20 ring-1 ring-hairline hover:ring-[#7C5CFF]/30 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(a.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="Delete automation"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Templates Gallery Section */}
        <section className="border-t border-hairline pt-12 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Workflow Blueprints</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Start instantly with pre-configured templates for common Saas workflows</p>
            </div>
            <div className="rounded-full bg-[#7C5CFF]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#7C5CFF] ring-1 ring-[#7C5CFF]/20 self-start sm:self-auto">
              ✦ Pre-built Presets
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Welcome Client intake",
                desc: "Send custom welcome email as soon as a client intake form is submitted.",
                nodes: [
                  { id: "n1", kind: "trigger_form_submit", x: 80, y: 120 },
                  { id: "n2", kind: "action_send_email", x: 380, y: 120 }
                ],
                connections: [{ id: "c1", from: "n1", to: "n2" }],
                tag: "Intake",
                tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                glow: "from-emerald-500/10 to-transparent hover:border-emerald-500/30"
              },
              {
                title: "Slack / Teams Notification",
                desc: "Notify internal channel when a client update or status transition occurs.",
                nodes: [
                  { id: "n1", kind: "trigger_status_change", x: 80, y: 120 },
                  { id: "n2", kind: "action_notify", x: 380, y: 120 }
                ],
                connections: [{ id: "c1", from: "n1", to: "n2" }],
                tag: "Alerts",
                tagColor: "bg-[#7C5CFF]/10 text-[#A28CFF] border-[#7C5CFF]/20",
                glow: "from-[#7C5CFF]/10 to-transparent hover:border-[#7C5CFF]/30"
              },
              {
                title: "Webhook Sync CRM",
                desc: "Send full JSON payload to your custom CRM webhooks or API database.",
                nodes: [
                  { id: "n1", kind: "trigger_new_client", x: 80, y: 120 },
                  { id: "n2", kind: "action_webhook", x: 380, y: 120 }
                ],
                connections: [{ id: "c1", from: "n1", to: "n2" }],
                tag: "Integrations",
                tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                glow: "from-amber-500/10 to-transparent hover:border-amber-500/30"
              }
            ].map((tmpl, index) => (
              <motion.div
                key={tmpl.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className={`relative rounded-2xl border border-hairline bg-surface p-5 flex flex-col justify-between hover:bg-gradient-to-br ${tmpl.glow} hover:shadow-md transition-all duration-300 group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tmpl.tagColor}`}>
                      {tmpl.tag}
                    </span>
                    <Sparkles className="size-3.5 text-muted-foreground opacity-60 group-hover:text-[#7C5CFF] group-hover:scale-110 transition-all duration-300" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-[#A28CFF] transition-colors">{tmpl.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{tmpl.desc}</p>
                </div>
                <button
                  onClick={() => {
                    const id = `a-tmpl-${Date.now()}-${index}`;
                    const customAuto: Automation = {
                      id,
                      name: tmpl.title,
                      description: tmpl.desc,
                      enabled: false,
                      nodes: tmpl.nodes,
                      connections: tmpl.connections,
                      runs: 0,
                      lastRun: null
                    };
                    setAutos(prev => [customAuto, ...prev]);
                    toast.success(`Created workflow from template: ${tmpl.title}`);
                  }}
                  className="mt-6 w-full flex items-center justify-center gap-1.5 h-8.5 rounded-xl bg-surface-muted hover:bg-[#7C5CFF]/10 hover:text-white hover:border-[#7C5CFF]/20 text-xs font-semibold text-foreground transition-all border border-hairline"
                >
                  <Plus className="size-3.5" /> Use Blueprint
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
