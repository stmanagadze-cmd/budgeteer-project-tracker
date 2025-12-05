import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Palette, Type, Layout } from "lucide-react";

export interface TemplateConfig {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  layout: "classic" | "modern" | "compact";
  showLogo: boolean;
  showCompanyDetails: boolean;
  showClientDetails: boolean;
  headerStyle: "full" | "minimal";
}

const defaultConfig: TemplateConfig = {
  primaryColor: "#2563eb",
  accentColor: "#f97316",
  fontFamily: "Inter",
  fontSize: "medium",
  layout: "classic",
  showLogo: true,
  showCompanyDetails: true,
  showClientDetails: true,
  headerStyle: "full",
};

interface InvoiceTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (config: TemplateConfig) => void;
  attachmentCount: number;
  isLoading?: boolean;
}

export function InvoiceTemplateDialog({
  open,
  onOpenChange,
  onDownload,
  attachmentCount,
  isLoading = false,
}: InvoiceTemplateDialogProps) {
  const [config, setConfig] = useState<TemplateConfig>(defaultConfig);

  const handleDownload = () => {
    onDownload(config);
  };

  const updateConfig = (key: keyof TemplateConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const presetColors = [
    { name: "Blue", primary: "#2563eb", accent: "#f97316" },
    { name: "Green", primary: "#059669", accent: "#0891b2" },
    { name: "Purple", primary: "#7c3aed", accent: "#ec4899" },
    { name: "Dark", primary: "#1f2937", accent: "#6b7280" },
    { name: "Orange", primary: "#ea580c", accent: "#0284c7" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Configure Invoice PDF
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-1">
              <Layout className="h-4 w-4" />
              Layout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Color Presets</Label>
              <div className="flex gap-2 flex-wrap">
                {presetColors.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      updateConfig("primaryColor", preset.primary);
                      updateConfig("accentColor", preset.accent);
                    }}
                    className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.accent }}
                    />
                    <span className="text-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig("primaryColor", e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig("primaryColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="accentColor"
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => updateConfig("accentColor", e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => updateConfig("accentColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="fontFamily">Font Family</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(value) => updateConfig("fontFamily", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter (Modern)</SelectItem>
                  <SelectItem value="Arial">Arial (Classic)</SelectItem>
                  <SelectItem value="Georgia">Georgia (Elegant)</SelectItem>
                  <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman (Traditional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Select
                value={config.fontSize}
                onValueChange={(value: any) => updateConfig("fontSize", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (Compact)</SelectItem>
                  <SelectItem value="medium">Medium (Standard)</SelectItem>
                  <SelectItem value="large">Large (Easy Read)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="layout">Invoice Layout</Label>
              <Select
                value={config.layout}
                onValueChange={(value: any) => updateConfig("layout", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic (Traditional)</SelectItem>
                  <SelectItem value="modern">Modern (Clean Lines)</SelectItem>
                  <SelectItem value="compact">Compact (Space Efficient)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="headerStyle">Header Style</Label>
              <Select
                value={config.headerStyle}
                onValueChange={(value: any) => updateConfig("headerStyle", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full (All Details)</SelectItem>
                  <SelectItem value="minimal">Minimal (Essential Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="showLogo">Show Company Logo</Label>
                <Switch
                  id="showLogo"
                  checked={config.showLogo}
                  onCheckedChange={(checked) => updateConfig("showLogo", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showCompanyDetails">Show Company Details</Label>
                <Switch
                  id="showCompanyDetails"
                  checked={config.showCompanyDetails}
                  onCheckedChange={(checked) => updateConfig("showCompanyDetails", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showClientDetails">Show Client Details</Label>
                <Switch
                  id="showClientDetails"
                  checked={config.showClientDetails}
                  onCheckedChange={(checked) => updateConfig("showClientDetails", checked)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {attachmentCount > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 mt-2">
            <p className="text-sm text-muted-foreground">
              📎 {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""} will be included in a ZIP file with the invoice PDF.
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isLoading}>
            {isLoading ? (
              <>Generating...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {attachmentCount > 0 ? "Download ZIP" : "Download PDF"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
