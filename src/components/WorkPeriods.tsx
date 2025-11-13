import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, Upload, X } from "lucide-react";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface WorkPeriodsProps {
  project: Project;
  onAddPeriod: (period: Omit<WorkPeriod, "id">) => void;
  onUpdatePeriod: (periodId: string, period: Partial<WorkPeriod>) => void;
  onDeletePeriod: (periodId: string) => void;
  onUploadImage: (periodId: string, file: File) => Promise<string | null>;
  onDeleteImage: (periodId: string, imageUrl: string) => Promise<void>;
}

const WorkPeriods = ({ 
  project, 
  onAddPeriod, 
  onUpdatePeriod,
  onDeletePeriod,
  onUploadImage,
  onDeleteImage 
}: WorkPeriodsProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPeriod, setEditingPeriod] = useState<WorkPeriod | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    teamSize: 1,
    daysWorked: 1,
    hoursPerDay: 8,
    workType: "Development",
    location: "Office",
  });
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = formData.teamSize * formData.daysWorked * formData.hoursPerDay;
    const periodCost = totalHours * project.hourlySalary;

    if (editingPeriod) {
      onUpdatePeriod(editingPeriod.id, {
        ...formData,
        totalHours,
        periodCost,
      });
      toast({
        title: "Work period updated",
        description: `Updated work period with ${totalHours} hours.`,
      });
      setEditingPeriod(null);
      setDialogOpen(false);
    } else {
      onAddPeriod({
        ...formData,
        totalHours,
        periodCost,
        images: [],
      });
      toast({
        title: "Work period added",
        description: `Added ${totalHours} hours to the project.`,
      });
    }

    // Reset form
    setFormData({
      date: new Date().toISOString().split("T")[0],
      teamSize: 1,
      daysWorked: 1,
      hoursPerDay: 8,
      workType: "Development",
      location: "Office",
    });
  };

  const handleEdit = (period: WorkPeriod) => {
    setEditingPeriod(period);
    setFormData({
      date: period.date,
      teamSize: period.teamSize,
      daysWorked: period.daysWorked,
      hoursPerDay: period.hoursPerDay,
      workType: period.workType,
      location: period.location,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (periodId: string, files: FileList | null) => {
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
  };

  const handleRemoveImage = async (periodId: string, imageUrl: string) => {
    const period = project.workPeriods.find(p => p.id === periodId);
    if (!period) return;

    await onDeleteImage(periodId, imageUrl);
    const updatedImages = period.images.filter(img => img !== imageUrl);
    onUpdatePeriod(periodId, { images: updatedImages });

    toast({
      title: "Image removed",
      description: "Image has been removed successfully.",
    });
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamSize">Team Size</Label>
          <Input
            id="teamSize"
            type="number"
            value={formData.teamSize}
            onChange={(e) => setFormData({ ...formData, teamSize: parseInt(e.target.value) || 1 })}
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="daysWorked">Days Worked</Label>
          <Input
            id="daysWorked"
            type="number"
            value={formData.daysWorked}
            onChange={(e) => setFormData({ ...formData, daysWorked: parseInt(e.target.value) || 1 })}
            min="0.5"
            step="0.5"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hoursPerDay">Hours/Day</Label>
          <Input
            id="hoursPerDay"
            type="number"
            value={formData.hoursPerDay}
            onChange={(e) => setFormData({ ...formData, hoursPerDay: parseInt(e.target.value) || 1 })}
            min="1"
            max="24"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workType">Work Type</Label>
          <Input
            id="workType"
            value={formData.workType}
            onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        {editingPeriod ? "Update Period" : "Add Period"}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Periods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Dialog open={dialogOpen && editingPeriod === null} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPeriod(null);
              setFormData({
                date: new Date().toISOString().split("T")[0],
                teamSize: 1,
                daysWorked: 1,
                hoursPerDay: 8,
                workType: "Development",
                location: "Office",
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">Add Period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Work Period</DialogTitle>
              </DialogHeader>
              <FormContent />
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen && editingPeriod !== null} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPeriod(null);
              setFormData({
                date: new Date().toISOString().split("T")[0],
                teamSize: 1,
                daysWorked: 1,
                hoursPerDay: 8,
                workType: "Development",
                location: "Office",
              });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Work Period</DialogTitle>
              </DialogHeader>
              <FormContent />
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Hrs/Day</TableHead>
                <TableHead>Total Hrs</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Period Cost</TableHead>
                <TableHead>Images</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.workPeriods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No work periods added yet
                  </TableCell>
                </TableRow>
              ) : (
                project.workPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>{new Date(period.date).toLocaleDateString()}</TableCell>
                    <TableCell>{period.teamSize}</TableCell>
                    <TableCell>{period.daysWorked}</TableCell>
                    <TableCell>{period.hoursPerDay}</TableCell>
                    <TableCell className="font-medium">{period.totalHours}</TableCell>
                    <TableCell>{period.workType}</TableCell>
                    <TableCell>{period.location}</TableCell>
                    <TableCell className="font-medium">${period.periodCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageUpload(period.id, e.target.files)}
                          id={`file-${period.id}`}
                        />
                        <label htmlFor={`file-${period.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingImages[period.id]}
                            asChild
                          >
                            <span className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-1" />
                              {uploadingImages[period.id] ? "Uploading..." : "Upload"}
                            </span>
                          </Button>
                        </label>
                        {period.images && period.images.length > 0 && (
                          <div className="flex gap-1">
                            {period.images.map((imageUrl, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`Period ${idx + 1}`}
                                  className="h-10 w-10 object-cover rounded cursor-pointer"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveImage(period.id, imageUrl)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(period)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeletePeriod(period.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkPeriods;
