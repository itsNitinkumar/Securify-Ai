import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, Image, Trash2 } from 'lucide-react';

interface EvidenceVaultProps {
  findingId: number;
}

const EvidenceVault = ({ findingId }: EvidenceVaultProps) => {
  const [files, setFiles] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // File upload logic here
    console.log('Upload files:', e.target.files);
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Evidence Vault</h3>
        <label htmlFor="file-upload">
          <Button
            as="span"
            size="sm"
            className="bg-primary text-surface hover:bg-primary/90 cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-outline-variant rounded-lg">
          <Upload className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
          <p className="text-sm text-on-surface-variant mb-2">No evidence files uploaded</p>
          <p className="text-xs text-on-surface-variant">
            Upload screenshots, logs, or other evidence
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {file.type.startsWith('image/') ? (
                  <Image className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <File className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error/80 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default EvidenceVault;
