import { Badge } from "@/components/ui/badge";
import { ROLE_META } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RoleBadge({ role, className }) {
  const meta = ROLE_META[role] || ROLE_META.member;
  return (
    <Badge
      data-testid={`role-badge-${role}`}
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium border-transparent", meta.className, className)}
    >
      {meta.label}
    </Badge>
  );
}
