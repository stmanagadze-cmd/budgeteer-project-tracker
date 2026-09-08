import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Printer,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Unit = "mm" | "in";

interface Fin {
  id: string;
  mark: string;
  height: number;
  front: number;
  back: number;
  left: number;
  right: number;
  qty: number;
}

interface Floor {
  id: string;
  name: string;
  collapsed?: boolean;
  fins: Fin[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

const toInches = (value: number, unit: Unit) =>
  unit === "mm" ? value / 25.4 : value;

const faceAreas = (fin: Fin, unit: Unit) => {
  const h = toInches(fin.height || 0, unit);
  const f = (toInches(fin.front || 0, unit) * h) / 144;
  const b = (toInches(fin.back || 0, unit) * h) / 144;
  const l = (toInches(fin.left || 0, unit) * h) / 144;
  const r = (toInches(fin.right || 0, unit) * h) / 144;
  const single = f + b + l + r;
  return { f, b, l, r, single, total: single * (fin.qty || 0) };
};

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const demoFloors = (): Floor[] => [
  {
    id: uid(),
    name: "Ground Floor / Podium",
    fins: [
      { id: uid(), mark: "FIN-A1", height: 3600, front: 150, back: 150, left: 400, right: 400, qty: 24 },
      { id: uid(), mark: "CORNER-FIN-01", height: 3600, front: 200, back: 200, left: 500, right: 500, qty: 8 },
    ],
  },
  {
    id: uid(),
    name: "Level 2 - Typical",
    fins: [
      { id: uid(), mark: "FIN-B1", height: 3200, front: 120, back: 120, left: 350, right: 350, qty: 36 },
    ],
  },
];

const FinTakeoff = () => {
  const [title, setTitle] = useState("Commercial Facade Takeoff");
  const [unit, setUnit] = useState<Unit>("mm");
  const [floors, setFloors] = useState<Floor[]>(demoFloors);

  const stats = useMemo(() => {
    const perFloor = floors.map((fl) => {
      const area = fl.fins.reduce((s, fin) => s + faceAreas(fin, unit).total, 0);
      const pieces = fl.fins.reduce((s, fin) => s + (fin.qty || 0), 0);
      return { id: fl.id, name: fl.name, area, pieces };
    });
    const grand = perFloor.reduce((s, f) => s + f.area, 0);
    const pieces = perFloor.reduce((s, f) => s + f.pieces, 0);
    return { perFloor, grand, pieces };
  }, [floors, unit]);

  const updateFloor = (id: string, patch: Partial<Floor>) =>
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const updateFin = (floorId: string, finId: string, patch: Partial<Fin>) =>
    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId
          ? { ...f, fins: f.fins.map((fin) => (fin.id === finId ? { ...fin, ...patch } : fin)) }
          : f
      )
    );

  const addFloor = () =>
    setFloors((prev) => [...prev, { id: uid(), name: `Level ${prev.length + 1}`, fins: [] }]);

