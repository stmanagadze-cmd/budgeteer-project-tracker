import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleCards: Record<string, boolean>;
  onToggleCard: (cardKey: string) => void;
}

const SettingsSidebar = ({ open, onOpenChange, visibleCards, onToggleCard }: SettingsSidebarProps) => {
  const cardOptions = [
    { key: "totalHours", label: "Total Hours" },
    { key: "totalAccumulated", label: "Total Accumulated" },
    { key: "targetBudget", label: "Target Budget" },
    { key: "remaining", label: "Remaining" },
    { key: "progress", label: "Progress" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>App Settings</SheetTitle>
          <SheetDescription>Customize your dashboard display</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold">Individual KPI Cards</h3>
          <div className="space-y-3">
            {cardOptions.map((option) => (
              <div key={option.key} className="flex items-center space-x-2">
                <Checkbox
                  id={option.key}
                  checked={visibleCards[option.key]}
                  onCheckedChange={() => onToggleCard(option.key)}
                />
                <Label
                  htmlFor={option.key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsSidebar;
