import { useState, useRef, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Loader2, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { uploadApi } from '@/api/uploadApi';
import { toast } from 'react-hot-toast';

interface Step {
  stepNumber: number;
  description: string;
  imageKey?: string;  // S3 key, not signed URL
  caption?: string;
}

interface StepEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) return imagePath;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/')) return `http://localhost:3000${imagePath}`;
  return imagePath;
};

const StepEditor = ({ steps, onChange }: StepEditorProps) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Set<number>>(new Set());

  // Load signed URLs for existing images
  useEffect(() => {
    const loadExistingImages = async () => {
      const newLoadingSet = new Set<number>();
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        // Only load if imageKey exists and we don't already have a preview
        if (step.imageKey && !previews[i]) {
          newLoadingSet.add(i);
          setLoadingPreviews(prev => new Set([...prev, i]));
          
          try {
            const signedUrl = await uploadApi.getSignedUrl(step.imageKey);
            setPreviews(prev => ({ ...prev, [i]: signedUrl }));
          } catch (error) {
            console.error(`Failed to load image for step ${i}:`, error);
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
  }, [steps.map(s => s.imageKey).join(',')]); // Re-run when imageKeys change

  const addStep = () => {
    const newStep: Step = {
      stepNumber: steps.length + 1,
      description: '',
      imageKey: '',
      caption: '',
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    const renumbered = newSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    onChange(renumbered);
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
      const newPreviews = { ...previews };
      delete newPreviews[index];
      setPreviews(newPreviews);
    }
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange(newSteps);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      console.log('📤 Uploading image:', file.name, file.type, file.size);
      setUploadingIndex(index);
      
      // Create local preview immediately for better UX
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [index]: previewUrl }));
      console.log('✓ Local preview created');
      
      // Upload to S3
      console.log('📡 Calling upload API...');
      const response = await uploadApi.uploadStepImage(file);
      console.log('✓ Upload response:', response);
      
      if (response.data) {
        // Store the S3 key in the database
        const imageKey = response.data.imageKey || response.data.url || '';
        console.log('✓ Image key:', imageKey);
        
        // But use the signed URL for immediate preview
        const previewUrl = response.data.signedUrl || imageKey;
        console.log('✓ Preview URL:', previewUrl);
        
        // Update step with imageKey (for database)
        updateStep(index, 'imageKey', imageKey);
        
        // But keep the signed URL in preview for immediate display
        setPreviews(prev => ({ ...prev, [index]: previewUrl }));
        
        toast.success('Image uploaded successfully');
      } else {
        console.error('❌ No data in response');
        toast.error('Upload failed - no data returned');
      }
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clean up preview on error
      if (previews[index]) {
        URL.revokeObjectURL(previews[index]);
      }
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[index];
        return newPreviews;
      });
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
    // Only open file dialog if clicking directly on the dropzone, not when focusing for paste
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.dropzone-content')) {
      document.getElementById(`image-upload-${index}`)?.click();
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDrop = async (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type.startsWith('image/')) {
      await handleImageUpload(index, file);
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
    updateStep(index, 'imageKey', '');
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
          Steps to Reproduce
        </label>
        <Button type="button" size="sm" variant="ghost" onClick={addStep}>
          <Plus className="w-4 h-4 mr-1" />
          Add Step
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const currentImage = previews[index] || (step.imageKey ? getImageUrl(step.imageKey) : '');
          
          return (
            <Card key={index} className="p-4 bg-surface border-outline-variant">
              <div className="space-y-4">
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded">
                    Step {step.stepNumber}
                  </span>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(index)}
                      className="text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Step Description */}
                <div>
                  <label className="text-xs text-on-surface-variant mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(index, 'description', e.target.value)}
                    onPaste={(e) => handleImagePaste(index, e)}
                    placeholder="Describe this step... (You can paste images here)"
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm resize-none"
                  />
                </div>

                {/* Image Upload/Display */}
                <div>
                  <label className="text-xs text-on-surface-variant mb-2 block">
                    Image (Optional)
                  </label>
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
                          alt={`Step ${step.stepNumber}`}
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
                      onDragOver={handleImageDragOver}
                      onDrop={(e) => handleImageDrop(index, e)}
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
                        id={`image-upload-${index}`}
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

                {/* Caption - Always Visible */}
                <div>
                  <label className="text-xs text-on-surface-variant mb-1 block">
                    Caption
                  </label>
                  <Input
                    value={step.caption || ''}
                    onChange={(e) => updateStep(index, 'caption', e.target.value)}
                    placeholder="Add a caption for this image..."
                    className="bg-surface-low border-outline text-on-surface text-sm"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {steps.length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <p className="text-sm">No steps added yet</p>
          <Button type="button" size="sm" variant="ghost" onClick={addStep} className="mt-2">
            <Plus className="w-4 h-4 mr-1" />
            Add First Step
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepEditor;
