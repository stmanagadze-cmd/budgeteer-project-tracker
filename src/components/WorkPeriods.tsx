import { useState, useRef, useMemo, memo, useCallback } from "react";
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
import { Trash2, Edit, Upload, X, ArrowUpDown, Archive, ArchiveRestore } from "lucide-react";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WorkPeriodImage from "@/components/WorkPeriodImage";
import { VirtualTable, VirtualTableColumn } from "@/components/ui/virtual-table";

interface WorkPeriodsProps {
  project: Project;
  onAddPeriod: (period: Omit<WorkPeriod, "id">) => void;
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
  onClose: () => void;
}

const EditWorkPeriodForm = memo(function EditWorkPeriodForm({
  period,
  hourlySalary,
  onUpdatePeriod,
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

  const handleChange = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = formData.teamSize * formData.daysWorked * formData.hoursPerDay;
    const periodCost = totalHours * hourlySalary;

    onUpdatePeriod(period.id, {
      ...formData,
      totalHours,
      periodCost,
    });

    toast({
      title: "Work period updated",
      description: `Updated work period with ${totalHours} hours.`,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-date">Date</Label>
          <Input
            id="edit-date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-teamSize">Team Size</Label>
          <Input
            id="edit-teamSize"
            type="number"
            value={formData.teamSize}
            onChange={(e) => handleChange("teamSize", parseInt(e.target.value) || 1)}
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-daysWorked">Days Worked</Label>
          <Input
            id="edit-daysWorked"
            type="number"
            value={formData.daysWorked}
            onChange={(e) => handleChange("daysWorked", parseFloat(e.target.value) || 1)}
            min="0.5"
            step="0.5"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-hoursPerDay">Hours/Day</Label>
          <Input
            id="edit-hoursPerDay"
            type="number"
            value={formData.hoursPerDay}
            onChange={(e) => handleChange("hoursPerDay", parseInt(e.target.value) || 1)}
            min="1"
            max="24"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-workType">Work Type</Label>
          <Input
            id="edit-workType"
            value={formData.workType}
            onChange={(e) => handleChange("workType", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-location">Location</Label>
          <Input
            id="edit-location"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Update Period
      </Button>
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
  const [editingPeriod, setEditingPeriod] = useState<WorkPeriod | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WorkPeriod | null>(null);

  
  // Separate state for add form
  const [addFormData, setAddFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    teamSize: 1,
    daysWorked: 1,
    hoursPerDay: 8,
    workType: "Development",
    location: "Office",
  });
  
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  // Memoize date parsing to avoid recalculating on every render
  const parseDate = useCallback((dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return parseDate(dateStr).toLocaleDateString();
  }, [parseDate]);

  const filteredPeriods = useMemo(() => {
    if (!project.workPeriods) return [];
    return showArchived
      ? project.workPeriods
      : project.workPeriods.filter((p) => !p.archived);
  }, [project.workPeriods, showArchived]);

  // Kept for PDF export / parent compatibility (initial default sort)
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


  // Memoize the add submit handler to prevent unnecessary re-renders
  const handleAddSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate values locally - no external dependencies that could cause loops
    const teamSize = addFormData.teamSize;
    const daysWorked = addFormData.daysWorked;
    const hoursPerDay = addFormData.hoursPerDay;
    const totalHours = teamSize * daysWorked * hoursPerDay;
    const periodCost = totalHours * project.hourlySalary;

    // Call parent handler with calculated period
    onAddPeriod({
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
    
    toast({
      title: "Work period added",
      description: `Added ${totalHours} hours to the project.`,
    });

    // Reset add form with fresh values
    setAddFormData({
      date: new Date().toISOString().split("T")[0],
      teamSize: 1,
      daysWorked: 1,
      hoursPerDay: 8,
      workType: "Development",
      location: "Office",
    });
  }, [addFormData, project.hourlySalary, onAddPeriod, toast]);


  const handleEdit = useCallback((period: WorkPeriod) => {
    setEditingPeriod(period);
    setDialogOpen(true);
  }, []);

  const handleImageUpload = useCallback(async (periodId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const period = project.workPeriods.find(p => p.id === periodId);
    if (!period) return;

    setUploadingImages(prev => ({ ...prev, [periodId]: true }));

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: "Only PNG, JPG, and JPEG files are allowed.",
            variant: "destructive",
          });
          return null;
        }

        return await onUploadImage(periodId, file);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length > 0) {
        const updatedImages = [...(period.images || []), ...validUrls];
        onUpdatePeriod(periodId, { images: updatedImages });
        
        toast({
          title: "Images uploaded",
          description: `Successfully uploaded ${validUrls.length} image(s).`,
        });
      }
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setUploadingImages(prev => ({ ...prev, [periodId]: false }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [project.workPeriods, onUploadImage, onUpdatePeriod, toast]);

  const handleRemoveImage = useCallback(async (periodId: string, imageUrl: string) => {
    const period = project.workPeriods.find(p => p.id === periodId);
    if (!period) return;

    await onDeleteImage(periodId, imageUrl);
    const updatedImages = period.images.filter(img => img !== imageUrl);
    onUpdatePeriod(periodId, { images: updatedImages });

    toast({
      title: "Image removed",
      description: "Image has been removed successfully.",
    });
  }, [project.workPeriods, onDeleteImage, onUpdatePeriod, toast]);

  const archivedCount = project.workPeriods.filter((p) => p.archived).length;

  const columns: VirtualTableColumn<WorkPeriod>[] = useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        sortable: true,
        sortValue: (p) => parseDate(p.date),
        cell: (p) => <span className="tabular-nums">{formatDate(p.date)}</span>,
        width: "120px",
      },
      {
        id: "teamSize",
        header: "Team",
        sortable: true,
        sortValue: (p) => p.teamSize,
        cell: (p) => p.teamSize,
        width: "80px",
      },
      {
        id: "daysWorked",
        header: "Days",
        sortable: true,
        sortValue: (p) => p.daysWorked,
        cell: (p) => p.daysWorked,
        width: "80px",
      },
      {
        id: "hoursPerDay",
        header: "Hrs/Day",
        sortable: true,
        sortValue: (p) => p.hoursPerDay,
        cell: (p) => p.hoursPerDay,
        width: "90px",
      },
      {
        id: "totalHours",
        header: "Total Hrs",
        sortable: true,
        sortValue: (p) => p.totalHours,
        cell: (p) => <span className="font-medium tabular-nums">{p.totalHours}</span>,
        width: "100px",
      },
      {
        id: "workType",
        header: "Work Type",
        sortable: true,
        sortValue: (p) => p.workType?.toLowerCase(),
        cell: (p) => <span className="truncate">{p.workType}</span>,
        width: "minmax(0, 1fr)",
      },
      {
        id: "location",
        header: "Location",
        sortable: true,
        sortValue: (p) => p.location?.toLowerCase(),
        cell: (p) => <span className="truncate">{p.location}</span>,
        width: "minmax(0, 1fr)",
      },
      {
        id: "periodCost",
        header: "Cost",
        sortable: true,
        sortValue: (p) => p.periodCost,
        cell: (p) => <span className="font-medium tabular-nums">${p.periodCost.toFixed(2)}</span>,
        width: "120px",
        className: "text-right",
        headerClassName: "justify-end",
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (p) => (p.archived ? "archived" : "active"),
        cell: (p) =>
          p.archived ? (
            <Badge variant="secondary">Archived</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          ),
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImages[p.id]}
                asChild
              >
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
                    <WorkPeriodImage
                      imagePath={imageUrl}
                      alt={`img ${idx + 1}`}
                      className="h-9 w-9 object-cover rounded cursor-pointer"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(p.id, imageUrl)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
                {p.images.length > 3 && (
                  <span className="text-xs text-muted-foreground self-center ml-1">
                    +{p.images.length - 3}
                  </span>
                )}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onArchivePeriod(p.id, !p.archived)}
                title={p.archived ? "Restore" : "Archive"}
              >
                {p.archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(p)}
              className="text-destructive hover:text-destructive"
              title="Delete"
            >
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
                <Switch
                  id="show-archived-periods"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
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
        <form onSubmit={handleAddSubmit} className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="grid gap-3 md:grid-cols-7 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input
                id="date"
                type="date"
                value={addFormData.date}
                onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teamSize" className="text-xs">Team Size</Label>
              <Input
                id="teamSize"
                type="number"
                value={addFormData.teamSize}
                onChange={(e) => setAddFormData({ ...addFormData, teamSize: parseInt(e.target.value) || 1 })}
                min="1"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daysWorked" className="text-xs">Days Worked</Label>
              <Input
                id="daysWorked"
                type="number"
                value={addFormData.daysWorked}
                onChange={(e) => setAddFormData({ ...addFormData, daysWorked: parseFloat(e.target.value) || 1 })}
                min="0.5"
                step="0.5"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hoursPerDay" className="text-xs">Hours/Day</Label>
              <Input
                id="hoursPerDay"
                type="number"
                value={addFormData.hoursPerDay}
                onChange={(e) => setAddFormData({ ...addFormData, hoursPerDay: parseInt(e.target.value) || 1 })}
                min="1"
                max="24"
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workType" className="text-xs">Work Type</Label>
              <Input
                id="workType"
                value={addFormData.workType}
                onChange={(e) => setAddFormData({ ...addFormData, workType: e.target.value })}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs">Location</Label>
              <Input
                id="location"
                value={addFormData.location}
                onChange={(e) => setAddFormData({ ...addFormData, location: e.target.value })}
                required
                className="h-9"
              />
            </div>
            <Button type="submit" className="h-9">
              Add Period
            </Button>
          </div>
        </form>

        {/* Edit Dialog */}
        <Dialog
          open={dialogOpen && editingPeriod !== null}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPeriod(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Work Period</DialogTitle>
            </DialogHeader>
            {editingPeriod && (
              <EditWorkPeriodForm
                key={editingPeriod.id}
                period={editingPeriod}
                hourlySalary={project.hourlySalary}
                onUpdatePeriod={onUpdatePeriod}
                onClose={() => {
                  setDialogOpen(false);
                  setEditingPeriod(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <VirtualTable
          rows={sortedWorkPeriods}
          columns={columns}
          rowKey={(p) => p.id}
          rowHeight={64}
          maxBodyHeight={560}
          getRowClassName={(p) => (p.archived ? "opacity-50 bg-muted/30" : "")}
          empty="No work periods added yet"
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete work period?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the period from {formatDate(confirmDelete?.date || project.workPeriods[0]?.date || new Date().toISOString().slice(0,10))} and its attached images. This action cannot be undone.
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
