import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/common/RoleBadge";
import { formatIDR, timeAgo } from "@/lib/format";
import { Wallet, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";

function StatCard({ icon: Icon, label, value, tone = "default", testid }) {
  const tones = {
    default: "bg-accent text-accent-foreground",
    income: "bg-chart-1/15 text-chart-1",
    expense: "bg-destructive/10 text-destructive",
  };
  return (
    <Card data-testid={testid}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { activeFamily, activeId } = useFamily();
  const { user } = useAuth();
  const { data, loading } = useResource(activeId ? `/families/${activeId}/dashboard` : null, [activeId]);
  const { data: budgets } = useResource(activeId ? `/families/${activeId}/budgets` : null, [activeId]);
  const { data: activity } = useResource(activeId ? `/families/${activeId}/activity` : null, [activeId]);

  const hour = new Date().getHours();
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
          {greet}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{activeFamily?.name}</span>
          <span>·</span>
          <span>{activeFamily?.member_count} anggota</span>
          {activeFamily?.my_role && <RoleBadge role={activeFamily.my_role} className="ml-1" />}
        </div>
      </div>

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard testid="stat-balance" icon={Wallet} label="Saldo" value={formatIDR(data.balance)} />
          <StatCard testid="stat-income" icon={TrendingUp} label="Pemasukan (bln ini)" value={formatIDR(data.month_income)} tone="income" />
          <StatCard testid="stat-expense" icon={TrendingDown} label="Pengeluaran (bln ini)" value={formatIDR(data.month_expense)} tone="expense" />
          <StatCard testid="stat-members" icon={Users} label="Anggota" value={data.member_count} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Anggaran Bulanan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(budgets || []).slice(0, 5).map((b) => {
              const pct = b.limit ? Math.min(100, Math.round((b.spent / b.limit) * 100)) : 0;
              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span className="text-muted-foreground">
                      {formatIDR(b.spent)} / {formatIDR(b.limit)}
                    </span>
                  </div>
                  <Progress value={pct} className={pct >= 80 ? "[&>div]:bg-destructive" : ""} />
                </div>
              );
            })}
            {(!budgets || budgets.length === 0) && <p className="text-sm text-muted-foreground">Belum ada anggaran.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Aktivitas Terbaru</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(activity || []).slice(0, 6).map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="leading-snug">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Transaksi Terbaru</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {(data?.recent_transactions || []).map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${t.type === "income" ? "bg-chart-1/15 text-chart-1" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {t.member_name}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${t.type === "income" ? "text-chart-1" : "text-foreground"}`}>
                {t.type === "income" ? "+" : "-"}{formatIDR(t.amount)}
              </span>
            </div>
          ))}
          {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
            <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
