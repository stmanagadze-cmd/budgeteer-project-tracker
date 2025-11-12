import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface WorkPeriodsProps {
  project: Project;
  onAddPeriod: (period: Omit<WorkPeriod, "id">) => void;
  onDeletePeriod: (periodId: string) => void;
}

const WorkPeriods = ({ project, onAddPeriod, onDeletePeriod }: WorkPeriodsProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    teamSize: 1,
    daysWorked: 1,
    hoursPerDay: 8,
    workType: "Development",
    location: "Office",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalHours = formData.teamSize * formData.daysWorked * formData.hoursPerDay;
    const periodCost = totalHours * project.hourlySalary;

    onAddPeriod({
      ...formData,
      totalHours,
      periodCost,
    });

    toast({
      title: "Work period added",
      description: `Added ${totalHours} hours to the project.`,
    });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Periods</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
          <Button type="submit" className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            Add Period
          </Button>
        </form>

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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.workPeriods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeletePeriod(period.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
