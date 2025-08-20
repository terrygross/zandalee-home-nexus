
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, Mic, Hand, FileText, Brain, Volume2 } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { ChatPane } from './terminal/ChatPane';
import { SettingsPane } from './terminal/SettingsPane';
import { MemoriesPane } from './terminal/MemoriesPane';
import { MicWizardPane } from './terminal/MicWizardPane';
import { HandsPane } from './terminal/HandsPane';
import { DocsPane } from './terminal/DocsPane';
import { VoicePane } from './terminal/VoicePane';
import { StatusBar } from './terminal/StatusBar';

export const ZandaleeTerminal = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isHealthy } = useGateway();

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      <StatusBar />
      
      <div className="flex-1 flex flex-col min-h-0 px-4 py-2">
        {/* Inline header with title and status */}
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-lcars-text-accent text-lcars-display">ZANDALEE TERMINAL</h1>
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {isHealthy ? "GATEWAY CONNECTED" : "GATEWAY OFFLINE"}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 grid w-full grid-cols-7 mb-4 h-auto min-h-[3rem] overflow-x-auto gap-2">
            <TabsTrigger value="chat" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-purple">
              <MessageCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">CHAT</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-blue">
              <Settings className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">SETTINGS</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-orange">
              <Volume2 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">VOICE</span>
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-yellow">
              <Brain className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">MEMORIES</span>
            </TabsTrigger>
            <TabsTrigger value="mic" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-pink">
              <Mic className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">MIC</span>
            </TabsTrigger>
            <TabsTrigger value="hands" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-cyan">
              <Hand className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">HANDS</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-violet">
              <FileText className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">DOCS</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 overflow-hidden">
              <ChatPane />
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0 overflow-hidden">
              <SettingsPane />
            </TabsContent>
            
            <TabsContent value="voice" className="h-full m-0 overflow-hidden">
              <VoicePane />
            </TabsContent>
            
            <TabsContent value="memories" className="h-full m-0 overflow-hidden">
              <MemoriesPane />
            </TabsContent>
            
            <TabsContent value="mic" className="h-full m-0 overflow-hidden">
              <MicWizardPane />
            </TabsContent>
            
            <TabsContent value="hands" className="h-full m-0 overflow-hidden">
              <HandsPane />
            </TabsContent>
            
            <TabsContent value="docs" className="h-full m-0 overflow-hidden">
              <DocsPane />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
