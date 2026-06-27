import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useClients } from "@/lib/clients-store";
import {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  type InvoiceRecord,
  type InvoiceLineItem,
} from "@/lib/invoices.functions";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  CheckCircle,
  CreditCard,
  Loader2,
  Mail,
  Calendar,
} from "@/components/heroicons";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings } from "@/lib/settings.functions";
import { getCurrencySymbol, formatCurrency } from "@/lib/localization";
import { InvoiceLineItemsEditor, invoiceInputClass } from "@/components/invoice-line-items-editor";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Formline" },
      {
        name: "description",
        content: "Manage billing, track paid revenue, and follow up on outstanding invoices.",
      },
    ],
  }),
  component: InvoicesPage,
});

const EMPTY_LINE_ITEM = (): InvoiceLineItem => ({ description: "", qty: 1, unitPrice: 0 });

function InvoicesPage() {
  const queryClient = useQueryClient();
  const { clients } = useClients();

  const fetchSettings = useServerFn(getSettings);
  const { data: settings } = useQuery({
    queryKey: ["owner-settings"],
    queryFn: () => fetchSettings(),
  });
  const currencySymbol = getCurrencySymbol(settings?.currencyCode);

  const getInvoices = useServerFn(listInvoices);
  const createInv = useServerFn(createInvoice);
  const updateInv = useServerFn(updateInvoice);
  const deleteInv = useServerFn(deleteInvoice);
  const sendInv = useServerFn(sendInvoice);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getInvoices(),
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);

  // Form states
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Invoice");
  const [status, setStatus] = useState<"Unpaid" | "Paid" | "Overdue">("Unpaid");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([EMPTY_LINE_ITEM()]);
  const [deliveryMethod, setDeliveryMethod] = useState<"immediate" | "scheduled" | "none">(
    "immediate",
  );
  const [sendAt, setSendAt] = useState("");

  const lineTotal = useMemo(
    () => lineItems.reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0),
    [lineItems],
  );

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createInv>[0]["data"]) => createInv({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(
        deliveryMethod === "scheduled"
          ? "Invoice scheduled and will be sent at the chosen time"
          : deliveryMethod === "immediate"
            ? status === "Paid"
              ? "Invoice created & receipt emailed"
              : "Invoice created & sent to client"
            : "Invoice created successfully",
      );
      closeModal();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create invoice"),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof updateInv>[0]["data"]["patch"] }) =>
      updateInv({ data: { id: args.id, patch: args.patch } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Invoice updated");
      closeModal();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update invoice"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInv({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete invoice"),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendInv({ data: { id } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice sent to ${res.sentTo}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send invoice"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => updateInv({ data: { id, patch: { status: "Paid" } } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice marked as Paid");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  const openCreateModal = () => {
    setEditingInvoice(null);
    setClientId(clients[0]?.id || "");
    setTitle("Invoice");
    setStatus("Unpaid");
    setDueDate("");
    setNotes("");
    setLineItems([EMPTY_LINE_ITEM()]);
    setDeliveryMethod("immediate");
    setSendAt("");
    setIsModalOpen(true);
  };

  const openEditModal = (inv: InvoiceRecord) => {
    setEditingInvoice(inv);
    setClientId(inv.clientId);
    setTitle(inv.title);
    setStatus(inv.status);
    setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setNotes(inv.notes ?? "");
    setLineItems(inv.lineItems.length > 0 ? inv.lineItems : [EMPTY_LINE_ITEM()]);
    if (inv.sentAt) {
      setDeliveryMethod("immediate");
    } else if (inv.sendAt) {
      setDeliveryMethod("scheduled");
      setSendAt(inv.sendAt.split("T")[0]);
    } else {
      setDeliveryMethod("none");
      setSendAt("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.some((li) => !li.description.trim())) {
      toast.error("All line items need a description");
      return;
    }
    if (lineTotal <= 0) {
      toast.error(`Invoice total must be greater than ${currencySymbol}0.00`);
      return;
    }
    if (deliveryMethod === "scheduled" && !sendAt) {
      toast.error("Please specify a date for scheduled delivery");
      return;
    }

    const payload = {
      clientId,
      title,
      amount: lineTotal,
      status,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      lineItems,
      sendAt: deliveryMethod === "scheduled" && sendAt ? sendAt : undefined,
      deliveryMethod,
    };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, patch: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const stats = useMemo(() => {
    let paid = 0,
      unpaid = 0,
      overdue = 0;
    invoices.forEach((i) => {
      if (i.status === "Paid") paid += i.amount;
      else if (i.status === "Unpaid") unpaid += i.amount;
      else if (i.status === "Overdue") overdue += i.amount;
    });
    return { paid, unpaid, overdue, total: paid + unpaid + overdue };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (filterStatus === "all") return invoices;
    return invoices.filter((i) => i.status.toLowerCase() === filterStatus.toLowerCase());
  }, [invoices, filterStatus]);

  const addLineItem = () => setLineItems((prev) => [...prev, EMPTY_LINE_ITEM()]);
  const removeLineItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: keyof InvoiceLineItem, val: string | number) =>
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: val } : li)));

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[520px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.2),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* Header */}
        <section className="mb-8 sm:mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
              Billing &amp; Invoices
            </span>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
              Financial <span className="italic text-muted-foreground">overview</span>
            </h1>
            <p className="max-w-[58ch] text-muted-foreground text-sm">
              Create invoices with line items, send them directly to clients, and track your
              revenue.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.1)] self-start sm:self-auto"
          >
            <Plus className="size-4" /> Create Invoice
          </button>
        </section>

        {/* Stats Strip */}
        <section className="mb-8 sm:mb-10 grid grid-cols-2 divide-hairline rounded-2xl bg-surface ring-1 ring-hairline md:grid-cols-4 divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-hairline md:[&>*:nth-child(n+3)]:border-t-0">
          {[
            {
              label: "Total Billed",
              value: `${currencySymbol}${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
            {
              label: "Paid Revenue",
              value: `${currencySymbol}${stats.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              color: "text-emerald-500",
            },
            {
              label: "Unpaid (Outstanding)",
              value: `${currencySymbol}${stats.unpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              color: "text-amber-500",
            },
            {
              label: "Overdue",
              value: `${currencySymbol}${stats.overdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              color: "text-destructive",
            },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </div>
              <div className={`mt-2 font-serif text-2xl sm:text-3xl leading-none ${s.color || ""}`}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {["all", "Paid", "Unpaid", "Overdue"].map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFilterStatus(statusOption)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ring-1 transition-all capitalize ${
                (
                  statusOption === "all"
                    ? filterStatus === "all"
                    : filterStatus.toLowerCase() === statusOption.toLowerCase()
                )
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-surface text-foreground ring-hairline hover:bg-surface-muted"
              }`}
            >
              {statusOption}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        <div className="rounded-3xl bg-surface border border-hairline overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-[#7C5CFF]" />
              <span>Loading invoices...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground space-y-2">
              <CreditCard className="size-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">No invoices found</p>
              <p className="text-xs">Create an invoice to get started billing your clients.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-muted/50 border-b border-hairline text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Sent</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div>{inv.title}</div>
                        {inv.lineItems.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {inv.lineItems.length} line item{inv.lineItems.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div>{inv.clientCompany || "—"}</div>
                        {inv.clientEmail && (
                          <div className="text-[10px] mt-0.5 text-muted-foreground/70">
                            {inv.clientEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {currencySymbol}
                        {inv.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                            inv.status === "Paid"
                              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
                              : inv.status === "Unpaid"
                                ? "bg-amber-500/15 text-amber-300 ring-amber-400/20"
                                : "bg-red-500/15 text-red-300 ring-red-400/20"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {inv.sentAt ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="size-3" />
                            {new Date(inv.sentAt).toLocaleDateString()}
                          </span>
                        ) : inv.sendAt ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Calendar className="size-3" />
                            Scheduled {new Date(inv.sendAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">Not sent</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Send now */}
                          {!inv.sentAt && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Send this invoice to ${inv.clientEmail || "the client"}?`,
                                  )
                                ) {
                                  sendMutation.mutate(inv.id);
                                }
                              }}
                              disabled={sendMutation.isPending}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Send invoice by email"
                            >
                              <Mail className="size-4" />
                            </button>
                          )}
                          {/* Mark paid */}
                          {inv.status !== "Paid" && (
                            <button
                              onClick={() => markPaidMutation.mutate(inv.id)}
                              disabled={markPaidMutation.isPending}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="size-4" />
                            </button>
                          )}
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm("Delete this invoice?")) deleteMutation.mutate(inv.id);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative flex h-full w-full flex-col bg-surface md:h-auto md:max-h-[min(92vh,820px)] md:max-w-4xl md:rounded-2xl md:ring-1 md:ring-white/10 md:shadow-[0_24px_60px_rgba(0,0,0,0.45)] overflow-hidden"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 px-4 py-3.5 bg-surface/95 backdrop-blur-md md:px-6 md:py-4">
                <div>
                  <h3 className="font-serif text-xl md:text-2xl text-foreground">
                    {editingInvoice ? "Edit invoice" : "New invoice"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    Fill in the details below — we&apos;ll handle delivery.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="flex size-9 items-center justify-center rounded-xl ring-1 ring-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6 md:py-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Left Column: Form Details & Items (3/5) */}
                    <div className="md:col-span-3 space-y-5">
                      {/* Client */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground/80">
                          Client
                        </label>
                        <Select
                          value={clientId}
                          onValueChange={(val) => setClientId(val)}
                          disabled={!!editingInvoice}
                        >
                          <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-background px-3 text-left text-sm shadow-none ring-1 ring-hairline transition-all hover:bg-surface-muted hover:ring-foreground/20 focus:ring-2 focus:ring-foreground/20 cursor-pointer">
                            <SelectValue placeholder="Select a client..." />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            sideOffset={6}
                            className="z-50 min-w-[240px] rounded-xl border-0 p-1.5 bg-popover shadow-2xl ring-1 ring-hairline max-h-60 overflow-y-auto"
                          >
                            {clients.map((c) => (
                              <SelectItem
                                key={c.id}
                                value={c.id}
                                className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                              >
                                {c.company} ({c.fullName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground/80">
                          Invoice title
                        </label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Design Retainer — June 2026"
                          className={invoiceInputClass}
                          required
                        />
                      </div>

                      {/* Status + due — mobile only, shown early */}
                      <div className="grid grid-cols-2 gap-3 md:hidden">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground/80">
                            Status
                          </label>
                          <Select
                            value={status}
                            onValueChange={(val: "Unpaid" | "Paid" | "Overdue") => {
                              setStatus(val);
                              if (val === "Paid" && deliveryMethod === "scheduled") {
                                setDeliveryMethod("immediate");
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 w-full rounded-xl border-0 bg-white/[0.04] px-3 text-left text-sm shadow-none ring-1 ring-white/10 transition-all hover:ring-white/20 focus:ring-2 focus:ring-[#7C5CFF]/40 cursor-pointer">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              sideOffset={6}
                              className="z-50 min-w-[150px] rounded-xl border-0 p-1.5 bg-popover shadow-2xl ring-1 ring-hairline"
                            >
                              <SelectItem
                                value="Unpaid"
                                className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                              >
                                Unpaid
                              </SelectItem>
                              <SelectItem
                                value="Paid"
                                className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                              >
                                Paid
                              </SelectItem>
                              <SelectItem
                                value="Overdue"
                                className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                              >
                                Overdue
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground/80">
                            Due date
                          </label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className={invoiceInputClass}
                          />
                        </div>
                      </div>

                      <InvoiceLineItemsEditor
                        lineItems={lineItems}
                        currencySymbol={currencySymbol}
                        lineTotal={lineTotal}
                        onAdd={addLineItem}
                        onUpdate={updateLineItem}
                        onRemove={removeLineItem}
                      />

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground/80">
                          Notes{" "}
                          <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Payment terms, bank details, special instructions..."
                          rows={3}
                          className={`${invoiceInputClass} min-h-[88px] py-2.5 resize-none`}
                        />
                      </div>
                    </div>

                    {/* Right Column: Status & Delivery Options (2/5) */}
                    <div className="md:col-span-2 md:border-l md:border-white/10 md:pl-6 space-y-5">
                      {/* Status — desktop */}
                      <div className="hidden md:block space-y-1.5">
                        <label className="block text-sm font-medium text-foreground/80">
                          Status
                        </label>
                        <Select
                          value={status}
                          onValueChange={(val: any) => {
                            setStatus(val);
                            if (val === "Paid" && deliveryMethod === "scheduled") {
                              setDeliveryMethod("immediate");
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-background px-3 text-left text-sm shadow-none ring-1 ring-hairline transition-all hover:bg-surface-muted hover:ring-foreground/20 focus:ring-2 focus:ring-foreground/20 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            sideOffset={6}
                            className="z-50 min-w-[150px] rounded-xl border-0 p-1.5 bg-popover shadow-2xl ring-1 ring-hairline"
                          >
                            <SelectItem
                              value="Unpaid"
                              className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                            >
                              Unpaid
                            </SelectItem>
                            <SelectItem
                              value="Paid"
                              className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                            >
                              Paid
                            </SelectItem>
                            <SelectItem
                              value="Overdue"
                              className="cursor-pointer rounded-lg py-2 pl-2.5 pr-8 focus:bg-secondary text-sm text-foreground"
                            >
                              Overdue
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due Date — desktop */}
                      <div className="hidden md:block space-y-1.5">
                        <label className="block text-sm font-medium text-foreground/80">
                          Due date
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className={invoiceInputClass}
                        />
                      </div>

                      {/* Email Delivery Options */}
                      {editingInvoice && editingInvoice.sentAt ? (
                        <div className="rounded-2xl bg-white/[0.03] p-4 space-y-2 ring-1 ring-white/10">
                          <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                            <Mail className="size-4 text-[#7C5CFF]" /> Email delivery
                          </div>
                          <div className="text-xs text-foreground flex items-center gap-1.5 font-medium">
                            <CheckCircle className="size-4 text-emerald-500" />
                            <span>
                              Sent to {editingInvoice.clientEmail || "client"} on{" "}
                              {new Date(editingInvoice.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-white/[0.03] p-4 space-y-4 ring-1 ring-white/10">
                          <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                            <Mail className="size-4 text-[#7C5CFF]" /> Email delivery
                          </div>

                          {status === "Paid" ? (
                            <div className="space-y-3">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDeliveryMethod("immediate")}
                                  className={`w-full h-10 px-3 rounded-lg text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${deliveryMethod === "immediate" ? "bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]" : "border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
                                >
                                  <span>Email receipt immediately</span>
                                  {deliveryMethod === "immediate" && (
                                    <CheckCircle className="size-4 text-[#7C5CFF]" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeliveryMethod("none")}
                                  className={`w-full h-10 px-3 rounded-lg text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${deliveryMethod === "none" ? "bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]" : "border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
                                >
                                  <span>Do not email receipt</span>
                                  {deliveryMethod === "none" && (
                                    <CheckCircle className="size-4 text-[#7C5CFF]" />
                                  )}
                                </button>
                              </div>
                              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                                {deliveryMethod === "immediate"
                                  ? "A payment receipt email will be sent immediately upon saving."
                                  : "No receipt email will be sent. The invoice is recorded silently."}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDeliveryMethod("immediate")}
                                  className={`w-full h-10 px-3 rounded-lg text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${deliveryMethod === "immediate" ? "bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]" : "border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
                                >
                                  <span>Email invoice immediately</span>
                                  {deliveryMethod === "immediate" && (
                                    <CheckCircle className="size-4 text-[#7C5CFF]" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeliveryMethod("scheduled")}
                                  className={`w-full h-10 px-3 rounded-lg text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${deliveryMethod === "scheduled" ? "bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]" : "border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
                                >
                                  <span>Schedule email delivery</span>
                                  {deliveryMethod === "scheduled" && (
                                    <CheckCircle className="size-4 text-[#7C5CFF]" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeliveryMethod("none")}
                                  className={`w-full h-10 px-3 rounded-lg text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${deliveryMethod === "none" ? "bg-[#7C5CFF]/10 text-[#7C5CFF] border-[#7C5CFF]" : "border-hairline text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
                                >
                                  <span>Do not send email</span>
                                  {deliveryMethod === "none" && (
                                    <CheckCircle className="size-4 text-[#7C5CFF]" />
                                  )}
                                </button>
                              </div>

                              {deliveryMethod === "scheduled" && (
                                <div className="space-y-1.5 pt-1">
                                  <label className="block text-xs text-muted-foreground">
                                    Send on date
                                  </label>
                                  <input
                                    type="date"
                                    value={sendAt}
                                    onChange={(e) => setSendAt(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="h-10 w-full rounded-lg border border-hairline bg-background px-3 text-sm text-foreground focus:border-[#7C5CFF] focus:outline-none animate-in fade-in slide-in-from-top-1 duration-200"
                                    required
                                  />
                                </div>
                              )}

                              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                                {deliveryMethod === "immediate"
                                  ? "The invoice will be emailed to the client immediately after saving."
                                  : deliveryMethod === "scheduled"
                                    ? "The invoice will be automatically emailed to the client on the scheduled date."
                                    : "The invoice will be created/updated without sending any email."}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 z-10 border-t border-white/10 bg-surface/95 backdrop-blur-md px-4 py-3.5 md:px-6 flex items-center justify-between gap-3">
                  <div className="md:hidden">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="font-serif text-lg font-semibold tabular-nums text-[#7C5CFF]">
                      {currencySymbol}
                      {lineTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="h-10 px-4 rounded-xl ring-1 ring-white/10 hover:bg-white/5 text-sm font-medium transition-colors text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="h-10 px-5 rounded-xl bg-[#7C5CFF] text-white hover:bg-[#7C5CFF]/90 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#7C5CFF]/20"
                    >
                      {isSaving && <Loader2 className="size-4 animate-spin" />}
                      {editingInvoice
                        ? "Save"
                        : deliveryMethod === "scheduled"
                          ? "Schedule"
                          : deliveryMethod === "none"
                            ? "Create"
                            : "Create & send"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
