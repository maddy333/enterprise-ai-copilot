import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface UploadedFile {
    id: string;
    title: string;
    status: string;
    created_at: string;
}

interface DocumentManagerProps {
    onClose: () => void;
}

export function DocumentManager({ onClose }: DocumentManagerProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/documents/');
            setFiles(res.data);
        } catch (err) {
            console.error("Failed to load documents", err);
        }
    };

    React.useEffect(() => {
        fetchDocuments();
        const interval = setInterval(fetchDocuments, 5000); // Polling for status updates
        return () => clearInterval(interval);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', selectedFiles[0]);

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchDocuments();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload document');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-card w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-gray-200 dark:border-border">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-border">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-foreground">Knowledge Base</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-input rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-muted-foreground" />
                    </button>
                </div>

                {/* Upload Area */}
                <div className="p-6">
                    <div
                        className="border-2 border-dashed border-gray-300 dark:border-muted-foreground rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-input transition-colors group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                            {uploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <UploadCloud className="w-8 h-8 text-primary" />}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-muted-foreground mt-2">PDF, DOCX, or TXT up to 50MB</p>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept=".pdf,.txt,.docx"
                            onChange={handleFileChange}
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-muted-foreground mb-4 uppercase tracking-wider">Uploaded Documents</h3>
                    {files.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet.</p>
                    )}
                    {files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-input rounded-xl border border-gray-100 dark:border-border border-transparent hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <File className="w-8 h-8 text-primary/70" />
                                <div>
                                    <p className="font-medium text-sm text-gray-900 dark:text-foreground line-clamp-1">{file.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-muted-foreground">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {file.status === 'ready' || file.status === 'READY' ? (
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                                        <CheckCircle className="w-3.5 h-3.5" /> Ready
                                    </span>
                                ) : file.status === 'failed' || file.status === 'FAILED' ? (
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">
                                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
