import { useState, useRef, useEffect } from 'react';
import { Plus, X, Loader2, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { uploadApi } from '@/api/uploadApi';
import { toast } from 'react-hot-toast';

interface EvidenceItem {
  imageKey?: string;
  caption?: string;
}

interface EvidenceItemEditorProps {
  items: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
}

const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) return imagePath;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/')) return `http://localhost:3000${imagePath}`;
  return imagePath;
};

const EvidenceItemEditor = ({ items, onChange }: EvidenceItemEditorProps) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadExistingImages = async () => {
      const newLoadingSet = new Set<number>();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.imageKey && !previews[i]) {
          newLoadingSet.add(i);
          setLoadingPreviews(prev => new Set([...prev, i]));
          try {
            const signedUrl = await uploadApi.getSignedUrl(item.imageKey);
            setPreviews(prev => ({ ...prev, [i]: signedUrl }));
          } catch (error) {
            console.error(`Failed to load image for item ${i}:`, error);
          } finally {
            setLoadingPreviews(prev => {
              const newSet = new Set(prev);
              newSet.delete(i);
              return newSet;
            });
          }
        }
      }
    };
    loadExistingImages();
  }, [items.map(s => s.imageKey).join(',')]);

  const addItem = () => {
    const newItem: EvidenceItem = { imageKey: '', caption: '' };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
      const newPreviews = { ...previews };
      delete newPreviews[index];
      setPreviews(newPreviews);
    }
  };

  const updateItem = (index: number, field: 'imageKey' | 'caption', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIndex(index);
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [index]: previewUrl }));
      const response = await uploadApi.uploadStepImage(file);
      if (response.data) {
        const imageKey = response.data.imageKey || response.data.url || '';
        const previewUrl = response.data.signedUrl || imageKey;
        updateItem(index, 'imageKey', imageKey);
        setPreviews(prev => ({ ...prev, [index]: previewUrl }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      if (previews[index]) {
        URL.revokeObjectURL(previews[index]);
      }
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[index];
        return newPreviews;
      });
      toast.error('Failed to upload image');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleImagePaste = async (index: number, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          await handleImageUpload(index, file);
          break;
        }
      }
    }
  };

  const handleDropzoneClick = (index: number, e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.dropzone-content')) {
      document.getElementById(`evidence-image-${index}`)?.click();
    }
  };

  const removeImage = (index: number) => {
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[index];
        return newPreviews;
      });
    }
    updateItem(index, 'imageKey', '');
  };

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-on-surface">
          Evidence Items
        </label>
        <Button type="button" size="sm" variant="ghost" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" />
          Add Evidence
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const currentImage = previews[index] || (item.imageKey ? getImageUrl(item.imageKey) : '');
          return (
            <Card key={index} className="p-4 bg-surface border-outline-variant">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded">
                    Evidence #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      className="text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-xs text-on-surface-variant mb-2 block">Image (Optional)</label>
                  {uploadingIndex === index || loadingPreviews.has(index) ? (
                    <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center">
                      <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                      <p className="text-xs text-on-surface-variant">
                        {uploadingIndex === index ? 'Uploading image...' : 'Loading image...'}
                      </p>
                    </div>
                  ) : currentImage ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border border-outline-variant bg-surface-low">
                        <img
                          src={currentImage}
                          alt={`Evidence ${index + 1}`}
                          className="w-full max-h-80 object-contain"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-surface/90 text-error hover:bg-error/20 rounded-full p-1.5"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      tabIndex={0}
                      className="border-2 border-dashed border-outline-variant rounded-lg p-6 text-center hover:border-primary/50 focus:border-primary focus:outline-none transition-colors cursor-pointer"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const files = e.dataTransfer?.files;
                        if (files && files[0]?.type.startsWith('image/')) {
                          await handleImageUpload(index, files[0]);
                        }
                      }}
                      onPaste={(e) => handleImagePaste(index, e)}
                      onClick={(e) => handleDropzoneClick(index, e)}
                      role="button"
                      aria-label="Upload, drag and drop, or paste image"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(index, file);
                        }}
                        className="hidden"
                        id={`evidence-image-${index}`}
                      />
                      <div className="dropzone-content flex flex-col items-center gap-2">
                        <div className="p-3 bg-surface rounded-full">
                          <Upload className="w-6 h-6 text-on-surface-variant" />
                        </div>
                        <div className="text-on-surface-variant">
                          <p className="text-sm font-medium">Click to upload or paste here (Ctrl+V)</p>
                          <p className="text-xs mt-1">You can also drag & drop</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-on-surface-variant mb-1 block">Caption</label>
                  <Input
                    value={item.caption || ''}
                    onChange={(e) => updateItem(index, 'caption', e.target.value)}
                    placeholder="Add a caption for this image..."
                    className="bg-surface-low border-outline text-on-surface text-sm"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <p className="text-sm">No evidence items added yet</p>
          <Button type="button" size="sm" variant="ghost" onClick={addItem} className="mt-2">
            <Plus className="w-4 h-4 mr-1" />
            Add First Evidence Item
          </Button>
        </div>
      )}
    </div>
  );
};

export default EvidenceItemEditor;
