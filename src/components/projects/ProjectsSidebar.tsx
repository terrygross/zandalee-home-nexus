import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { Project, ProjectsResponse, CreateProjectRequest } from '@/types/auth';
import { FolderOpen, Plus, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectsSidebarProps {
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
}

export function ProjectsSidebar({ selectedProject, onSelectProject }: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const { toast } = useToast();

  const loadProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/projects`, {
        headers: {
          'X-User': user.familyName,
        },
      });

      const data: ProjectsResponse = await response.json();
      
      if (data.ok && data.projects) {
        setProjects(data.projects);
      } else {
        throw new Error(data.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Load projects error:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setCreating(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
        },
        body: JSON.stringify({ name: newProjectName.trim() } as CreateProjectRequest),
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Success",
          description: `Project "${newProjectName}" created`
        });
        setNewProjectName('');
        loadProjects(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Create project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, user]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderOpen className="w-4 h-4" />
          Projects
          {selectedProject && (
            <Badge variant="secondary" className="ml-1">
              {selectedProject.name}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            My Projects
          </SheetTitle>
          <SheetDescription>
            Manage your personal projects and chat contexts
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Create New Project */}
          <form onSubmit={createProject} className="space-y-2">
            <Input
              placeholder="New project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              disabled={creating}
            />
            <Button 
              type="submit" 
              className="w-full gap-2"
              disabled={creating || !newProjectName.trim()}
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </form>

          {/* Default Personal Chat */}
          <div className="space-y-2">
            <Button
              variant={!selectedProject ? "default" : "outline"}
              onClick={() => onSelectProject(null)}
              className="w-full justify-start gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Personal Chat
              {!selectedProject && <Badge variant="secondary">Active</Badge>}
            </Button>
          </div>

          {/* Projects List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-sm">Create your first project above</p>
                </div>
              ) : (
                projects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProject?.id === project.id ? "default" : "outline"}
                    onClick={() => onSelectProject(project)}
                    className="w-full justify-start text-left h-auto p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium truncate">{project.name}</span>
                        {selectedProject?.id === project.id && (
                          <Badge variant="secondary" className="ml-auto">Active</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(project.lastActivity))} ago
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}