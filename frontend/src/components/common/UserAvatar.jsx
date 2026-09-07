import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({ name, src, className }) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
