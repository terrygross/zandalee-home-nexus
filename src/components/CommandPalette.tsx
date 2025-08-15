
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Terminal, 
  Mic, 
  Volume2, 
  FolderPlus, 
  Search, 
  Camera, 
  Shield, 
  Database,
  Settings,
  HelpCircle,
  Zap
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  const commands = [
    // General commands
    { id: "help", label: "Show Help", description: "Display available commands", icon: HelpCircle, group: "General", command: ":help" },
    { id: "mute", label: "Mute Voice", description: "Disable voice input/output", icon: Volume2, group: "Voice", command: ":mute" },
    { id: "unmute", label: "Unmute Voice", description: "Enable voice input/output", icon: Mic, group: "Voice", command: ":unmute" },
    { id: "devices", label: "Audio Devices", description: "List available microphones", icon: Settings, group: "Voice", command: ":devices" },
    { id: "calibrate", label: "Calibrate Microphone", description: "Recalibrate microphone settings", icon: Mic, group: "Voice", command: ":mic.recalibrate" },
    
    // Project commands
    { id: "new-project", label: "New Project", description: "Create a new project", icon: FolderPlus, group: "Projects", command: ':project.new "ProjectName"' },
    { id: "list-projects", label: "List Projects", description: "Show all projects", icon: Search, group: "Projects", command: ":project.list" },
    { id: "switch-project", label: "Switch Project", description: "Change active project", icon: Terminal, group: "Projects", command: ':project.switch "ProjectName"' },
    
    // Memory commands
    { id: "learn", label: "Learn Memory", description: "Add new memory", icon: Database, group: "Memory", command: ':mem.learn "content" kind=semantic' },
    { id: "search-memory", label: "Search Memory", description: "Find stored memories", icon: Search, group: "Memory", command: ":mem.search query" },
    { id: "memory-stats", label: "Memory Stats", description: "Show memory statistics", icon: Database, group: "Memory", command: ":mem.stats" },
    { id: "snapshot", label: "Create Snapshot", description: "Create memory snapshot", icon: Camera, group: "Memory", command: ":mem.snapshot" },
    { id: "rollup", label: "Rollup Memories", description: "Consolidate old memories", icon: Database, group: "Memory", command: ":mem.rollup" },
    
    // Security commands
    { id: "laws-status", label: "Core Laws Status", description: "Show current core laws", icon: Shield, group: "Security", command: ":laws.status" },
    { id: "policy-list", label: "Security Policy", description: "List security policies", icon: Shield, group: "Security", command: ":policy.list" },
    { id: "allow-domain", label: "Allow Domain", description: "Whitelist a domain", icon: Shield, group: "Security", command: ":policy.allow domain example.com" },
    { id: "block-domain", label: "Block Domain", description: "Blacklist a domain", icon: Shield, group: "Security", command: ":policy.block domain bad.com" },
    
    // System commands
    { id: "screenshot", label: "Take Screenshot", description: "Capture screen to project", icon: Camera, group: "System", command: "Zandalee, take a screenshot" },
    { id: "system-info", label: "System Info", description: "Show system status", icon: Zap, group: "System", command: ":system.status" }
  ];

  const executeCommand = (command: string) => {
    console.log(`Executing command: ${command}`);
    onOpenChange(false);
  };

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchValue.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchValue.toLowerCase()) ||
    cmd.command.toLowerCase().includes(searchValue.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const group = command.group;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(command);
    return groups;
  }, {} as Record<string, typeof commands>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl bg-space-deep/95 backdrop-blur-xl border border-energy-cyan/30">
        <div className="flex flex-col max-h-96">
          <div className="px-4 py-3 border-b border-border/30">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-energy-cyan" />
              <h3 className="text-lg font-semibold text-text-primary">Command Palette</h3>
            </div>
          </div>
          
          <div className="p-4">
            <Input
              placeholder="Type a command or search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border-0 bg-space-surface/50 text-text-primary placeholder-text-muted"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="text-text-muted py-6 text-center">
                No commands found. Try typing ":" followed by a command.
              </div>
            ) : (
              Object.entries(groupedCommands).map(([group, groupCommands]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-text-secondary text-sm font-medium mb-2">{group}</h4>
                  <div className="space-y-1">
                    {groupCommands.map((command) => (
                      <div
                        key={command.id}
                        onClick={() => executeCommand(command.command)}
                        className="flex items-center space-x-3 p-3 hover:bg-energy-cyan/20 cursor-pointer rounded-lg transition-colors"
                      >
                        <command.icon className="w-4 h-4 text-energy-cyan" />
                        <div className="flex-1">
                          <div className="text-text-primary font-medium">{command.label}</div>
                          <div className="text-text-muted text-sm">{command.description}</div>
                        </div>
                        <code className="text-xs bg-space-mid/50 px-2 py-1 rounded text-energy-pulse">
                          {command.command}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="px-4 py-2 border-t border-border/30 text-xs text-text-muted">
            Press <kbd className="bg-space-mid/50 px-1 rounded">Enter</kbd> to execute • 
            Press <kbd className="bg-space-mid/50 px-1 rounded">Esc</kbd> to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
