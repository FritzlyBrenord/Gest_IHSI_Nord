'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface UploadedImage {
  url: string;
  name: string;
  size: number;
}

interface DocumentImageUploadProps {
  onImageUploaded: (image: UploadedImage) => void;
  disabled?: boolean;
}

export function DocumentImageUpload({ onImageUploaded, disabled = false }: DocumentImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onImageUploaded({
        url: data.url,
        name: file.name,
        size: file.size,
      });
      toast({ title: 'Image ajoutée', description: file.name });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erreur', description: 'Échec de l\'upload de l\'image', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className="rounded-lg"
      >
        <ImageIcon className="w-4 h-4 mr-1.5" />
        {isUploading ? 'Upload...' : 'Ajouter image'}
      </Button>
    </>
  );
}
