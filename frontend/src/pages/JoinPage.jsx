import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RoleBadge } from "@/components/common/RoleBadge";
import { toast } from "sonner";
import { HeartHandshake, Loader2 } from "lucide-react";

export default function JoinPage() {
  const { code } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState("loading"); // loading | ok | error | auth
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loggedIn = !!localStorage.getItem("kk_token");

  useEffect(() => {
    if (!loggedIn) {
      setState("auth");
      return;
    }
    api
      .get(`/invitations/lookup/${code}`)
      .then((r) => { setInfo(r.data); setState("ok"); })
      .catch((e) => { setError(apiError(e)); setState("error"); });
  }, [code, loggedIn]);

  const accept = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/invitations/accept", { code });
      localStorage.setItem("kk_active_family", data.id);
      toast.success(`Bergabung ke ${data.name}`);
      nav("/dashboard");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {state === "loading" && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}

          {state === "auth" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold font-display">Anda diundang bergabung</h1>
              <p className="text-sm text-muted-foreground">Masuk atau daftar untuk menerima undangan ini.</p>
              <div className="flex w-full flex-col gap-2 pt-2">
                <Button data-testid="join-login-button" onClick={() => nav(`/login`)}>Masuk</Button>
                <Button variant="outline" data-testid="join-register-button"
                  onClick={() => nav(`/register?redirect=/join-family/${code}`)}>Daftar Akun Baru</Button>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <h1 className="text-lg font-bold">Undangan tidak berlaku</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => nav("/dashboard")}>Kembali</Button>
            </>
          )}

          {state === "ok" && info && (
            <>
              <UserAvatar name={info.family_name} src={info.family_avatar} className="h-20 w-20 rounded-2xl" />
              <div>
                <p className="text-sm text-muted-foreground">Anda diundang bergabung ke</p>
                <h1 className="text-xl font-bold font-display">{info.family_name}</h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Diundang oleh {info.invited_by_name}
              </div>
              <div className="flex items-center gap-2 text-sm">Peran: <RoleBadge role={info.role} /></div>
              <Separator />
              <div className="flex w-full flex-col gap-2">
                <Button data-testid="accept-invitation-button" onClick={accept} disabled={busy} className="w-full">
                  {busy ? "Memproses…" : "Terima Undangan"}
                </Button>
                <Button variant="ghost" data-testid="decline-invitation-button" onClick={() => nav("/dashboard")}>
                  Tolak
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
