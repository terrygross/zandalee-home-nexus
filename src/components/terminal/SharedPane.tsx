import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { 
  SharedChatMessage, 
  SharedChatResponse, 
  SharedChatRequest,
  SharedDocument,
  SharedDocsResponse,
  SharedUploadResponse,
  SharedDeleteRequest
} from '@/types/auth';
import { MessageSquare, Upload, FileText, Trash2, Download, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SharedPane() {
  const { user } = useSession();
  const { toast } = useToast();
  const [sharedMessages, setSharedMessages] = useState<SharedChatMessage[]>([]);
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadSharedChat = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/shared/chat`, {
        headers: {
          'X-User': user.familyName
        }
      });

      const data: SharedChatResponse = await response.json();
      
      if (data.ok && data.messages) {
        setSharedMessages(data.messages);
      } else {
        throw new Error(data.error || 'Failed to load shared chat');
      }
    } catch (error) {
      console.error('Load shared chat error:', error);
      toast({
        title: "Error",
        description: "Failed to load shared chat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSharedDocs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/shared/docs`, {
        headers: {
          'X-User': user.familyName
        }
      });

      const data: SharedDocsResponse = await response.json();
      
      if (data.ok && data.docs) {
        setSharedDocs(data.docs);
      } else {
        throw new Error(data.error || 'Failed to load shared documents');
      }
    } catch (error) {
      console.error('Load shared docs error:', error);
      toast({
        title: "Error",
        description: "Failed to load shared documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/shared/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName
        },
        body: JSON.stringify({ content: newMessage.trim() } as SharedChatRequest)
      });

      const data = await response.json();
      
      if (data.ok) {
        setNewMessage('');
        loadSharedChat(); // Refresh the chat
        toast({
          title: "Message sent",
          description: "Your message has been posted to the family chat"
        });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive"
      });
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (!user || files.length === 0) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/shared/upload`, {
        method: 'POST',
        headers: {
          'X-User': user.familyName
        },
        body: formData
      });

      const data: SharedUploadResponse = await response.json();
      
      if (data.ok && data.files) {
        toast({
          title: "Upload successful",
          description: `Uploaded ${data.files.length} file(s) to shared space`
        });
        loadSharedDocs(); // Refresh the docs list
      } else {
        throw new Error(data.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Upload files error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (path: string) => {
    if (!user?.role || (user.role !== 'admin' && user.role !== 'superadmin')) {
      toast({
        title: "Access denied",
        description: "Only administrators can delete shared documents",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/shared/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin || ''
        },
        body: JSON.stringify({ path } as SharedDeleteRequest)
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Document deleted",
          description: "The document has been removed from shared space"
        });
        loadSharedDocs(); // Refresh the docs list
      } else {
        throw new Error(data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete document error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSharedChat();
    loadSharedDocs();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6" />
            Shared Family Space
          </h2>
          <p className="text-muted-foreground">
            Chat and documents accessible to all family members
          </p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Family Chat
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="w-4 h-4" />
            Shared Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Family Chat</CardTitle>
              <CardDescription>
                A shared conversation space for all family members
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading messages...
                    </div>
                  ) : sharedMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the family conversation!</p>
                    </div>
                  ) : (
                    sharedMessages.map((message) => (
                      <div key={message.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{message.authorFamilyName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.ts))} ago
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <form onSubmit={sendMessage} className="flex gap-2">
                <Textarea
                  placeholder="Type your message to the family..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Share files with all family members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {uploading ? 'Uploading...' : 'Click to select files or drag and drop'}
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shared Documents</CardTitle>
                <CardDescription>
                  Files uploaded by family members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading documents...
                          </TableCell>
                        </TableRow>
                      ) : sharedDocs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No documents shared yet</p>
                            <p className="text-sm">Upload files above to share with the family</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sharedDocs.map((doc) => (
                          <TableRow key={doc.path}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell>{(doc.size / 1024).toFixed(1)} KB</TableCell>
                            <TableCell>{doc.uploaderFamilyName}</TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(doc.uploadedAt))} ago
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
                                    window.open(`${baseUrl}/shared/download?path=${encodeURIComponent(doc.path)}`, '_blank');
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteDocument(doc.path)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}