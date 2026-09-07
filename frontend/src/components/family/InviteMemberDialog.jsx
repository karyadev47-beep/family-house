import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFamily } from "@/context/FamilyContext";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Copy, MessageCircle, Check } from "lucide-react";

export function InviteMemberDialog({ trigger, onCreated }) {
  const { activeId, activeFamily } = useFamily();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("member");
  const [expires, setExpires] = useState("7");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const link = result ? `${window.location.origin}/join-family/${result.code}` : "";

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/families/${activeId}/invitations`, {
        role, expires_days: Number(expires),
      });
      setResult(data);
      onCreated?.();
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Tautan undangan disalin");
    setTimeout(() => setCopied(false), 1500);
  };

  const shareWA = () => {
    const text = encodeURIComponent(`Kamu diundang bergabung ke ${activeFamily?.name} di KeluargaKita. Gunakan tautan ini: ${link} (kode: ${result.code})`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const reset = () => { setResult(null); setRole("member"); setExpires("7"); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent data-testid="invite-member-dialog">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Undang Anggota Keluarga</DialogTitle>
              <DialogDescription>Buat kode undangan untuk bergabung ke {activeFamily?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Peran</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger data-testid="invite-role-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Orang Tua</SelectItem>
                      <SelectItem value="member">Anggota</SelectItem>
                      <SelectItem value="child">Anak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kedaluwarsa</Label>
                  <Select value={expires} onValueChange={setExpires}>
                    <SelectTrigger data-testid="invite-expires-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hari</SelectItem>
                      <SelectItem value="7">7 hari</SelectItem>
                      <SelectItem value="30">30 hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button data-testid="create-invitation-button" onClick={create} disabled={busy}>{busy ? "Membuat…" : "Buat Undangan"}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Undangan Dibuat</DialogTitle>
              <DialogDescription>Bagikan kode atau tautan ini ke anggota keluarga.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center">
                <p className="text-xs text-muted-foreground">Kode Undangan</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider" data-testid="invitation-code">{result.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={link} className="font-mono text-xs" data-testid="invitation-link-input" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" onClick={copy} data-testid="copy-invitation-link-button">
                        {copied ? <Check className="h-4 w-4 text-chart-1" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Salin tautan</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button variant="outline" className="w-full" onClick={shareWA} data-testid="share-whatsapp-button">
                <MessageCircle className="mr-2 h-4 w-4" /> Bagikan via WhatsApp
              </Button>
              <p className="text-center text-xs text-muted-foreground">Undangan ini kedaluwarsa dalam {expires} hari.</p>
            </div>
            <DialogFooter><Button onClick={() => setOpen(false)} data-testid="invitation-done-button">Selesai</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
