import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, Share2 } from 'lucide-react';

interface ExportControlsProps {
  onGenerate: (format: 'docx' | 'pdf', options: any) => void;
  generating: boolean;
  disabled: boolean;
}

const ExportControls = ({ onGenerate, generating, disabled }: ExportControlsProps) => {
  const [uploadToDrive, setUploadToDrive] = useState(false);
  const [shareWithClient, setShareWithClient] = useState(false);
  const [clientEmail, setClientEmail] = useState('');

  const handleGenerate = (format: 'docx' | 'pdf') => {
    onGenerate(format, {
      upload_to_drive: uploadToDrive,
      share_with_client: shareWithClient,
      client_email: shareWithClient ? clientEmail : undefined,
    });
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <h3 className="text-sm font-semibold text-on-surface mb-4">Export Controls</h3>

      <div className="space-y-4">
        {/* Export Format */}
        <div>
          <label className="text-xs text-on-surface-variant mb-2 block">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleGenerate('pdf')}
              disabled={disabled || generating}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={() => handleGenerate('docx')}
              disabled={disabled || generating}
              variant="outline"
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              DOCX
            </Button>
          </div>
        </div>

        {/* Google Drive Upload */}
        <div className="pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="upload-drive"
              checked={uploadToDrive}
              onChange={(e) => setUploadToDrive(e.target.checked)}
              className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="upload-drive" className="text-sm text-on-surface cursor-pointer">
              Upload to Google Drive
            </label>
          </div>
        </div>

        {/* Share with Client */}
        <div className="pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="share-client"
              checked={shareWithClient}
              onChange={(e) => setShareWithClient(e.target.checked)}
              disabled={!uploadToDrive}
              className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <label
              htmlFor="share-client"
              className={`text-sm cursor-pointer ${
                uploadToDrive ? 'text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              Share with Client
            </label>
          </div>

          {shareWithClient && uploadToDrive && (
            <Input
              type="email"
              placeholder="client@company.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="bg-surface border-outline text-on-surface text-sm"
            />
          )}
        </div>

        {/* Additional Actions */}
        <div className="pt-4 border-t border-outline-variant">
          <Button
            variant="outline"
            className="w-full border-outline text-on-surface-variant hover:text-primary"
            disabled={disabled}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Save to Google Drive
          </Button>
        </div>
      </div>

      {generating && (
        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-xs text-primary text-center">Generating report...</p>
        </div>
      )}
    </Card>
  );
};

export default ExportControls;
