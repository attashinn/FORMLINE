import { Plus, X } from "@/components/heroicons";
import type { InvoiceLineItem } from "@/lib/invoices.functions";

const inputClass =
  "h-10 w-full rounded-xl bg-white/[0.04] px-3.5 text-sm text-foreground ring-1 ring-white/10 placeholder:text-white/30 focus:ring-2 focus:ring-[#7C5CFF]/40 focus:outline-none transition-shadow";

type InvoiceLineItemsEditorProps = {
  lineItems: InvoiceLineItem[];
  currencySymbol: string;
  lineTotal: number;
  onAdd: () => void;
  onUpdate: (idx: number, field: keyof InvoiceLineItem, value: string | number) => void;
  onRemove: (idx: number) => void;
};

export function InvoiceLineItemsEditor({
  lineItems,
  currencySymbol,
  lineTotal,
  onAdd,
  onUpdate,
  onRemove,
}: InvoiceLineItemsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Line items</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Add what you&apos;re billing for</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#7C5CFF] hover:bg-[#7C5CFF]/10 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>

      {/* Desktop table header */}
      <div className="hidden md:grid md:grid-cols-[1fr_72px_120px_88px_32px] gap-3 px-1 text-[11px] font-medium text-muted-foreground">
        <span>Item</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-white/10 divide-y divide-white/8">
        {lineItems.map((li, idx) => {
          const rowTotal = (Number(li.qty) || 0) * (Number(li.unitPrice) || 0);
          return (
            <div
              key={idx}
              className="bg-white/[0.02] p-4 md:grid md:grid-cols-[1fr_72px_120px_88px_32px] md:gap-3 md:items-center md:p-3"
            >
              {/* Description */}
              <div className="min-w-0">
                <input
                  value={li.description}
                  onChange={(e) => onUpdate(idx, "description", e.target.value)}
                  placeholder="What did you deliver?"
                  className={`${inputClass} md:h-9`}
                  required
                />
              </div>

              {/* Mobile: qty × rate = amount */}
              <div className="mt-3 flex items-center gap-2 md:mt-0 md:contents">
                <div className="w-[72px] shrink-0 md:w-auto">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={li.qty}
                    onChange={(e) => onUpdate(idx, "qty", parseFloat(e.target.value) || 0)}
                    aria-label="Quantity"
                    className="h-9 w-full rounded-lg bg-white/[0.04] px-2 text-sm text-center text-foreground ring-1 ring-white/10 focus:ring-2 focus:ring-[#7C5CFF]/40 focus:outline-none"
                  />
                </div>

                <span className="text-muted-foreground/60 text-sm md:hidden">×</span>

                <div className="relative min-w-0 flex-1 md:flex-none">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.unitPrice}
                    onChange={(e) => onUpdate(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    aria-label="Unit price"
                    className="h-9 w-full rounded-lg bg-white/[0.04] pl-7 pr-3 text-sm text-foreground ring-1 ring-white/10 focus:ring-2 focus:ring-[#7C5CFF]/40 focus:outline-none md:text-right"
                  />
                </div>

                <span className="ml-auto shrink-0 text-sm font-medium tabular-nums text-foreground md:ml-0 md:text-right md:pr-1">
                  {currencySymbol}
                  {rowTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>

                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  disabled={lineItems.length === 1}
                  className="hidden md:flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 cursor-pointer"
                  aria-label="Remove line item"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Mobile remove */}
              <div className="mt-2 flex justify-end md:hidden">
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  disabled={lineItems.length === 1}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 cursor-pointer"
                >
                  Remove item
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#7C5CFF]/8 px-4 py-3 ring-1 ring-[#7C5CFF]/15">
        <span className="text-sm text-foreground/70">Invoice total</span>
        <span className="font-serif text-2xl font-semibold tabular-nums text-[#7C5CFF]">
          {currencySymbol}
          {lineTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

export { inputClass as invoiceInputClass };
