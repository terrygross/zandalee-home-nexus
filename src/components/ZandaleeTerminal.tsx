
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, Mic, Hand, FileText, Brain } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { ChatPane } from './terminal/ChatPane';
import { SettingsPane } from './terminal/SettingsPane';
import { MemoriesPane } from './terminal/MemoriesPane';
import { MicWizardPane } from './terminal/MicWizardPane';
import { HandsPane } from './terminal/HandsPane';
import { DocsPane } from './terminal/DocsPane';
import { StatusBar } from './terminal/StatusBar';

export const ZandaleeTerminal = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isHealthy } = useGateway();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StatusBar />
      
      <div className="flex-1 flex flex-col container mx-auto p-4 max-w-full">
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-foreground mb-2">Zandalee Terminal</h1>
          <div className="flex items-center gap-2">
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {isHealthy ? "Gateway Connected" : "Gateway Offline"}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 overflow-x-auto min-w-0">
            <TabsTrigger value="chat" className="flex items-center gap-2 min-w-0">
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 min-w-0">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-2 min-w-0">
              <Brain className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Memories</span>
            </TabsTrigger>
            <TabsTrigger value="mic" className="flex items-center gap-2 min-w-0">
              <Mic className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Mic Wizard</span>
            </TabsTrigger>
            <TabsTrigger value="hands" className="flex items-center gap-2 min-w-0">
              <Hand className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Hands</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Docs</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="chat" className="h-full m-0">
              <ChatPane />
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0 overflow-y-auto">
              <SettingsPane />
            </TabsContent>
            
            <TabsContent value="memories" className="h-full m-0">
              <MemoriesPane />
            </TabsContent>
            
            <TabsContent value="mic" className="h-full m-0">
              <MicWizardPane />
            </TabsContent>
            
            <TabsContent value="hands" className="h-full m-0">
              <HandsPane />
            </TabsContent>
            
            <TabsContent value="docs" className="h-full m-0">
              <DocsPane />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
