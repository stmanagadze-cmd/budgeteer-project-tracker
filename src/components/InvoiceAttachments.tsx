import { useRef, useState, useEffect } from "react";
import { InvoiceAttachment } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileImage, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceAttachmentsProps {
  invoiceId: string;
  attachments: InvoiceAttachment[];
  onUpload: (file: File, description?: string) => void;
  onDelete: (attachment: InvoiceAttachment) => void;
}

export const InvoiceAttachments = ({
  invoiceId,
  attachments,
  onUpload,
  onDelete,
}: InvoiceAttachmentsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const attachment of attachments) {
        try {
          const { data, error } = await supabase.storage
            .from('invoice-attachments')
            .createSignedUrl(attachment.file_path, 3600);

          if (error) throw error;
          if (data?.signedUrl) {
            urls[attachment.id] = data.signedUrl;
          }
        } catch (error) {
          console.error("Error fetching signed URL:", error);
        }
      }
      
      setSignedUrls(urls);
    };

    if (attachments.length > 0) {
      fetchSignedUrls();
    }
  }, [attachments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      onUpload(file, descriptions[file.name]);
    });

    setDescriptions({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-8 w-8" />;
    }
    return <FileText className="h-8 w-8" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Attachments / Work Report</h3>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Attach Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/20">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No attachments yet. Click "Attach Files" to upload.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((attachment) => (
            <Card key={attachment.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-muted-foreground">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {attachment.file_name}
                    </p>
                    {attachment.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {attachment.description}
                      </p>
                    )}
                    {signedUrls[attachment.id] && attachment.file_type.startsWith('image/') && (
                      <img
                        src={signedUrls[attachment.id]}
                        alt={attachment.file_name}
                        className="mt-2 rounded border border-border max-h-32 object-cover w-full"
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attachment)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
