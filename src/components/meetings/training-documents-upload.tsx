'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface UploadedTrainingDocument {
  id: string;
  key: string;
  url: string;
  appUrl: string;
  ufsUrl: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export function TrainingDocumentsUpload({
  pendingFiles,
  onPendingFilesChange,
  disabled = false,
}: {
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const handleSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const existing = new Map(pendingFiles.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      for (const file of selectedFiles) {
        existing.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      }
    onPendingFilesChange(Array.from(existing.values()));
    setPickerKey((current) => current + 1);
  };

  const removePendingFile = (fileToRemove: File) => {
    onPendingFilesChange(pendingFiles.filter((file) => file !== fileToRemove));
  };

  const clearPendingFiles = () => {
    onPendingFilesChange([]);
  };

  return (
    <div className="space-y-3">
      <Input
        key={pickerKey}
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
        onChange={handleSelection}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Paperclip className="mr-2 h-4 w-4" /> Choisir
        </Button>
        <Button type="button" variant="ghost" onClick={clearPendingFiles} disabled={disabled || pendingFiles.length === 0}>
          Annuler
        </Button>
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          {pendingFiles.map((file) => (
            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} Ko · En attente</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removePendingFile(file)} disabled={disabled}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
