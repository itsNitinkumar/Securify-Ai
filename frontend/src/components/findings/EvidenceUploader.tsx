import { useState, useCallback, useEffect } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { evidenceApi, Evidence } from '@/api/evidenceApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface EvidenceUploaderProps {
    findingId: number;
    onUploadComplete?: () => void;
}

interface UploadingFile {
    file: File;
    progress: number;
    caption: string;
}

const EvidenceUploader = ({ findingId, onUploadComplete }: EvidenceUploaderProps) => {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [uploadedEvidence, setUploadedEvidence] = useState<Evidence[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteEvidenceId, setConfirmDeleteEvidenceId] = useState<number | null>(null);

    // Load existing evidence when component mounts
    useEffect(() => {
        const loadEvidence = async () => {
            try {
                setLoading(true);
                const response = await evidenceApi.getByFinding(findingId);
                if (response.data.data) {
                    setUploadedEvidence(response.data.data);
                }
            } catch (error) {
                console.error('Failed to load evidence:', error);
            } finally {
                setLoading(false);
            }
        };

        if (findingId) {
            loadEvidence();
        }
    }, [findingId]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            handleFiles(files);
        }
    };

    const handleFiles = (files: File[]) => {
        const newFiles = files.map(file => ({
            file,
            progress: 0,
            caption: '',
        }));

        setUploadingFiles(prev => [...prev, ...newFiles]);

        // Upload each file
        newFiles.forEach((fileData, index) => {
            uploadFile(fileData, uploadingFiles.length + index);
        });
    };

    const uploadFile = async (fileData: UploadingFile, index: number) => {
        try {
            // Simulate progress (in real app, use XMLHttpRequest for progress)
            setUploadingFiles(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], progress: 50 };
                return updated;
            });

            const response = await evidenceApi.upload(findingId, fileData.file, fileData.caption);

            setUploadingFiles(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], progress: 100 };
                return updated;
            });

            // Add to uploaded list
            if (response.data.data) {
                setUploadedEvidence(prev => [...prev, response.data.data!]);
            }

            // Remove from uploading after a delay
            setTimeout(() => {
                setUploadingFiles(prev => prev.filter((_, i) => i !== index));
            }, 1000);

            onUploadComplete?.();
        } catch (error) {
            console.error('Failed to upload file:', error);
            toast.error(`Failed to upload ${fileData.file.name}`);
            setUploadingFiles(prev => prev.filter((_, i) => i !== index));
        }
    };

    const removeUploadingFile = (index: number) => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const deleteEvidence = async (id: number) => {
        try {
            await evidenceApi.delete(id);
            setUploadedEvidence(prev => prev.filter(e => e.id !== id));
            setConfirmDeleteEvidenceId((current) => (current === id ? null : current));
        } catch (error) {
            console.error('Failed to delete evidence:', error);
            toast.error('Failed to delete evidence');
        }
    };

    const getFileIcon = (fileName?: string) => {
        if (!fileName) return <File className="w-5 h-5" />;
        
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
            return <Image className="w-5 h-5" />;
        }
        if (['txt', 'log', 'xml', 'json'].includes(ext || '')) {
            return <FileText className="w-5 h-5" />;
        }
        return <File className="w-5 h-5" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:border-outline'
                    }`}
            >
                <Upload className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
                <p className="text-sm text-on-surface mb-2">
                    Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                    Supports: Images, Logs, PDFs, Scan Results (Nessus, Nuclei, Burp)
                </p>
                <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.txt,.log,.xml,.json,.pdf,.nessus,.html"
                />
                <label htmlFor="file-upload">
                    <Button type="button" variant="ghost" className="cursor-pointer" asChild>
                        <span>Browse Files</span>
                    </Button>
                </label>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-4">
                    <p className="text-sm text-on-surface-variant">Loading evidence...</p>
                </div>
            )}

            {/* Uploading Files */}
            {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-on-surface">Uploading...</h4>
                    {uploadingFiles.map((fileData, index) => (
                        <Card key={index} className="p-3 bg-surface border-outline-variant">
                            <div className="flex items-center gap-3">
                                {getFileIcon(fileData.file.name)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-on-surface truncate">{fileData.file.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${fileData.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-on-surface-variant">
                                            {fileData.progress}%
                                        </span>
                                    </div>
                                </div>
                                {fileData.progress < 100 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeUploadingFile(index)}
                                        className="text-error"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Uploaded Evidence */}
            {!loading && uploadedEvidence.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-on-surface">Uploaded Evidence</h4>
                    {uploadedEvidence.map((evidence) => (
                        <Card key={evidence.id} className="p-3 bg-surface border-outline-variant">
                            <div className="flex items-center gap-3">
                                {getFileIcon(evidence.file_name)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-on-surface truncate">{evidence.file_name || 'Unknown file'}</p>
                                    <p className="text-xs text-on-surface-variant">
                                        {formatFileSize(evidence.file_size || 0)}
                                    </p>
                                    {evidence.caption && (
                                        <p className="text-xs text-on-surface-variant mt-1 italic">
                                            "{evidence.caption}"
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmDeleteEvidenceId(evidence.id)}
                                    className="text-error"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {confirmDeleteEvidenceId === evidence.id ? (
                              <div className="mt-3">
                                <InlineConfirm
                                  danger
                                  title="Delete evidence?"
                                  description="This will remove the uploaded file from this finding."
                                  confirmText="Delete"
                                  onCancel={() => setConfirmDeleteEvidenceId(null)}
                                  onConfirm={() => void deleteEvidence(evidence.id)}
                                />
                              </div>
                            ) : null}
                        </Card>
                    ))}
                </div>
            )}

            {/* No Evidence Message */}
            {!loading && uploadedEvidence.length === 0 && uploadingFiles.length === 0 && (
                <div className="text-center py-4">
                    <p className="text-sm text-on-surface-variant">No evidence uploaded yet</p>
                </div>
            )}
        </div>
    );
};

export default EvidenceUploader;
