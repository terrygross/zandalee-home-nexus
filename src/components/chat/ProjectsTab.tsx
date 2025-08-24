import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, Upload, MoreHorizontal, FolderOpen, Edit2, Archive, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChatStorage, ProjectItem, ProjectStore, ChatStore } from '@/utils/chatStorage';

export const ProjectsTab = () => {
  const [projectStore, setProjectStore] = useState<ProjectStore>({ selectedProjectId: null, items: [] });
  const [chatStore, setChatStore] = useState<ChatStore>({ activeChatId: null, items: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'a-z'>('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date());
  
  const { getProjectStore, setProjectStore: saveProjectStore, getChatStore, setChatStore: saveChatStore } = useChatStorage();
  const { toast } = useToast();

  useEffect(() => {
    setProjectStore(getProjectStore());
    setChatStore(getChatStore());
  }, []);

  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const saveWithStatus = debounce((pStore: ProjectStore, cStore?: ChatStore) => {
    setSaveStatus('saving');
    saveProjectStore(pStore);
    if (cStore) saveChatStore(cStore);
    setLastSaveTime(new Date());
    setTimeout(() => setSaveStatus('saved'), 500);
  }, 200);

  const updateStores = (newProjectStore: ProjectStore, newChatStore?: ChatStore) => {
    setProjectStore(newProjectStore);
    if (newChatStore) setChatStore(newChatStore);
    saveWithStatus(newProjectStore, newChatStore);
  };

  const createProject = () => {
    const name = prompt('Project name:');
    if (!name) return;

    const newProject: ProjectItem = {
      id: `project_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chats: [],
    };

    const newStore = {
      ...projectStore,
      items: [newProject, ...projectStore.items],
    };

    updateStores(newStore);
    toast({ title: 'Project created' });
  };

  const selectProject = (projectId: string) => {
    const newStore = {
      ...projectStore,
      selectedProjectId: projectId,
    };
    updateStores(newStore);
    toast({ title: 'Project selected' });
  };

  const renameProject = (projectId: string, newName: string) => {
    const newStore = {
      ...projectStore,
      items: projectStore.items.map(p =>
        p.id === projectId
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p
      ),
    };
    updateStores(newStore);
    toast({ title: 'Project renamed' });
  };

  const archiveProject = (projectId: string, archived: boolean) => {
    const newStore = {
      ...projectStore,
      items: projectStore.items.map(p =>
        p.id === projectId
          ? { ...p, archived, updatedAt: new Date().toISOString() }
          : p
      ),
    };
    updateStores(newStore);
    toast({ title: archived ? 'Project archived' : 'Project restored' });
  };

  const deleteProject = (projectId: string) => {
    const project = projectStore.items.find(p => p.id === projectId);
    if (!project) return;

    if (project.chats.length > 0) {
      const confirm = window.confirm(
        `This project contains ${project.chats.length} chats. Are you sure you want to delete it? This action cannot be undone.`
      );
      if (!confirm) return;
    }

    const newStore = {
      ...projectStore,
      items: projectStore.items.filter(p => p.id !== projectId),
      selectedProjectId: projectStore.selectedProjectId === projectId ? null : projectStore.selectedProjectId,
    };

    updateStores(newStore);
    toast({ title: 'Project deleted', variant: 'destructive' });
  };

  const exportProject = (projectId: string) => {
    const project = projectStore.items.find(p => p.id === projectId);
    if (!project) return;

    const projectChats = chatStore.items.filter(c => project.chats.includes(c.id));
    const exportData = {
      project,
      chats: projectChats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Project exported' });
  };

  const exportAllProjects = () => {
    const exportData = {
      projects: projectStore.items,
      chats: chatStore.items,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_projects_export.json';
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'All projects exported' });
  };

  const importProjects = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.projects && Array.isArray(data.projects)) {
          const newStore = {
            ...projectStore,
            items: [...projectStore.items, ...data.projects],
          };
          
          let newChatStore = chatStore;
          if (data.chats && Array.isArray(data.chats)) {
            newChatStore = {
              ...chatStore,
              items: [...chatStore.items, ...data.chats],
            };
          }

          updateStores(newStore, newChatStore);
          toast({ title: 'Projects imported successfully' });
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        toast({ 
          title: 'Import failed', 
          description: 'Invalid JSON file format',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const addCurrentChatToProject = (projectId: string) => {
    if (!chatStore.activeChatId) {
      toast({ title: 'No active chat to add' });
      return;
    }

    const project = projectStore.items.find(p => p.id === projectId);
    if (!project) return;

    if (project.chats.includes(chatStore.activeChatId)) {
      toast({ title: 'Chat already in this project' });
      return;
    }

    const newStore = {
      ...projectStore,
      items: projectStore.items.map(p =>
        p.id === projectId
          ? { 
              ...p, 
              chats: [...p.chats, chatStore.activeChatId],
              updatedAt: new Date().toISOString()
            }
          : p
      ),
    };

    updateStores(newStore);
    toast({ title: 'Chat added to project' });
  };

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Filter and sort projects
  const filteredProjects = projectStore.items
    .filter(project => {
      if (!showArchived && project.archived) return false;
      if (searchQuery) {
        return project.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortMode) {
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Controls with LCARS styling */}
      <div className="sticky top-0 bg-background border-2 border-blue-500 rounded-2xl m-2 z-10">
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Button onClick={createProject} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-full font-bold">
              <Plus className="w-4 h-4 mr-2" />
              NEW PROJECT
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={importProjects}
              className="hidden"
              id="import-projects"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-projects')?.click()}
              className="border-blue-500 rounded-full"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportAllProjects}
              className="border-blue-500 rounded-full"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-blue-500 rounded-full"
            />
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-blue-500 rounded-full">
                  Sort: {sortMode === 'recent' ? 'Recent' : 'A-Z'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border-blue-500 z-[300]">
                <DropdownMenuItem onClick={() => setSortMode('recent')}>Recent</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode('a-z')}>A-Z</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="border-blue-500 rounded-full"
            >
              {showArchived ? 'Hide' : 'Show'} Archived
            </Button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredProjects.map((project) => {
            const projectChats = chatStore.items.filter(c => project.chats.includes(c.id));
            const isExpanded = expandedProjects.has(project.id);
            
            return (
              <div
                key={project.id}
                className={`rounded-2xl border-2 border-blue-500/30 ${
                  projectStore.selectedProjectId === project.id ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-blue-500/5 hover:border-blue-500/50'
                } ${project.archived ? 'opacity-60' : ''}`}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleProjectExpanded(project.id)}>
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full border border-blue-500/30 hover:bg-blue-500/10">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{project.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {projectChats.length} chats
                            </p>
                            {project.archived && (
                              <Badge variant="secondary" className="text-xs border-blue-500/30">Archived</Badge>
                            )}
                            {projectStore.selectedProjectId === project.id && (
                              <Badge variant="default" className="text-xs bg-blue-600">Active</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full border border-blue-500/30 hover:bg-blue-500/10">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-blue-500 z-[300]">
                          <DropdownMenuItem onClick={() => selectProject(project.id)}>
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Select Project
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const newName = prompt('New name:', project.name);
                            if (newName) renameProject(project.id, newName);
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addCurrentChatToProject(project.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Current Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => archiveProject(project.id, !project.archived)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {project.archived ? 'Restore' : 'Archive'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportProject(project.id)}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-3 pt-3 border-t border-blue-500/30 space-y-2">
                        {projectChats.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No chats in this project</p>
                        ) : (
                          projectChats.map((chat) => (
                            <div
                              key={chat.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{chat.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(chat.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No projects found</p>
              {searchQuery && (
                <button
                  className="text-primary hover:underline text-sm mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Status */}
      <div className="p-2 border-t border-blue-500/30">
        <p className="text-xs text-muted-foreground text-center">
          {saveStatus === 'saving' ? 'Saving...' : `Saved • ${Math.floor((Date.now() - lastSaveTime.getTime()) / 1000)}s ago`}
        </p>
      </div>
    </div>
  );
};
