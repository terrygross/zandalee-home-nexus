import { useState, useEffect } from "react";
import { FolderPlus, Folder, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Project } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.project_list();
      if (response.ok && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await api.project_new(newProjectName.trim());
      if (response.ok) {
        toast({
          title: "Project Created",
          description: `Project "${newProjectName}" has been created`
        });
        setNewProjectName("");
        setIsCreating(false);
        loadProjects();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleSwitchProject = async (projectName: string) => {
    try {
      const response = await api.project_switch(projectName);
      if (response.ok) {
        toast({
          title: "Project Switched",
          description: `Switched to "${projectName}"`
        });
        loadProjects();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch project",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewProjectName("");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FolderPlus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Projects</h3>
      </div>

      {/* Create New Project */}
      {isCreating ? (
        <div className="space-y-2">
          <Input
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-background/50 border-border"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              Create
            </Button>
            <Button
              onClick={() => {
                setIsCreating(false);
                setNewProjectName("");
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsCreating(true)}
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      )}

      {/* Projects List */}
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects found</p>
          </div>
        ) : (
          projects.map((project) => (
            <Card
              key={project.name}
              className={cn(
                "border transition-all cursor-pointer hover:border-primary/30",
                project.active 
                  ? "border-primary/50 bg-primary/10 shadow-glow-primary" 
                  : "border-border/50 bg-background/30 hover:bg-background/50"
              )}
              onClick={() => !project.active && handleSwitchProject(project.name)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {project.active ? (
                      <FolderOpen className="w-4 h-4 text-primary" />
                    ) : (
                      <Folder className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "font-medium text-sm",
                      project.active ? "text-primary" : "text-foreground"
                    )}>
                      {project.name}
                    </span>
                  </div>
                  
                  {project.active && (
                    <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <div>Created: {project.created.toLocaleDateString()}</div>
                  <div>Modified: {project.modified.toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Actions */}
      <Button
        onClick={loadProjects}
        variant="outline"
        size="sm"
        className="w-full"
      >
        Refresh Projects
      </Button>
    </div>
  );
}