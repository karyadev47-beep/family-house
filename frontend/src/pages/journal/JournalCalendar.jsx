import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MOODS, formatDate } from "@/lib/format";

const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function JournalCalendar() {
  const { activeId } = useFamily();
  const { data: entries } = useResource(activeId ? `/families/${activeId}/journal?scope=my` : null, [activeId]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = {};
  (entries || []).forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      (byDay[d.getDate()] = byDay[d.getDate()] || []).push(e);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6" data-testid="journal-calendar-page">
      <PageHeader title="Kalender Jurnal" description={`Jurnal Anda bulan ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}.`} />
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {DOW.map((d) => <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
            {cells.map((d, i) => (
              <div key={i} className={`min-h-[72px] rounded-lg border p-2 ${d ? "border-border bg-card" : "border-transparent"}`} data-testid={d ? `calendar-day-${d}` : undefined}>
                {d && (
                  <>
                    <span className="text-xs font-medium text-muted-foreground">{d}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(byDay[d] || []).slice(0, 4).map((e) => (
                        <span key={e.id} title={e.title} className="text-base">{MOODS[e.mood]?.emoji || "📝"}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
