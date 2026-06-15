import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function ToastSuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25"
        stroke="#22C55E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 7.125v3.375M9 13.125h.008M16.5 9a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastInfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 8.25v3.75M9 5.625h.008M16.5 9a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="#3B82F6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastWarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 7.875v3M9 13.125h.008M8.17 3.102 1.66 14.25A1.125 1.125 0 0 0 2.64 16.125h12.72a1.125 1.125 0 0 0 .98-1.875L9.83 3.102a1.125 1.125 0 0 0-1.96 0Z"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastLoadingIcon() {
  return (
    <svg
      className="size-[18px] animate-spin text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

function ToastCloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect
        y="12.532"
        width="17.498"
        height="2.1"
        rx="1.05"
        transform="rotate(-45.74 0 12.532)"
        fill="currentColor"
        fillOpacity="0.7"
      />
      <rect
        x="12.531"
        y="13.914"
        width="17.498"
        height="2.1"
        rx="1.05"
        transform="rotate(-135.74 12.531 13.914)"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors={false}
      closeButton
      gap={12}
      className="toaster group"
      icons={{
        success: <ToastSuccessIcon />,
        error: <ToastErrorIcon />,
        info: <ToastInfoIcon />,
        warning: <ToastWarningIcon />,
        loading: <ToastLoadingIcon />,
        close: <ToastCloseIcon />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group toast flex w-full min-w-[280px] max-w-[360px] items-start gap-3 rounded border border-gray-200 bg-white p-3 text-sm shadow-sm",
          content: "order-2 min-w-0 flex-1",
          title: "text-sm font-medium text-slate-700",
          description: "mt-0.5 text-sm text-slate-500",
          icon: "order-1 shrink-0",
          closeButton:
            "order-3 mb-auto ml-auto shrink-0 cursor-pointer border-0 bg-transparent p-0 text-slate-400 transition hover:text-slate-600 active:scale-95",
          loader: "order-1 shrink-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
