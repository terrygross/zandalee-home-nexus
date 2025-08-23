import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, MessageSquare, MoreHorizontal, Edit2, Archive, Download, Trash2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatProject {
  id: string;
  name: string;
  created: Date;
  updated: Date;
  messageCount: number;
  archived: boolean;
}

interface ChatProjectsSidebarProps {
  activeProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export const ChatProjectsSidebar = ({ activeProjectId, onProjectSelect, onNewProject }: ChatProjectsSidebarProps) => {
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('chat_projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed.map((p: any) => ({
          ...p,
          created: new Date(p.created),
          updated: new Date(p.updated)
        })));
      } catch (error) {
        console.error('Failed to load chat projects:', error);
      }
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('chat_projects', JSON.stringify(projects));
  }, [projects]);

  const createProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: ChatProject = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      created: new Date(),
      updated: new Date(),
      messageCount: 0,
      archived: false
    };

    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setShowNewProject(false);
    onProjectSelect(newProject.id);
    
    toast({
      title: "Project created",
      description: `"${newProject.name}" is ready for chatting`
    });
  };

  const renameProject = (projectId: string) => {
    if (!editName.trim()) return;

    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, name: editName.trim(), updated: new Date() }
        : p
    ));
    
    setEditingProject(null);
    setEditName('');
    
    toast({
      title: "Project renamed",
      description: "Project name updated successfully"
    });
  };

  const archiveProject = (projectId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, archived: !p.archived, updated: new Date() }
        : p
    ));
    
    const project = projects.find(p => p.id === projectId);
    toast({
      title: project?.archived ? "Project unarchived" : "Project archived",
      description: project?.archived ? "Project restored to active list" : "Project moved to archive"
    });
  };

  const exportProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Get chat history for this project
    const chatHistory = localStorage.getItem(`chat_history_${projectId}`);
    
    const exportData = {
      project,
      chatHistory: chatHistory ? JSON.parse(chatHistory) : [],
      exportedAt: new Date().toISOString()
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Project exported",
      description: "Chat history downloaded successfully"
    });
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    
    // Also remove chat history
    localStorage.removeItem(`chat_history_${projectId}`);
    
    // If this was the active project, trigger new project
    if (activeProjectId === projectId) {
      onNewProject();
    }
    
    toast({
      title: "Project deleted",
      description: "Project and chat history removed",
      variant: "destructive"
    });
  };

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lcars">Chat Projects</h3>
          <Button 
            size="sm" 
            onClick={() => setShowNewProject(true)}
            className="lcars-button bg-lcars-blue"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showNewProject && (
          <div className="flex gap-2">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="lcars-input"
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
              autoFocus
            />
            <Button size="sm" onClick={createProject} disabled={!newProjectName.trim()}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => {
              setShowNewProject(false);
              setNewProjectName('');
            }}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Projects
              </div>
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer group ${
                    activeProjectId === project.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  
                  {editingProject === project.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameProject(project.id);
                        if (e.key === 'Escape') {
                          setEditingProject(null);
                          setEditName('');
                        }
                      }}
                      onBlur={() => renameProject(project.id)}
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.messageCount} messages
                      </div>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingProject(project.id);
                        setEditName(project.name);
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveProject(project.id)}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportProject(project.id)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <Separator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{project.name}" and all its chat history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteProject(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Archived Projects */}
          {archivedProjects.length > 0 && (
            <div>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Archived Projects
              </div>
              {archivedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer group opacity-60"
                  onClick={() => onProjectSelect(project.id)}
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Archived • {project.messageCount} messages
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => archiveProject(project.id)}>
                        <Archive className="w-4 h-4 mr-2" />
                        Unarchive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportProject(project.id)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <Separator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Archived Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{project.name}" and all its chat history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteProject(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
              <Button onClick={() => setShowNewProject(true)} size="sm" className="lcars-button bg-lcars-blue">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};