import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useIsMobile } from '@/hooks/use-mobile';
import { Project } from '@/types/projects';
import { 
  FolderPlus, 
  Folder, 
  MoreVertical, 
  Edit2, 
  Archive, 
  ArchiveRestore,
  Plus,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectsSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectsSidebar = ({ isOpen, onOpenChange }: ProjectsSidebarProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    setProjectArchived
  } = useProjects();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);
  const displayProjects = showArchived ? archivedProjects : activeProjects;

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Project name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      setShowCreateDialog(false);
      toast({
        title: "Project Created",
        description: `"${newProjectName}" has been created`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleRenameProject = async () => {
    if (!editingProject || !editName.trim()) return;

    try {
      await renameProject(editingProject.id, editName.trim());
      setEditingProject(null);
      setEditName('');
      toast({
        title: "Project Renamed",
        description: `Project renamed to "${editName}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename project",
        variant: "destructive"
      });
    }
  };

  const handleArchiveProject = async (project: Project) => {
    try {
      await setProjectArchived(project.id, !project.archived);
      toast({
        title: project.archived ? "Project Restored" : "Project Archived",
        description: `"${project.name}" has been ${project.archived ? 'restored' : 'archived'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive"
      });
    }
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    onOpenChange(false);
  };

  const ProjectsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Projects</h3>
          <Badge variant="secondary" className="text-xs">
            {displayProjects.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs"
          >
            {showArchived ? 'Active' : 'Archived'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                activeProjectId === project.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => handleSelectProject(project.id)}
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{project.name}</p>
                {project.lastActivity && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(project.lastActivity))} ago
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                      setEditName(project.name);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveProject(project);
                    }}
                  >
                    {project.archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {displayProjects.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {showArchived ? 'archived' : 'active'} projects</p>
          {!showArchived && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Project name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleRenameProject}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const triggerButton = (
    <Button variant="ghost" size="sm" className="gap-2">
      <FolderPlus className="h-4 w-4" />
      Projects
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Projects</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <ProjectsList />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Projects</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ProjectsList />
        </div>
      </SheetContent>
    </Sheet>
  );
};