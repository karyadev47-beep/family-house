import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { timeAgo } from "@/lib/format";
import { History } from "lucide-react";

export default function Audit() {
  const { activeId } = useFamily();
  const { data: logs } = useResource(activeId ? `/families/${activeId}/activity` : null, [activeId]);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <PageHeader title="Log Aktivitas" description="Riwayat aktivitas dan perubahan pada keluarga Anda." />
      {(!logs || logs.length === 0) ? (
        <EmptyState icon={History} title="Belum ada aktivitas" description="Aktivitas keluarga akan tercatat di sini." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="p-5">
                {logs.map((l, idx) => (
                  <div key={l.id} data-testid={`audit-item-${l.id}`}>
                    <div className="flex gap-3 py-3">
                      <UserAvatar name={l.actor_name} className="h-9 w-9" />
                      <div className="flex-1">
                        <p className="text-sm leading-snug">{l.message}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(l.created_at)}</p>
                      </div>
                    </div>
                    {idx < logs.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
