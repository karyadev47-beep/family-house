import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

export default function Overview() {
  const { activeId } = useFamily();
  const { data: txs } = useResource(activeId ? `/families/${activeId}/transactions` : null, [activeId]);
  const list = txs || [];

  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const byCat = {};
  list.filter((t) => t.type === "expense").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value }));

  const byMember = {};
  list.filter((t) => t.type === "expense").forEach((t) => { byMember[t.member_name] = (byMember[t.member_name] || 0) + t.amount; });
  const barData = Object.entries(byMember).map(([name, total]) => ({ name: name.split(" ")[0], total }));

  return (
    <div className="space-y-6" data-testid="overview-page">
      <PageHeader title="Ikhtisar Keuangan" description="Ringkasan pemasukan dan pengeluaran keluarga." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Pemasukan</p><p className="mt-1 text-2xl font-bold text-chart-1 font-display">{formatIDR(income)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Pengeluaran</p><p className="mt-1 text-2xl font-bold text-destructive font-display">{formatIDR(expense)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Saldo</p><p className="mt-1 text-2xl font-bold font-display">{formatIDR(income - expense)}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pengeluaran per Kategori</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Belum ada data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pengeluaran per Anggota</CardTitle></CardHeader>
          <CardContent className="h-72">
            {barData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v / 1000000}jt`} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Belum ada data.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
