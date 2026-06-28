import { toast } from "sonner";
import type { InvoiceEmailDelivery } from "@/lib/invoices.functions";

export function toastInvoiceCreateResult(opts: {
  deliveryMethod: "immediate" | "scheduled" | "none";
  status: "Unpaid" | "Paid" | "Overdue";
  emailDelivery?: InvoiceEmailDelivery;
}) {
  const { deliveryMethod, status, emailDelivery } = opts;

  if (deliveryMethod === "scheduled") {
    toast.success("Invoice scheduled — it will be sent at the chosen time");
    return;
  }

  if (deliveryMethod === "none") {
    toast.success("Invoice created successfully");
    return;
  }

  if (emailDelivery?.sent) {
    toast.success(
      status === "Paid"
        ? "Invoice created & receipt emailed to client"
        : "Invoice created & emailed to client",
    );
    return;
  }

  const description =
    emailDelivery?.error ??
    "Email could not be delivered. Check your Resend API key and from-address in .env";

  toast.warning("Invoice saved — email was not delivered", {
    description,
    duration: 10000,
  });

  if (emailDelivery?.previewUrl) {
    toast.info("A preview was saved to your Email outbox", {
      action: {
        label: "View",
        onClick: () => window.open(emailDelivery.previewUrl, "_blank"),
      },
    });
  }
}
