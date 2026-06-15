import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
  /** Reserved for a light-background wordmark; uses main logo until a separate asset exists. */
  variant?: "light" | "dark";
};

export function Logo({ className, iconOnly = false }: LogoProps) {
  const src = iconOnly ? "/favicon.png" : "/logo.png";

  return (
    <img
      src={src}
      alt="Formline"
      className={cn(iconOnly ? "size-8" : "h-7 w-auto", className)}
    />
  );
}
