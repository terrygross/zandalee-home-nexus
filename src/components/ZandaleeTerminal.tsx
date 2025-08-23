import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, Mic, Hand, FileText, Brain, Volume2, Share2 } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useSession } from '@/contexts/SessionContext';
import { useSuperAdminAudit } from '@/hooks/useSuperAdminAudit';
import { SuperAdminAuditBanner } from '@/components/SuperAdminAuditBanner';
import { ChatPane } from './terminal/ChatPane';
import { SettingsPane } from './terminal/SettingsPane';
import { MemoriesPane } from './terminal/MemoriesPane';
import { MicWizardPane } from './terminal/MicWizardPane';
import { HandsPane } from './terminal/HandsPane';
import { DocsPane } from './terminal/DocsPane';
import { VoicePane } from './terminal/VoicePane';
import { SharedPane } from './terminal/SharedPane';

export const ZandaleeTerminal = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isHealthy } = useGateway();
  const { user } = useSession();

  // Super-admin audit functionality
  const isSuperAdmin = user?.role === 'superadmin';
  const {
    entries,
    loading: auditLoading,
    hasNewAttempts,
    fetchAuditEntries,
    markAsSeen,
    recentEntries
  } = useSuperAdminAudit(isSuperAdmin);
  
  return (
    <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* Header with Custom Navigation */}
        <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-3 sm:px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ZANDALEE TERMINAL
              </h1>
              <Badge variant={isHealthy ? "default" : "destructive"} className="text-xs">
                {isHealthy ? "GATEWAY CONNECTED" : "GATEWAY OFFLINE"}
              </Badge>
            </div>
          </div>
          
          {/* Custom Tab Navigation */}
          <div className="px-3 sm:px-6 pb-3">
            <div className="flex flex-wrap gap-1 sm:gap-2 scrollbar-hide">
              {[
                { id: 'chat', label: 'CHAT', icon: MessageCircle, color: 'bg-lcars-purple' },
                { id: 'voice', label: 'VOICE', icon: Volume2, color: 'bg-lcars-orange' },
                { id: 'memories', label: 'MEMORIES', icon: Brain, color: 'bg-lcars-yellow' },
                { id: 'mic', label: 'MIC', icon: Mic, color: 'bg-lcars-pink' },
                { id: 'hands', label: 'HANDS', icon: Hand, color: 'bg-lcars-cyan' },
                { id: 'docs', label: 'DOCS', icon: FileText, color: 'bg-lcars-violet' },
                { id: 'shared', label: 'SHARED', icon: Share2, color: 'bg-lcars-teal' },
                { id: 'settings', label: 'SETTINGS', icon: Settings, color: 'bg-lcars-blue' }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 
                      text-xs sm:text-sm font-bold rounded-full transition-all text-black
                      ${activeTab === tab.id 
                        ? 'bg-lcars-orange shadow-sm' 
                        : `${tab.color} hover:bg-lcars-orange`
                      }
                    `}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden xs:inline whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Super-Admin Audit Banner */}
        {isSuperAdmin && (
          <div className="flex-shrink-0 px-4">
            <SuperAdminAuditBanner
              entries={entries}
              recentEntries={recentEntries}
              hasNewAttempts={hasNewAttempts}
              onMarkAsSeen={markAsSeen}
              onRefresh={() => fetchAuditEntries()}
              loading={auditLoading}
            />
          </div>
        )}
        
        <div className="flex-1 flex flex-col min-h-0 px-4 py-1">
          <div className="flex-1 min-h-0 overflow-visible">
            <TabsContent value="chat" className="h-full m-0 overflow-visible">
              <ChatPane />
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
            
            <TabsContent value="shared" className="h-full m-0 overflow-hidden">
              <SharedPane />
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 overflow-hidden">
              <SettingsPane />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};