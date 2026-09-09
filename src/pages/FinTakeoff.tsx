import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Printer,
  Ruler,
  Check,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface TakeoffProject {
  id: string;
  title: string;
  unit: Unit;
  floors: Floor[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

const toInches = (value: number, unit: Unit) => (unit === "mm" ? value / 25.4 : value);

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

const newProject = (title: string): TakeoffProject => ({
  id: uid(),
  title,
  unit: "mm",
  floors: [{ id: uid(), name: "Level 1", fins: [] }],
});

const STORAGE_KEY = "ft2-calculator-state-v1";
const MEM_KEY = "ft2-calculator-memory-v1";

const FinTakeoff = () => {
  const [projects, setProjects] = useState<TakeoffProject[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as TakeoffProject[]) : null;
      if (parsed && Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* ignore malformed cache */
    }
    return [{ id: uid(), title: "Commercial Facade Takeoff", unit: "mm", floors: demoFloors() }];
  });
  const [activeId, setActiveId] = useState<string>(() => "");
  const [memory, setMemory] = useState<number>(() => {
    const raw = localStorage.getItem(MEM_KEY);
    const n = raw ? parseFloat(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const active = projects.find((p) => p.id === activeId) ?? projects[0];

  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(MEM_KEY, String(memory));
  }, [memory]);

  const unit = active?.unit ?? "mm";
  const floors = active?.floors ?? [];

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

  const patchProject = (patch: Partial<TakeoffProject>) =>
    setProjects((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));

  const setFloors = (updater: (prev: Floor[]) => Floor[]) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, floors: updater(p.floors) } : p)),
    );

  const copyValue = async (value: number, key: string, label: string) => {
    const text = `${fmt(value)} ft²`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
      toast.success(`Copied ${label}: ${text}`);
    } catch {
      toast.error("Clipboard is not available in this browser");
    }
  };

  const addProject = () => {
    const p = newProject(`Project ${projects.length + 1}`);
    setProjects((prev) => [...prev, p]);
    setActiveId(p.id);
  };

  const confirmDeleteProject = () => {
    if (!deleteProjectId) return;
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== deleteProjectId);
      const result = next.length ? next : [newProject("Untitled Takeoff")];
      setActiveId(result[0].id);
      return result;
    });
    setDeleteProjectId(null);
    toast.success("Project deleted");
  };

  const updateFloor = (id: string, patch: Partial<Floor>) =>
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const updateFin = (floorId: string, finId: string, patch: Partial<Fin>) =>
    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId
          ? { ...f, fins: f.fins.map((fin) => (fin.id === finId ? { ...fin, ...patch } : fin)) }
          : f,
      ),
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
          : f,
      ),
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
      }),
    );

  const duplicateFloor = (floorId: string) =>
    setFloors((prev) => {
      const i = prev.findIndex((f) => f.id === floorId);
      if (i < 0) return prev;
      const src = prev[i];
      const copy: Floor = {
        ...src,
        id: uid(),
        name: `${src.name} (copy)`,
        fins: src.fins.map((fin) => ({ ...fin, id: uid() })),
      };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });

  const deleteFin = (floorId: string, finId: string) =>
    setFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, fins: f.fins.filter((x) => x.id !== finId) } : f)),
    );

  const numField = (label: string, value: number, onChange: (n: number) => void, step = "any") => {
    const invalid = !Number.isFinite(value) || value < 0;
    return (
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        <Input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn("h-9 font-mono text-sm", invalid && "border-destructive")}
        />
      </div>
    );
  };

  const CopyBtn = ({ value, keyId, label }: { value: number; keyId: string; label: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => copyValue(value, keyId, label)}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      {copiedKey === keyId ? (
        <Check className="h-4 w-4 text-primary animate-in zoom-in-50" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-secondary/60">
      {/* Header */}
      <header className="bg-foreground text-background print:hidden">
        <div className="container mx-auto flex flex-wrap items-center gap-4 px-6 py-5">
          <Ruler className="h-7 w-7 text-primary" />
          <div className="flex-1 min-w-[220px]">
            <Input
              value={active.title}
              onChange={(e) => patchProject({ title: e.target.value })}
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
                onClick={() => patchProject({ unit: u })}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  unit === u ? "bg-primary text-primary-foreground" : "text-background/70 hover:bg-background/10",
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

        {/* Project switcher */}
        <div className="border-t border-background/10">
          <div className="container mx-auto flex items-center gap-2 overflow-x-auto px-6 py-3">
            {projects.map((p) => (
              <div key={p.id} className="flex flex-shrink-0 items-center">
                <button
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "rounded-l-md px-3 py-1.5 text-sm font-medium transition-colors",
                    p.id === active.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/10 text-background/80 hover:bg-background/20",
                  )}
                >
                  {p.title || "Untitled"}
                </button>
                <button
                  onClick={() => setDeleteProjectId(p.id)}
                  aria-label={`Delete ${p.title}`}
                  className={cn(
                    "rounded-r-md px-2 py-2 transition-colors",
                    p.id === active.id
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-background/10 text-background/60 hover:bg-background/20",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addProject} className="flex-shrink-0 gap-2">
              <FolderPlus className="h-4 w-4" /> New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-4 print:hidden">
        {/* Takeoff area */}
        <div className="space-y-4 lg:col-span-3">
          {floors.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No floors yet — add your first floor to start the takeoff.
              </CardContent>
            </Card>
          )}
          {floors.map((floor) => {
            const fs = stats.perFloor.find((f) => f.id === floor.id)!;
            return (
              <Card key={floor.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b bg-card py-3">
                  <button
                    onClick={() => updateFloor(floor.id, { collapsed: !floor.collapsed })}
                    className="text-muted-foreground transition-transform hover:text-foreground"
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
                  <CopyBtn value={fs.area} keyId={`floor-${floor.id}`} label={`${floor.name} total`} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => duplicateFloor(floor.id)}
                    aria-label="Duplicate floor"
                    title="Duplicate floor"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </Button>
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
                        <div key={fin.id} className="rounded-lg border bg-background p-4 transition-colors hover:border-primary/40">
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
                              <CopyBtn value={a.total} keyId={`fin-${fin.id}`} label={`${fin.mark} total`} />
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-background/70">Grand Total Area</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-background hover:bg-background/10 hover:text-background"
                onClick={() => copyValue(stats.grand, "grand", "grand total")}
                aria-label="Copy grand total"
              >
                {copiedKey === "grand" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
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

          {/* Memory panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Memory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">M</span>
                <span className="font-mono text-lg font-bold">{fmt(memory)} ft²</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemory((m) => m + stats.grand);
                    toast.success("Added grand total to memory");
                  }}
                >
                  M+
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemory((m) => m - stats.grand);
                    toast.success("Subtracted grand total from memory");
                  }}
                >
                  M−
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyValue(memory, "mr", "memory")}
                >
                  MR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemory(0);
                    toast.success("Memory cleared");
                  }}
                >
                  MC
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                M+ / M− use the current project grand total. MR copies memory to your clipboard.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Floor Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.perFloor.length === 0 && (
                <p className="text-sm text-muted-foreground">No floors to summarize yet.</p>
              )}
              {stats.perFloor.map((f) => {
                const pct = stats.grand > 0 ? (f.area / stats.grand) * 100 : 0;
                return (
                  <div key={f.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f.name}</span>
                      <span className="font-mono font-medium">{fmt(f.area)} ft²</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
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
        <h1>{active.title}</h1>
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

      <AlertDialog open={!!deleteProjectId} onOpenChange={(o) => !o && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              All floors and fin types in this project will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinTakeoff;
