import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
  /** Use "dark" on light backgrounds so the wordmark stays visible. */
  variant?: "light" | "dark";
};

export function Logo({ className, iconOnly = false, variant = "light" }: LogoProps) {
  const src = iconOnly
    ? "/favicon.png"
    : variant === "dark"
      ? "/logo-dark.svg"
      : "/logo.svg";

  return (
    <img
      src={src}
      alt="Formline"
      className={cn(iconOnly ? "size-8" : "h-7 w-auto", className)}
    />
  );
}
