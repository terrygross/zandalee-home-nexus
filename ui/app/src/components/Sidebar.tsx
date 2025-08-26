import { useState } from "react";
import { Brain, FolderPlus, Shield, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryTab } from "./sidebar/MemoryTab";
import { ProjectsTab } from "./sidebar/ProjectsTab";
import { SecurityTab } from "./sidebar/SecurityTab";
import { LogsTab } from "./sidebar/LogsTab";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState("memory");

  const tabs = [
    {
      id: "memory",
      label: "Memory",
      icon: Brain,
      component: MemoryTab
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderPlus,
      component: ProjectsTab
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      component: SecurityTab
    },
    {
      id: "logs",
      label: "Logs",
      icon: FileText,
      component: LogsTab
    }
  ];

  return (
    <div className="w-80 border-l border-border bg-gradient-card backdrop-blur-sm flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b border-border p-1">
          <TabsList className="grid w-full grid-cols-4 bg-background/30 border border-border/50">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 text-xs transition-all",
                  "data-[state=active]:bg-primary/20 data-[state=active]:text-primary",
                  "data-[state=active]:shadow-glow-primary data-[state=active]:border-primary/30"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="h-full overflow-y-auto m-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <tab.component />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}