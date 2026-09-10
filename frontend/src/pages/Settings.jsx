import { useState, useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RoleBadge } from "@/components/common/RoleBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, X, Copy, ShieldAlert } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MATRIX = [
  { label: "Lihat data keluarga", roles: { husband: true, wife: true, child: true } },
  { label: "Kelola transaksi", roles: { husband: true, wife: true, child: false } },
  { label: "Buat transaksi", roles: { husband: true, wife: true, child: false } },
  { label: "Kelola anggaran", roles: { husband: true, wife: true, child: false } },
  { label: "Undang anggota", roles: { husband: true, wife: true, child: false } },
  { label: "Setujui permintaan", roles: { husband: true, wife: true, child: false } },
  { label: "Kelola tugas & menu", roles: { husband: true, wife: true, child: false } },
  { label: "Tulis jurnal, tugas & menu", roles: { husband: true, wife: true, child: true } },
  { label: "Keluarkan anggota", roles: { husband: true, wife: false, child: false } },
  { label: "Ubah peran", roles: { husband: true, wife: false, child: false } },
  { label: "Transfer kepala keluarga", roles: { husband: true, wife: false, child: false } },
  { label: "Hapus keluarga", roles: { husband: true, wife: false, child: false } },
];
const ROLE_COLS = ["husband", "wife", "child"];
const ROLE_HEAD = { husband: "Kepala Keluarga", wife: "Istri", child: "Anak" };

export default function Settings() {
  const { activeId, activeFamily, refresh } = useFamily();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: members, reload: reloadMembers } = useResource(activeId ? `/families/${activeId}/members` : null, [activeId]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const isOwner = activeFamily?.my_role === "husband";
  const active = (members || []).filter((m) => m.status === "active");
  const others = active.filter((m) => m.user_id !== user?.id);

  useEffect(() => {
    if (activeFamily) { setName(activeFamily.name); setDescription(activeFamily.description || ""); }
  }, [activeFamily]);

  const saveGeneral = async () => {
    try {
      await api.put(`/families/${activeId}`, { name, description, avatar_url: activeFamily?.avatar_url || "" });
      await refresh();
      toast.success("Perubahan disimpan");
    } catch (e) { toast.error(apiError(e)); }
  };

  const copyJoinCode = () => { navigator.clipboard.writeText(activeFamily?.join_code || ""); toast.success("Kode keluarga disalin"); };

  const transfer = async () => {
    if (!newOwner) return toast.error("Pilih pemilik baru");
    try {
      await api.post(`/families/${activeId}/transfer`, { new_owner_id: newOwner });
      await refresh();
      await reloadMembers();
      toast.success("Kepala keluarga dialihkan. Anda kini menjadi Istri.");
      setNewOwner("");
    } catch (e) { toast.error(apiError(e)); }
  };

  const deleteFamily = async () => {
    try {
      await api.delete(`/families/${activeId}`);
      await refresh();
      toast.success("Keluarga dihapus");
      nav("/dashboard");
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <PageHeader title="Pengaturan Keluarga" description="Kelola informasi, peran, izin, dan kepemilikan keluarga." />
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general" data-testid="settings-tab-general">Umum</TabsTrigger>
          <TabsTrigger value="members" data-testid="settings-tab-members">Anggota & Peran</TabsTrigger>
          <TabsTrigger value="invitations" data-testid="settings-tab-invitations">Undangan & Kode</TabsTrigger>
          <TabsTrigger value="permissions" data-testid="settings-tab-permissions">Izin Akses</TabsTrigger>
          <TabsTrigger value="danger" data-testid="settings-tab-danger" className="text-destructive">Zona Berbahaya</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informasi Umum</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar name={name} src={activeFamily?.avatar_url} className="h-16 w-16 rounded-xl" />
                <div className="text-sm text-muted-foreground">Avatar keluarga</div>
              </div>
              <div className="space-y-2"><Label>Nama Keluarga</Label><Input data-testid="settings-name-input" value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} /></div>
              <div className="space-y-2"><Label>Deskripsi</Label><Textarea data-testid="settings-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isOwner} /></div>
              {isOwner && <Button data-testid="settings-save-button" onClick={saveGeneral}>Simpan Perubahan</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Anggota</TableHead><TableHead>Email</TableHead><TableHead>Peran</TableHead></TableRow></TableHeader>
                <TableBody>
                  {active.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><div className="flex items-center gap-2"><UserAvatar name={m.name} className="h-8 w-8" /><span className="font-medium">{m.name}</span></div></TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell><RoleBadge role={m.role} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Kode Keluarga</CardTitle><CardDescription>Bagikan kode ini agar orang lain dapat mengirim permintaan bergabung.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input readOnly value={activeFamily?.join_code || ""} className="font-mono text-lg font-bold" data-testid="family-join-code" />
                <Button size="icon" variant="outline" onClick={copyJoinCode} data-testid="copy-join-code-button"><Copy className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Matriks Izin</CardTitle><CardDescription>Ringkasan izin berdasarkan peran.</CardDescription></CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="min-w-[180px]">Kemampuan</TableHead>{ROLE_COLS.map((r) => <TableHead key={r} className="text-center">{ROLE_HEAD[r]}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {MATRIX.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        {ROLE_COLS.map((r) => (
                          <TableCell key={r} className="text-center">
                            {row.roles[r] ? <Check className="mx-auto h-4 w-4 text-chart-1" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="pt-4">
          {!isOwner ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Hanya Kepala Keluarga yang dapat mengakses zona ini.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card className="border-destructive/40">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Transfer Kepala Keluarga</CardTitle><CardDescription>Setelah transfer, Anda akan menjadi Istri.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={newOwner} onValueChange={setNewOwner}>
                    <SelectTrigger data-testid="transfer-owner-select" className="max-w-sm"><SelectValue placeholder="Pilih kepala keluarga baru" /></SelectTrigger>
                    <SelectContent>{others.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={!newOwner} data-testid="transfer-ownership-button">Transfer Kepala Keluarga</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Transfer kepala keluarga?</AlertDialogTitle><AlertDialogDescription>Anda akan berubah menjadi Istri dan tidak lagi menjadi Kepala Keluarga. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={transfer} data-testid="transfer-ownership-confirm">Transfer</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

              <Card className="border-destructive/40">
                <CardHeader><CardTitle className="text-base text-destructive">Hapus Keluarga</CardTitle><CardDescription>Menghapus keluarga beserta seluruh datanya secara permanen.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-w-sm">
                    <Label>Ketik nama keluarga untuk konfirmasi</Label>
                    <Input data-testid="delete-family-confirm-input" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={activeFamily?.name} />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={confirmName !== activeFamily?.name} data-testid="delete-family-button">Hapus Keluarga</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Hapus keluarga secara permanen?</AlertDialogTitle><AlertDialogDescription>Seluruh transaksi, anggaran, jurnal, dan data lain akan hilang. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={deleteFamily} data-testid="delete-family-confirm">Hapus</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
