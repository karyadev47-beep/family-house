import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { timeAgo } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Check, X } from "lucide-react";

export default function Requests() {
  const { activeId } = useFamily();
  const { data: reqs, reload } = useResource(activeId ? `/families/${activeId}/join-requests` : null, [activeId]);
  const pending = (reqs || []).filter((r) => r.status === "pending");

  const approve = async (r) => {
    try { await api.post(`/families/${activeId}/join-requests/${r.id}/approve`, { role: "member" }); toast.success(`${r.user_name} disetujui`); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const reject = async (r) => {
    try { await api.post(`/families/${activeId}/join-requests/${r.id}/reject`); toast.success("Permintaan ditolak"); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="requests-page">
      <PageHeader title="Permintaan Bergabung" description="Setujui atau tolak permintaan bergabung ke keluarga." />
      {pending.length === 0 ? (
        <EmptyState icon={UserPlus} title="Tidak ada permintaan" description="Permintaan bergabung baru akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id} data-testid={`request-card-${r.id}`}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar name={r.user_name} className="h-11 w-11" />
                  <div>
                    <p className="font-medium">{r.user_name} <span className="text-sm font-normal text-muted-foreground">ingin bergabung</span></p>
                    <p className="text-sm text-muted-foreground">{r.user_email} · {timeAgo(r.created_at)}</p>
                    {r.message && <p className="mt-1 text-sm italic text-muted-foreground">"{r.message}"</p>}
                    <Badge variant="outline" className="mt-1.5">Anggota</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r)} data-testid={`request-approve-${r.id}`}><Check className="mr-1.5 h-4 w-4" />Setujui</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" data-testid={`request-reject-${r.id}`}><X className="mr-1.5 h-4 w-4" />Tolak</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Tolak permintaan?</AlertDialogTitle><AlertDialogDescription>{r.user_name} tidak akan bergabung ke keluarga ini.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => reject(r)}>Tolak</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
