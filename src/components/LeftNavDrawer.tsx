import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Menu, FolderPlus, Search, Star, Archive, Trash2, Pin, MessageSquare, Clock, Filter, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useProjectChat } from '@/contexts/ProjectChatContext';
import { useToast } from '@/hooks/use-toast';
import { Project, Thread } from '@/types/projects';

interface LeftNavDrawerProps {
  onProjectChange?: (project: Project | null) => void;
}

export const LeftNavDrawer: React.FC<LeftNavDrawerProps> = ({ onProjectChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pinned' | 'archived'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const { toast } = useToast();
  const { 
    projects, 
    chat,
    setActiveProject, 
    createProject, 
    renameProject, 
    archiveProject,
    createThread,
    pinThread,
    archiveThread,
    deleteThread,
    setActiveThread
  } = useProjectChat();

  const activeProject = projects.list.find(p => p.id === projects.activeProjectId);
  
  const filteredProjects = projects.list.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (historyFilter === 'all' || (historyFilter === 'archived' ? project.archived : !project.archived))
  );

  const filteredThreads = chat.threads.filter(thread => {
    const matchesSearch = !historySearch || thread.title?.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === 'all' || 
      (historyFilter === 'pinned' && thread.pinned) ||
      (historyFilter === 'archived' && thread.archived);
    return matchesSearch && matchesFilter;
  });

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const newProject = await createProject(newProjectName);
      setNewProjectName('');
      setActiveProject(newProject.id);
      onProjectChange?.(newProject);
      toast({
        title: "Project Created",
        description: `Project "${newProject.name}" created successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleRenameProject = async (projectId: string) => {
    if (!editName.trim()) return;
    
    try {
      await renameProject(projectId, editName);
      setEditingProject(null);
      setEditName('');
      toast({
        title: "Project Renamed",
        description: "Project name updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename project",
        variant: "destructive"
      });
    }
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project.id);
    onProjectChange?.(project);
    setIsOpen(false);
  };

  const handleNewChat = async () => {
    try {
      const newThread = await createThread();
      setActiveThread(newThread.id);
      setIsOpen(false);
      toast({
        title: "New Chat",
        description: "New conversation started"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setActiveThread(thread.id);
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-foreground hover:bg-muted">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-card border-r border-border">
        <Tabs defaultValue="projects" className="h-full flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Navigation</h2>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="projects" className="flex-1 m-0 p-4 space-y-4">
            {/* Create Project */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="New project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <Button onClick={handleCreateProject} size="sm" className="lcars-button bg-lcars-blue">
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search Projects */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Projects List */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      project.id === projects.activeProjectId
                        ? 'bg-accent border-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => handleSelectProject(project)}
                  >
                    <div className="flex items-center justify-between">
                      {editingProject === project.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRenameProject(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameProject(project.id);
                            if (e.key === 'Escape') setEditingProject(null);
                          }}
                          autoFocus
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span 
                          className="font-medium text-foreground truncate"
                          onDoubleClick={() => {
                            setEditingProject(project.id);
                            setEditName(project.name);
                          }}
                        >
                          {project.name}
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {project.archived && (
                          <Badge variant="secondary" className="text-xs">
                            <Archive className="w-3 h-3" />
                          </Badge>
                        )}
                        {project.id === projects.activeProjectId && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {project.lastActivity && (
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(project.lastActivity)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 p-4 space-y-4">
            {/* New Chat Button */}
            <Button onClick={handleNewChat} className="w-full lcars-button bg-lcars-green">
              <MessageSquare className="w-4 h-4 mr-2" />
              New Chat
            </Button>

            {/* History Controls */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={historyFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistoryFilter('all')}
                  className="flex-1"
                >
                  All
                </Button>
                <Button
                  variant={historyFilter === 'pinned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistoryFilter('pinned')}
                  className="flex-1"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Pinned
                </Button>
                <Button
                  variant={historyFilter === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistoryFilter('archived')}
                  className="flex-1"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archived
                </Button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Current Project Info */}
            {activeProject && (
              <div className="p-2 bg-muted/50 rounded border">
                <div className="text-sm font-medium text-foreground">
                  {activeProject.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {filteredThreads.length} conversations
                </div>
              </div>
            )}

            {/* Threads List */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                      thread.id === chat.activeThreadId
                        ? 'bg-accent border-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => handleSelectThread(thread)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {thread.title || 'Untitled Chat'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(thread.updatedAt)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {thread.pinned && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                        {thread.archived && (
                          <Archive className="w-3 h-3 text-muted-foreground" />
                        )}
                        
                        {/* Kebab Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"  
                              className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSelectThread(thread)}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Open Chat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => pinThread(thread.id, !thread.pinned)}>
                              <Pin className="w-4 h-4 mr-2" />
                              {thread.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => archiveThread(thread.id, !thread.archived)}>
                              <Archive className="w-4 h-4 mr-2" />
                              {thread.archived ? 'Unarchive' : 'Archive'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Chat
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this conversation? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      deleteThread(thread.id);
                                      // Navigate away if deleting current thread
                                      if (thread.id === chat.activeThreadId) {
                                        setActiveThread(null);
                                      }
                                    }}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredThreads.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {historySearch ? 'No conversations found' : 'No conversations yet'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};