import { useState } from 'react';
import { Plus, X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { uploadApi } from '@/api/uploadApi';
import { toast } from 'react-hot-toast';

interface Step {
  stepNumber: number;
  description: string;
  image?: string;
  caption?: string;
}

interface StepEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

const StepEditor = ({ steps, onChange }: StepEditorProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const addStep = () => {
    const newStep: Step = {
      stepNumber: steps.length + 1,
      description: '',
      image: '',
      caption: '',
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    onChange(renumbered);
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange(newSteps);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIndex(index);
      const response = await uploadApi.uploadStepImage(file);
      if (response.data) {
        updateStep(index, 'image', response.data.url);
        toast.success('Image uploaded');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
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
          await handleImageUpload(index, file);
          break;
        }
      }
    }
  };

  const removeImage = (index: number) => {
    updateStep(index, 'image', '');
    updateStep(index, 'caption', '');
  };

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
        {steps.map((step, index) => (
          <Card key={index} className="p-4 bg-surface border-outline-variant">
            <div className="space-y-3">
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
                    className="text-error"
                  >
                    <X className="w-4 h-4" />
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
                  className="w-full px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm"
                />
              </div>

              {/* Image Upload/Display */}
              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">
                  Image (Optional)
                </label>
                {uploadingIndex === index ? (
                  <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center">
                    <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                    <p className="text-xs text-on-surface-variant">Uploading image...</p>
                  </div>
                ) : step.image ? (
                  <div className="space-y-2">
                    <div className="relative inline-block">
                      <img
                        src={step.image.startsWith('/') ? `http://localhost:3000${step.image}` : step.image}
                        alt={`Step ${step.stepNumber}`}
                        className="max-h-48 rounded border border-outline-variant"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-surface/90 text-error hover:bg-surface"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-outline-variant rounded-lg p-4 text-center">
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
                    <label
                      htmlFor={`image-upload-${index}`}
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <ImageIcon className="w-8 h-8 text-on-surface-variant" />
                      <p className="text-xs text-on-surface-variant">
                        Click to upload or paste image
                      </p>
                    </label>
                  </div>
                )}
              </div>

              {/* Image Caption */}
              {step.image && (
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
              )}
            </div>
          </Card>
        ))}
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
