import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RoleBadge } from "@/components/common/RoleBadge";
import { InviteMemberDialog } from "@/components/family/InviteMemberDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus } from "lucide-react";

export default function Members() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();
  const { data: members, reload } = useResource(activeId ? `/families/${activeId}/members` : null, [activeId]);
  const [roleDialog, setRoleDialog] = useState(null);
  const [newRole, setNewRole] = useState("member");
  const myRole = activeFamily?.my_role;
  const canRemove = myRole === "owner";
  const canChangeRole = myRole === "owner";
  const canInvite = ["owner", "parent"].includes(myRole);

  const active = (members || []).filter((m) => m.status === "active");

  const changeRole = async () => {
    try {
      await api.patch(`/families/${activeId}/members/${roleDialog.id}/role`, { role: newRole });
      toast.success("Peran diperbarui");
      setRoleDialog(null);
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (m) => {
    try { await api.delete(`/families/${activeId}/members/${m.id}`); toast.success("Anggota dikeluarkan"); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="members-page">
      <PageHeader title="Anggota Keluarga" description="Kelola orang-orang di keluarga Anda.">
        {canInvite && <InviteMemberDialog trigger={<Button data-testid="invite-member-button"><UserPlus className="mr-2 h-4 w-4" />Undang Anggota</Button>} />}
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((m) => (
          <Card key={m.id} data-testid={`member-card-${m.id}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <UserAvatar name={m.name} src={m.avatar_url} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name} {m.user_id === user?.id && <span className="text-xs text-muted-foreground">(Anda)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                <div className="mt-1.5"><RoleBadge role={m.role} /></div>
              </div>
              {m.role !== "owner" && (canRemove || canChangeRole) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`member-actions-${m.id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeRole && <DropdownMenuItem data-testid={`member-change-role-${m.id}`} onSelect={() => { setRoleDialog(m); setNewRole(m.role); }}>Ubah Peran</DropdownMenuItem>}
                    {canRemove && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} data-testid={`member-remove-${m.id}`}>Keluarkan Anggota</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Keluarkan anggota?</AlertDialogTitle>
                            <AlertDialogDescription>{m.name} akan kehilangan akses ke keluarga ini. Transaksi dan jurnal lama tidak dihapus otomatis.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => remove(m)} data-testid={`member-remove-confirm-${m.id}`}>Keluarkan</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <DialogContent data-testid="change-role-dialog">
          <DialogHeader><DialogTitle>Ubah Peran — {roleDialog?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger data-testid="change-role-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Orang Tua</SelectItem>
                <SelectItem value="member">Anggota</SelectItem>
                <SelectItem value="child">Anak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={changeRole} data-testid="change-role-submit">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
