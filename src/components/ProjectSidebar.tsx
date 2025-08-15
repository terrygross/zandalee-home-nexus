
import { useState } from "react";
import { Folder, Plus, Search, Star, Clock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ProjectSidebar = () => {
  const [activeProject, setActiveProject] = useState("Personal Assistant");
  const [searchQuery, setSearchQuery] = useState("");
  
  const projects = [
    { name: "Personal Assistant", status: "active", lastUsed: "2m ago", memories: 42 },
    { name: "Family Photos", status: "recent", lastUsed: "1h ago", memories: 18 },
    { name: "Home Automation", status: "pinned", lastUsed: "2h ago", memories: 31 },
    { name: "Recipe Collection", status: "idle", lastUsed: "3d ago", memories: 15 },
    { name: "Learning Python", status: "idle", lastUsed: "1w ago", memories: 67 }
  ];

  const memories = [
    { type: "semantic", content: "User prefers dark themes for applications", importance: 0.9 },
    { type: "episodic", content: "Created project 'Personal Assistant' at 2:30 PM", importance: 0.7 },
    { type: "procedural", content: "Screenshot workflow: Win+S → Select area → Save to project", importance: 0.8 },
    { type: "working", content: "Currently helping with Zandalee interface design", importance: 1.0 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-energy-cyan bg-energy-cyan/20';
      case 'recent': return 'text-energy-pulse bg-energy-pulse/20';
      case 'pinned': return 'text-status-warning bg-status-warning/20';
      default: return 'text-text-muted bg-space-mid/20';
    }
  };

  const getMemoryTypeColor = (type: string) => {
    switch (type) {
      case 'semantic': return 'text-energy-blue bg-energy-blue/20';
      case 'episodic': return 'text-energy-cyan bg-energy-cyan/20';
      case 'procedural': return 'text-energy-pulse bg-energy-pulse/20';
      case 'working': return 'text-status-warning bg-status-warning/20';
      default: return 'text-text-muted bg-space-mid/20';
    }
  };

  return (
    <div className="w-80 glass-panel h-full flex flex-col">
      {/* Projects Section */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Projects</h3>
          <Button size="sm" variant="ghost" className="text-energy-cyan hover:bg-energy-cyan/20">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-10 bg-space-surface border-glass-border text-text-primary placeholder-text-muted"
          />
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {projects
            .filter(project => project.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((project) => (
              <div
                key={project.name}
                onClick={() => setActiveProject(project.name)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  activeProject === project.name
                    ? 'bg-energy-cyan/20 border border-energy-cyan/50'
                    : 'bg-space-mid/30 hover:bg-space-mid/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-energy-cyan" />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {project.name}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                    {project.status === 'pinned' ? <Star className="w-3 h-3" /> : project.status}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs">
                  <div className="flex items-center space-x-1 text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{project.lastUsed}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-text-muted">
                    <Database className="w-3 h-3" />
                    <span>{project.memories}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Memory Preview Section */}
      <div className="p-4 flex-1">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Recent Memories</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {memories.map((memory, index) => (
            <div key={index} className="bg-space-mid/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded ${getMemoryTypeColor(memory.type)}`}>
                  {memory.type}
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-energy-cyan rounded-full opacity-60" 
                       style={{ opacity: memory.importance }} />
                  <span className="text-xs text-text-muted">{Math.round(memory.importance * 100)}%</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {memory.content}
              </p>
            </div>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-4 text-energy-cyan hover:bg-energy-cyan/20"
        >
          View All Memories
        </Button>
      </div>
    </div>
  );
};

export default ProjectSidebar;
