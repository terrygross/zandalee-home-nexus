
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, Users, Share2 } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useSession } from '@/contexts/SessionContext';
import { canInviteUsers } from '@/utils/roleGuards';
import { ChatPane } from './terminal/ChatPane';
import { SettingsPane } from './terminal/SettingsPane';
import { ManageFamilyPane } from './terminal/ManageFamilyPane';
import { SharedPane } from './terminal/SharedPane';

export const ZandaleeTerminal = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isHealthy } = useGateway();
  const { user } = useSession();

  return (
    <div className="flex flex-col min-h-[100dvh] w-screen bg-background overflow-hidden">
      {/* Header with title and status */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-lcars-text-accent text-lcars-display">ZANDALEE TERMINAL</h1>
          <Badge variant={isHealthy ? "default" : "destructive"}>
            {isHealthy ? "GATEWAY CONNECTED" : "GATEWAY OFFLINE"}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0 px-4 py-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className={`flex-shrink-0 grid w-full ${canInviteUsers(user) ? 'grid-cols-4' : 'grid-cols-3'} mb-1 h-auto min-h-[3rem] overflow-x-auto gap-2 whitespace-nowrap`}>
            <TabsTrigger value="chat" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-purple">
              <MessageCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">CHAT</span>
            </TabsTrigger>
            
            {canInviteUsers(user) && (
              <TabsTrigger value="manage-family" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-green">
                <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">MANAGE FAMILY</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="shared" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-orange">
              <Share2 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">SHARED</span>
            </TabsTrigger>
            
            <TabsTrigger value="settings" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-blue">
              <Settings className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">SETTINGS</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0 overflow-hidden">
              <ChatPane />
            </TabsContent>
            
            {canInviteUsers(user) && (
              <TabsContent value="manage-family" className="h-full m-0 overflow-hidden">
                <ManageFamilyPane />
              </TabsContent>
            )}
            
            <TabsContent value="shared" className="h-full m-0 overflow-hidden">
              <SharedPane />
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0 overflow-hidden">
              <SettingsPane />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
