import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/common/RoleBadge";
import { InviteMemberDialog } from "@/components/family/InviteMemberDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { MoreHorizontal, MailPlus, Copy } from "lucide-react";

const STATUS = {
  pending: { label: "Menunggu", variant: "secondary" },
  accepted: { label: "Diterima", variant: "default" },
  revoked: { label: "Dicabut", variant: "outline" },
  expired: { label: "Kedaluwarsa", variant: "outline" },
};

export default function Invitations() {
  const { activeId } = useFamily();
  const { data: invs, reload } = useResource(activeId ? `/families/${activeId}/invitations` : null, [activeId]);

  const copyLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join-family/${code}`);
    toast.success("Tautan undangan disalin");
  };

  const revoke = async (id) => {
    try { await api.post(`/families/${activeId}/invitations/${id}/revoke`); toast.success("Undangan dicabut"); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="invitations-page">
      <PageHeader title="Undangan" description="Kelola undangan yang sedang menunggu.">
        <InviteMemberDialog trigger={<Button data-testid="invite-member-button"><MailPlus className="mr-2 h-4 w-4" />Undang Anggota</Button>} onCreated={reload} />
      </PageHeader>

      {(!invs || invs.length === 0) ? (
        <EmptyState icon={MailPlus} title="Belum ada undangan" description="Buat undangan untuk mengajak anggota baru." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead><TableHead>Email</TableHead><TableHead>Peran</TableHead>
                <TableHead>Diundang Oleh</TableHead><TableHead>Kedaluwarsa</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invs.map((i) => (
                <TableRow key={i.id} data-testid={`invitation-row-${i.id}`}>
                  <TableCell className="font-mono text-xs font-medium">{i.code}</TableCell>
                  <TableCell className="text-muted-foreground">{i.email || "—"}</TableCell>
                  <TableCell><RoleBadge role={i.role} /></TableCell>
                  <TableCell className="text-muted-foreground">{i.invited_by_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(i.expires_at)}</TableCell>
                  <TableCell><Badge variant={STATUS[i.status]?.variant}>{STATUS[i.status]?.label}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`invitation-actions-${i.id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => copyLink(i.code)} data-testid={`invitation-copy-${i.id}`}><Copy className="mr-2 h-4 w-4" />Salin Tautan</DropdownMenuItem>
                        {i.status === "pending" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} data-testid={`invitation-revoke-${i.id}`}>Cabut</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Cabut undangan?</AlertDialogTitle><AlertDialogDescription>Kode ini tidak dapat digunakan lagi setelah dicabut.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => revoke(i.id)}>Cabut</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
