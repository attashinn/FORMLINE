import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string;
  email?: string;
  imageUrl?: string | null;
  className?: string;
  textClassName?: string;
};

function initialsFrom(name?: string, email?: string) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export function UserAvatar({
  name,
  email,
  imageUrl,
  className,
  textClassName,
}: UserAvatarProps) {
  const initials = initialsFrom(name, email);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `${name} profile photo` : "Profile photo"}
        className={cn("shrink-0 rounded-xl object-cover ring-1 ring-white/10", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#A28CFF] font-semibold text-white",
        className,
        textClassName,
      )}
    >
      {initials}
    </div>
  );
}