  const addFin = (floorId: string) =>
    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId
          ? {
              ...f,
              fins: [
                ...f.fins,
                { id: uid(), mark: `FIN-${f.fins.length + 1}`, height: 0, front: 0, back: 0, left: 0, right: 0, qty: 1 },
              ],
            }
          : f
      )
    );

  const duplicateFin = (floorId: string, finId: string) =>
    setFloors((prev) =>
      prev.map((f) => {
        if (f.id !== floorId) return f;
        const i = f.fins.findIndex((x) => x.id === finId);
        if (i < 0) return f;
        const copy = { ...f.fins[i], id: uid(), mark: `${f.fins[i].mark}-COPY` };
        const fins = [...f.fins];
        fins.splice(i + 1, 0, copy);
        return { ...f, fins };
      })
    );

  const deleteFin = (floorId: string, finId: string) =>
    setFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, fins: f.fins.filter((x) => x.id !== finId) } : f))
    );

  const numField = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    step = "any"
  ) => (
    <div className="space-y-1">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-9 font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/60">
      {/* Header */}
      <header className="bg-foreground text-background print:hidden">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-6 py-5">
          <Ruler className="h-7 w-7 text-primary" />
          <div className="flex-1 min-w-[220px]">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 border-transparent bg-transparent text-xl font-bold text-background focus-visible:border-primary"
            />
            <p className="px-3 text-xs text-background/60">
              Architectural Fin &amp; Facade Square Footage Takeoff
            </p>
          </div>
          <div className="flex overflow-hidden rounded-md border border-background/20">
            {(["mm", "in"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  unit === u ? "bg-primary text-primary-foreground" : "text-background/70 hover:bg-background/10"
                )}
              >
                {u === "mm" ? "Millimeters (mm)" : "Inches (in)"}
              </button>
            ))}
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Export Takeoff PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto grid grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-4 print:hidden">
        {/* Takeoff area */}
        <div className="space-y-4 lg:col-span-3">
          {floors.map((floor) => {
            const fs = stats.perFloor.find((f) => f.id === floor.id)!;
            return (
              <Card key={floor.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-card py-3">
                  <button
                    onClick={() => updateFloor(floor.id, { collapsed: !floor.collapsed })}
                    className="text-muted-foreground"
                    aria-label="Toggle floor"
                  >
                    {floor.collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <Input
                    value={floor.name}
                    onChange={(e) => updateFloor(floor.id, { name: e.target.value })}
                    className="h-9 max-w-xs font-semibold"
                  />
                  <Badge variant="secondary">{floor.fins.length} types · {fs.pieces} pcs</Badge>
                  <span className="ml-auto font-mono text-sm font-bold text-primary">
                    {fmt(fs.area)} ft²
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFloors((p) => p.filter((f) => f.id !== floor.id))}
                    aria-label="Delete floor"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>

                {!floor.collapsed && (
                  <CardContent className="space-y-4 pt-4">
                    {floor.fins.map((fin) => {
                      const a = faceAreas(fin, unit);
                      return (
                        <div key={fin.id} className="rounded-lg border bg-background p-4">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Fin Mark
                              </label>
                              <Input
                                value={fin.mark}
                                onChange={(e) => updateFin(floor.id, fin.id, { mark: e.target.value })}
                                className="h-9 text-sm font-semibold"
                              />
                            </div>
                            {numField(`Height (${unit})`, fin.height, (n) => updateFin(floor.id, fin.id, { height: n }))}
                            {numField(`Front W (${unit})`, fin.front, (n) => updateFin(floor.id, fin.id, { front: n }))}
                            {numField(`Back W (${unit})`, fin.back, (n) => updateFin(floor.id, fin.id, { back: n }))}
                            {numField(`Left D (${unit})`, fin.left, (n) => updateFin(floor.id, fin.id, { left: n }))}
                            {numField(`Right D (${unit})`, fin.right, (n) => updateFin(floor.id, fin.id, { right: n }))}
                            {numField("Qty", fin.qty, (n) => updateFin(floor.id, fin.id, { qty: Math.max(0, Math.round(n)) }), "1")}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-xs">
                            <span className="text-muted-foreground">Front <b className="font-mono text-foreground">{fmt(a.f)}</b> ft²</span>
                            <span className="text-muted-foreground">Back <b className="font-mono text-foreground">{fmt(a.b)}</b> ft²</span>
                            <span className="text-muted-foreground">Left <b className="font-mono text-foreground">{fmt(a.l)}</b> ft²</span>
                            <span className="text-muted-foreground">Right <b className="font-mono text-foreground">{fmt(a.r)}</b> ft²</span>
                            <span className="text-muted-foreground">Unit <b className="font-mono text-foreground">{fmt(a.single)}</b> ft²</span>
                            <span className="font-semibold text-primary">Group Total {fmt(a.total)} ft²</span>
                            <div className="ml-auto flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => duplicateFin(floor.id, fin.id)} aria-label="Duplicate fin">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteFin(floor.id, fin.id)} aria-label="Delete fin">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" onClick={() => addFin(floor.id)} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Fin
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}

          <Button onClick={addFloor} className="gap-2">
            <Plus className="h-4 w-4" /> Add Floor
          </Button>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="bg-foreground text-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-background/70">Grand Total Area</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-4xl font-bold">{fmt(stats.grand)}</p>
              <p className="text-sm text-background/70">ft²</p>
              <div className="mt-4 flex gap-6 text-sm text-background/80">
                <span>{stats.pieces} fin pieces</span>
                <span>{floors.length} floors</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Floor Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.perFloor.map((f) => {
                const pct = stats.grand > 0 ? (f.area / stats.grand) * 100 : 0;
                return (
                  <div key={f.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{f.name}</span>
                      <span className="font-mono font-medium">{fmt(f.area)} ft²</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-right text-[11px] text-muted-foreground">{pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Spec</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 font-mono text-sm text-muted-foreground">
              <p>1 in = 25.4 mm</p>
              <p>1 ft² = 144 in²</p>
              <p>Area = (W″ × H″) / 144</p>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Print schedule */}
      <div className="hidden print:block print-sheet">
        <h1>{title}</h1>
        <p>
          Date: {new Date().toLocaleDateString()} &nbsp;·&nbsp; Units: {unit === "mm" ? "Millimeters (mm)" : "Inches (in)"}
        </p>
        <div className="print-summary">
          <strong>Grand Total: {fmt(stats.grand)} ft²</strong> — {stats.pieces} pieces across {floors.length} floors
        </div>
        {floors.map((floor) => {
          const fs = stats.perFloor.find((f) => f.id === floor.id)!;
          return (
            <div key={floor.id} className="print-floor">
              <h2>
                {floor.name} — {fmt(fs.area)} ft²
              </h2>
              <table>
                <thead>
                  <tr>
                    <th>Mark</th>
                    <th>Height</th>
                    <th>Front</th>
                    <th>Back</th>
                    <th>Left</th>
                    <th>Right</th>
                    <th>Unit Area (ft²)</th>
                    <th>Qty</th>
                    <th>Subtotal (ft²)</th>
                  </tr>
                </thead>
                <tbody>
                  {floor.fins.map((fin) => {
                    const a = faceAreas(fin, unit);
                    return (
                      <tr key={fin.id}>
                        <td>{fin.mark}</td>
                        <td>{fin.height}</td>
                        <td>{fin.front}</td>
                        <td>{fin.back}</td>
                        <td>{fin.left}</td>
                        <td>{fin.right}</td>
                        <td>{fmt(a.single)}</td>
                        <td>{fin.qty}</td>
                        <td>{fmt(a.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinTakeoff;
