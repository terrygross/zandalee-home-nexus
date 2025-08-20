
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';

export const DocsPane = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const { upload, listDocs } = useGateway();
  const { toast } = useToast();

  const loadDocs = useCallback(async () => {
    try {
      const docList = await listDocs();
      setDocs(docList);
    } catch (error: any) {
      console.error('Failed to load docs:', error);
    }
  }, [listDocs]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    const fileArray = Array.from(files);
    setLoading(true);

    try {
      await upload(fileArray);
      toast({
        title: 'Upload Successful',
        description: `${fileArray.length} file(s) uploaded successfully`
      });
      
      // Reload the docs list
      await loadDocs();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-muted-foreground mb-4">
              or click to select files
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline" disabled={loading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {loading ? 'Uploading...' : 'Select Files'}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name || `Document ${index + 1}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.size ? formatFileSize(doc.size) : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
