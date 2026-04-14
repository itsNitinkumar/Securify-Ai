import { useState } from 'react';
import { projectApi, CreateProjectData } from '@/api/projectApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    client_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await projectApi.createProject(formData);
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        client_name: '',
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface">Create New Project</DialogTitle>
          <DialogDescription>Fill in the details to create a new security assessment project.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Project Name */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Project Name <span className="text-error">*</span>
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q3 2024 Infrastructure Pentest"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Client Name */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Client Name
            </label>
            <Input
              value={formData.client_name || ''}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="e.g., Acme Corporation"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Comprehensive security assessment of network perimeter, cloud assets, and identity access management..."
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-outline text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
