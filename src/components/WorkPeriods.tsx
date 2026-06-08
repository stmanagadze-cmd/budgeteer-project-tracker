import { useState, useRef, useMemo, memo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Trash2,
  Edit,
  Upload,
  X,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WorkPeriodImage from "@/components/WorkPeriodImage";
import { VirtualTable, VirtualTableColumn } from "@/components/ui/virtual-table";

interface WorkPeriodsProps {
  project: Project;
  onAddPeriod: (period: Omit<WorkPeriod, "id">) => Promise<string | undefined> | void;
  onUpdatePeriod: (periodId: string, period: Partial<WorkPeriod>) => void;
  onDeletePeriod: (periodId: string) => void;
  onUploadImage: (periodId: string, file: File) => Promise<string | null>;
  onDeleteImage: (periodId: string, imageUrl: string) => Promise<void>;
  onArchivePeriod?: (periodId: string, archived: boolean) => void;
  sortBy: "date" | "totalHours" | "periodCost";
  onSortChange: (sortBy: "date" | "totalHours" | "periodCost") => void;
}

interface EditWorkPeriodFormProps {
  period: WorkPeriod;
  hourlySalary: number;
  onUpdatePeriod: (periodId: string, period: Partial<WorkPeriod>) => void;
  onUploadImage: (periodId: string, file: File) => Promise<string | null>;
  onDeleteImage: (periodId: string, imageUrl: string) => Promise<void>;
  onClose: () => void;
}

const PAGE_SIZE_KEY = "budgeteer.periodsPageSize";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const EditWorkPeriodForm = memo(function EditWorkPeriodForm({
  period,
  hourlySalary,
  onUpdatePeriod,
  onUploadImage,
  onDeleteImage,
  onClose,
}: EditWorkPeriodFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: period.date,
    teamSize: period.teamSize,
    daysWorked: period.daysWorked,
    hoursPerDay: period.hoursPerDay,
    workType: period.workType,
    location: period.location,
  });
  const [uploading, setUploading] = useState(false);
  const [confirmImage, setConfirmImage] = useState<string | null>(null);

  const handleChange = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = formData.teamSize * formData.daysWorked * formData.hoursPerDay;
    const periodCost = totalHours * hourlySalary;

    onUpdatePeriod(period.id, { ...formData, totalHours, periodCost });

    toast({
      title: "Work period updated",
      description: `Updated work period with ${totalHours} hours.`,
    });

    onClose();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: "Only PNG, JPG, and JPEG files are allowed.",
            variant: "destructive",
          });
          continue;
        }
        await onUploadImage(period.id, file);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-date">Date</Label>
          <Input id="edit-date" type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-teamSize">Team Size</Label>
          <Input id="edit-teamSize" type="number" value={formData.teamSize} onChange={(e) => handleChange("teamSize", parseInt(e.target.value) || 1)} min="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-daysWorked">Days Worked</Label>
          <Input id="edit-daysWorked" type="number" value={formData.daysWorked} onChange={(e) => handleChange("daysWorked", parseFloat(e.target.value) || 1)} min="0.5" step="0.5" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-hoursPerDay">Hours/Day</Label>
          <Input id="edit-hoursPerDay" type="number" value={formData.hoursPerDay} onChange={(e) => handleChange("hoursPerDay", parseInt(e.target.value) || 1)} min="1" max="24" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-workType">Work Type</Label>
          <Input id="edit-workType" value={formData.workType} onChange={(e) => handleChange("workType", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-location">Location</Label>
          <Input id="edit-location" value={formData.location} onChange={(e) => handleChange("location", e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>Attached photos ({period.images?.length || 0})</Label>
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              className="hidden"
              id={`edit-upload-${period.id}`}
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <label htmlFor={`edit-upload-${period.id}`}>
              <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? "Uploading…" : "Add photos"}
                </span>
              </Button>
            </label>
          </div>
        </div>
        {period.images && period.images.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {period.images.map((img, idx) => (
              <div key={`${img}-${idx}`} className="relative group">
                <WorkPeriodImage imagePath={img} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setConfirmImage(img)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photos attached.</p>
        )}
      </div>

      <Button type="submit" className="w-full">Update Period</Button>

      <AlertDialog open={!!confirmImage} onOpenChange={(o) => !o && setConfirmImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmImage) await onDeleteImage(period.id, confirmImage);
                setConfirmImage(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
});

const WorkPeriods = ({
  project,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onUploadImage,
  onDeleteImage,
  onArchivePeriod,
  sortBy,
  onSortChange,
}: WorkPeriodsProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WorkPeriod | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return 20;
    const stored = window.localStorage.getItem(PAGE_SIZE_KEY);
    const n = stored ? parseInt(stored, 10) : NaN;
    return PAGE_SIZE_OPTIONS.includes(n) ? n : 20;
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
    }
  }, [pageSize]);

  const [addFormData, setAddFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    teamSize: 1,
    daysWorked: 1,
    hoursPerDay: 8,
    workType: "Development",
    location: "Office",
  });

  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const parseDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }, []);

  const formatDate = useCallback((dateStr: string) => parseDate(dateStr).toLocaleDateString(), [parseDate]);

  const filteredPeriods = useMemo(() => {
    if (!project.workPeriods) return [];
    return showArchived ? project.workPeriods : project.workPeriods.filter((p) => !p.archived);
  }, [project.workPeriods, showArchived]);

  const sortedWorkPeriods = useMemo(() => {
    const periods = [...filteredPeriods];
    switch (sortBy) {
      case "date":
        return periods.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
      case "totalHours":
        return periods.sort((a, b) => b.totalHours - a.totalHours);
      case "periodCost":
        return periods.sort((a, b) => b.periodCost - a.periodCost);
      default:
        return periods;
    }
  }, [filteredPeriods, sortBy, parseDate]);

  const totalPages = Math.max(1, Math.ceil(sortedWorkPeriods.length / pageSize));

  // Reset page when filter/size changes
  useEffect(() => {
    setPage(1);
  }, [pageSize, showArchived, sortBy]);

  // Clamp page if total shrinks
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedPeriods = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedWorkPeriods.slice(start, start + pageSize);
  }, [sortedWorkPeriods, page, pageSize]);

  // Live editing period (re-read from project.workPeriods so photo edits reflect)
  const editingPeriod = useMemo(
    () => (editingPeriodId ? project.workPeriods.find((p) => p.id === editingPeriodId) ?? null : null),
    [editingPeriodId, project.workPeriods],
  );

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmittingAdd(true);

      const teamSize = addFormData.teamSize;
      const daysWorked = addFormData.daysWorked;
      const hoursPerDay = addFormData.hoursPerDay;
      const totalHours = teamSize * daysWorked * hoursPerDay;
      const periodCost = totalHours * project.hourlySalary;

      const result = onAddPeriod({
        date: addFormData.date,
        teamSize,
        daysWorked,
        hoursPerDay,
        workType: addFormData.workType,
        location: addFormData.location,
        totalHours,
        periodCost,
        images: [],
      });

      const newId = result instanceof Promise ? await result : undefined;

      // Upload any pending photos against the new period id
      if (newId && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) continue;
          await onUploadImage(newId, file);
        }
      }

      toast({
        title: "Work period added",
        description: `Added ${totalHours} hours${pendingFiles.length ? ` with ${pendingFiles.length} photo(s)` : ""}.`,
      });

      setAddFormData({
        date: new Date().toISOString().split("T")[0],
        teamSize: 1,
        daysWorked: 1,
        hoursPerDay: 8,
        workType: "Development",
        location: "Office",
      });
      setPendingFiles([]);
      if (addFilesInputRef.current) addFilesInputRef.current.value = "";
      setSubmittingAdd(false);
    },
    [addFormData, project.hourlySalary, onAddPeriod, onUploadImage, pendingFiles, toast],
  );

  const handleEdit = useCallback((period: WorkPeriod) => {
    setEditingPeriodId(period.id);
    setDialogOpen(true);
  }, []);

  const handleImageUpload = useCallback(
    async (periodId: string, files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploadingImages((prev) => ({ ...prev, [periodId]: true }));
      try {
        for (const file of Array.from(files)) {
          if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
            toast({
              title: "Invalid file type",
              description: "Only PNG, JPG, and JPEG files are allowed.",
              variant: "destructive",
            });
            continue;
          }
          await onUploadImage(periodId, file);
        }
      } finally {
        setUploadingImages((prev) => ({ ...prev, [periodId]: false }));
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onUploadImage, toast],
  );

  const handleRemoveImage = useCallback(
    async (periodId: string, imageUrl: string) => {
      await onDeleteImage(periodId, imageUrl);
      toast({ title: "Image removed", description: "Image has been removed successfully." });
    },
    [onDeleteImage, toast],
  );

  const archivedCount = project.workPeriods.filter((p) => p.archived).length;

  const columns: VirtualTableColumn<WorkPeriod>[] = useMemo(
    () => [
      { id: "date", header: "Date", sortable: true, sortValue: (p) => parseDate(p.date), cell: (p) => <span className="tabular-nums">{formatDate(p.date)}</span>, width: "120px" },
      { id: "teamSize", header: "Team", sortable: true, sortValue: (p) => p.teamSize, cell: (p) => p.teamSize, width: "80px" },
      { id: "daysWorked", header: "Days", sortable: true, sortValue: (p) => p.daysWorked, cell: (p) => p.daysWorked, width: "80px" },
      { id: "hoursPerDay", header: "Hrs/Day", sortable: true, sortValue: (p) => p.hoursPerDay, cell: (p) => p.hoursPerDay, width: "90px" },
      { id: "totalHours", header: "Total Hrs", sortable: true, sortValue: (p) => p.totalHours, cell: (p) => <span className="font-medium tabular-nums">{p.totalHours}</span>, width: "100px" },
      { id: "workType", header: "Work Type", sortable: true, sortValue: (p) => p.workType?.toLowerCase(), cell: (p) => <span className="truncate">{p.workType}</span>, width: "minmax(0, 1fr)" },
      { id: "location", header: "Location", sortable: true, sortValue: (p) => p.location?.toLowerCase(), cell: (p) => <span className="truncate">{p.location}</span>, width: "minmax(0, 1fr)" },
      { id: "periodCost", header: "Cost", sortable: true, sortValue: (p) => p.periodCost, cell: (p) => <span className="font-medium tabular-nums">${p.periodCost.toFixed(2)}</span>, width: "120px", className: "text-right", headerClassName: "justify-end" },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (p) => (p.archived ? "archived" : "active"),
        cell: (p) => (p.archived ? <Badge variant="secondary">Archived</Badge> : <Badge variant="outline">Active</Badge>),
        width: "110px",
      },
      {
        id: "images",
        header: "Images",
        cell: (p) => (
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(p.id, e.target.files)}
              id={`file-${p.id}`}
            />
            <label htmlFor={`file-${p.id}`}>
              <Button type="button" variant="outline" size="sm" disabled={uploadingImages[p.id]} asChild>
                <span className="cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploadingImages[p.id] ? "…" : "Upload"}
                </span>
              </Button>
            </label>
            {p.images && p.images.length > 0 && (
              <div className="flex gap-1 overflow-hidden">
                {p.images.slice(0, 3).map((imageUrl, idx) => (
                  <div key={idx} className="relative group flex-shrink-0">
                    <WorkPeriodImage imagePath={imageUrl} alt={`img ${idx + 1}`} className="h-9 w-9 object-cover rounded cursor-pointer" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveImage(p.id, imageUrl)}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
                {p.images.length > 3 && <span className="text-xs text-muted-foreground self-center ml-1">+{p.images.length - 3}</span>}
              </div>
            )}
          </div>
        ),
        width: "260px",
      },
      {
        id: "actions",
        header: "Actions",
        cell: (p) => (
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Edit">
              <Edit className="h-4 w-4" />
            </Button>
            {onArchivePeriod && (
              <Button variant="ghost" size="icon" onClick={() => onArchivePeriod(p.id, !p.archived)} title={p.archived ? "Restore" : "Archive"}>
                {p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(p)} className="text-destructive hover:text-destructive" title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        width: "140px",
        className: "justify-end",
        headerClassName: "justify-end",
      },
    ],
    [parseDate, formatDate, uploadingImages, handleImageUpload, handleRemoveImage, handleEdit, onArchivePeriod],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Work Periods</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            {archivedCount > 0 && (
              <div className="flex items-center gap-2">
                <Switch id="show-archived-periods" checked={showArchived} onCheckedChange={setShowArchived} />
                <Label htmlFor="show-archived-periods" className="text-sm cursor-pointer">
                  Show archived ({archivedCount})
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value: "date" | "totalHours" | "periodCost") => onSortChange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (PDF default)</SelectItem>
                  <SelectItem value="totalHours">Total Hours (PDF)</SelectItem>
                  <SelectItem value="periodCost">Period Cost (PDF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Inline Add Work Period Form */}
        <form onSubmit={handleAddSubmit} className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-3">
          <div className="grid gap-3 md:grid-cols-7 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input id="date" type="date" value={addFormData.date} onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })} required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamSize" className="text-xs">Team Size</Label>
              <Input id="teamSize" type="number" value={addFormData.teamSize} onChange={(e) => setAddFormData({ ...addFormData, teamSize: parseInt(e.target.value) || 1 })} min="1" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daysWorked" className="text-xs">Days Worked</Label>
              <Input id="daysWorked" type="number" value={addFormData.daysWorked} onChange={(e) => setAddFormData({ ...addFormData, daysWorked: parseFloat(e.target.value) || 1 })} min="0.5" step="0.5" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hoursPerDay" className="text-xs">Hours/Day</Label>
              <Input id="hoursPerDay" type="number" value={addFormData.hoursPerDay} onChange={(e) => setAddFormData({ ...addFormData, hoursPerDay: parseInt(e.target.value) || 1 })} min="1" max="24" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workType" className="text-xs">Work Type</Label>
              <Input id="workType" value={addFormData.workType} onChange={(e) => setAddFormData({ ...addFormData, workType: e.target.value })} required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs">Location</Label>
              <Input id="location" value={addFormData.location} onChange={(e) => setAddFormData({ ...addFormData, location: e.target.value })} required className="h-9" />
            </div>
            <Button type="submit" className="h-9" disabled={submittingAdd}>
              {submittingAdd ? "Adding…" : "Add Period"}
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Label htmlFor="add-period-photos" className="text-xs flex items-center gap-1 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Attach photos
            </Label>
            <input
              ref={addFilesInputRef}
              id="add-period-photos"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              className="text-xs"
              onChange={(e) => setPendingFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            {pendingFiles.length > 0 && (
              <span className="text-xs text-muted-foreground">{pendingFiles.length} file(s) ready</span>
            )}
          </div>
        </form>

        {/* Edit Dialog */}
        <Dialog
          open={dialogOpen && editingPeriod !== null}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingPeriodId(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Work Period</DialogTitle>
            </DialogHeader>
            {editingPeriod && (
              <EditWorkPeriodForm
                key={editingPeriod.id}
                period={editingPeriod}
                hourlySalary={project.hourlySalary}
                onUpdatePeriod={onUpdatePeriod}
                onUploadImage={onUploadImage}
                onDeleteImage={onDeleteImage}
                onClose={() => {
                  setDialogOpen(false);
                  setEditingPeriodId(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <VirtualTable
          rows={paginatedPeriods}
          columns={columns}
          rowKey={(p) => p.id}
          rowHeight={64}
          maxBodyHeight={560}
          getRowClassName={(p) => (p.archived ? "opacity-50 bg-muted/30" : "")}
          empty="No work periods added yet"
        />

        {/* Pagination controls */}
        <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v, 10))}>
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              {sortedWorkPeriods.length === 0
                ? "0"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sortedWorkPeriods.length)} of ${sortedWorkPeriods.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">
              Page {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete work period?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the period from {formatDate(confirmDelete?.date || project.workPeriods[0]?.date || new Date().toISOString().slice(0, 10))} and its attached images. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (confirmDelete) await onDeletePeriod(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default WorkPeriods;
