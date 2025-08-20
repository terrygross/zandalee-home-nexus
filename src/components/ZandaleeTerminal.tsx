
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
    <div className="min-h-screen bg-background">
      <StatusBar />
      
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Zandalee Terminal</h1>
          <div className="flex items-center gap-2">
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {isHealthy ? "Gateway Connected" : "Gateway Offline"}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Memories
            </TabsTrigger>
            <TabsTrigger value="mic" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Mic Wizard
            </TabsTrigger>
            <TabsTrigger value="hands" className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              Hands
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Docs
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="chat">
              <ChatPane />
            </TabsContent>
            
            <TabsContent value="settings">
              <SettingsPane />
            </TabsContent>
            
            <TabsContent value="memories">
              <MemoriesPane />
            </TabsContent>
            
            <TabsContent value="mic">
              <MicWizardPane />
            </TabsContent>
            
            <TabsContent value="hands">
              <HandsPane />
            </TabsContent>
            
            <TabsContent value="docs">
              <DocsPane />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
