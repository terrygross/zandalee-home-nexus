
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, Mic, Hand, FileText, Brain, Volume2, Code, Users, Share2 } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useSession } from '@/contexts/SessionContext';
import { canInviteUsers } from '@/utils/roleGuards';
import { useSuperAdminAudit } from '@/hooks/useSuperAdminAudit';
import { SuperAdminAuditBanner } from '@/components/SuperAdminAuditBanner';
import { ChatPane } from './terminal/ChatPane';
import { SettingsPane } from './terminal/SettingsPane';
import { MemoriesPane } from './terminal/MemoriesPane';
import { MicWizardPane } from './terminal/MicWizardPane';
import { HandsPane } from './terminal/HandsPane';
import { DocsPane } from './terminal/DocsPane';
import { VoicePane } from './terminal/VoicePane';
import { AppControlPane } from './terminal/AppControlPane';
import { ManageFamilyPane } from './terminal/ManageFamilyPane';
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
    <div className="flex flex-col min-h-[100dvh] w-screen bg-background md:overflow-visible">
      {/* Header with title and status */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-lcars-text-accent text-lcars-display">ZANDALEE TERMINAL</h1>
          <Badge variant={isHealthy ? "default" : "destructive"}>
            {isHealthy ? "GATEWAY CONNECTED" : "GATEWAY OFFLINE"}
          </Badge>
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
      
      <div className="flex-1 flex flex-col min-h-0 px-4 py-1 md:overflow-visible">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col md:flex-row min-h-0 md:overflow-visible">
          {/* Mobile/Tablet Top Tabs - Hidden on Desktop */}
          <TabsList className={`xl:hidden flex-shrink-0 grid w-full ${canInviteUsers(user) ? 'grid-cols-10' : 'grid-cols-9'} mb-1 h-auto min-h-[3rem] overflow-x-auto gap-2 whitespace-nowrap`}>
            <TabsTrigger value="chat" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-purple">
              <MessageCircle className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">CHAT</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-blue">
              <Settings className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">SETTINGS</span>
            </TabsTrigger>
            <TabsTrigger value="appcontrol" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-green">
              <Code className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">APP CONTROL</span>
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
            
            {canInviteUsers(user) && (
              <TabsTrigger value="manage-family" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-red">
                <Users className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">MANAGE FAMILY</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="shared" className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm bg-lcars-teal">
              <Share2 className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">SHARED</span>
            </TabsTrigger>
          </TabsList>

          {/* Desktop Vertical Navigation - Hidden on Mobile/Tablet */}
          <div className="hidden xl:flex flex-col w-56 flex-shrink-0 border-r border-border pr-4 mr-4 gap-1 pt-3 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'chat' ? 'bg-lcars-purple text-black opacity-100' : 'bg-lcars-purple text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'chat'}
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              CHAT
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'settings' ? 'bg-lcars-blue text-black opacity-100' : 'bg-lcars-blue text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'settings'}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              SETTINGS
            </button>
            
            <button
              onClick={() => setActiveTab('appcontrol')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'appcontrol' ? 'bg-lcars-green text-black opacity-100' : 'bg-lcars-green text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'appcontrol'}
            >
              <Code className="h-4 w-4 flex-shrink-0" />
              APP CONTROL
            </button>
            
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'voice' ? 'bg-lcars-orange text-black opacity-100' : 'bg-lcars-orange text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'voice'}
            >
              <Volume2 className="h-4 w-4 flex-shrink-0" />
              VOICE
            </button>
            
            <button
              onClick={() => setActiveTab('memories')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'memories' ? 'bg-lcars-yellow text-black opacity-100' : 'bg-lcars-yellow text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'memories'}
            >
              <Brain className="h-4 w-4 flex-shrink-0" />
              MEMORIES
            </button>
            
            <button
              onClick={() => setActiveTab('mic')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'mic' ? 'bg-lcars-pink text-black opacity-100' : 'bg-lcars-pink text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'mic'}
            >
              <Mic className="h-4 w-4 flex-shrink-0" />
              MIC
            </button>
            
            <button
              onClick={() => setActiveTab('hands')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'hands' ? 'bg-lcars-cyan text-black opacity-100' : 'bg-lcars-cyan text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'hands'}
            >
              <Hand className="h-4 w-4 flex-shrink-0" />
              HANDS
            </button>
            
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'docs' ? 'bg-lcars-violet text-black opacity-100' : 'bg-lcars-violet text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'docs'}
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              DOCS
            </button>
            
            {canInviteUsers(user) && (
              <button
                onClick={() => setActiveTab('manage-family')}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars whitespace-nowrap ${
                  activeTab === 'manage-family' ? 'bg-lcars-red text-black opacity-100' : 'bg-lcars-red text-black opacity-75 hover:opacity-100'
                }`}
                aria-selected={activeTab === 'manage-family'}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                MANAGE FAMILY
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all lcars-tab text-lcars ${
                activeTab === 'shared' ? 'bg-lcars-teal text-black opacity-100' : 'bg-lcars-teal text-black opacity-75 hover:opacity-100'
              }`}
              aria-selected={activeTab === 'shared'}
            >
              <Share2 className="h-4 w-4 flex-shrink-0" />
              SHARED
            </button>
          </div>

          <div className="flex-1 min-h-0 md:overflow-visible">
            <TabsContent value="chat" className="h-full m-0 overflow-hidden md:overflow-visible">
              <ChatPane />
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0 overflow-hidden">
              <SettingsPane />
            </TabsContent>
            
            <TabsContent value="appcontrol" className="h-full m-0 overflow-hidden">
              <AppControlPane />
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
            
            {canInviteUsers(user) && (
              <TabsContent value="manage-family" className="h-full m-0 overflow-hidden">
                <ManageFamilyPane />
              </TabsContent>
            )}
            
            <TabsContent value="shared" className="h-full m-0 overflow-hidden">
              <SharedPane />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
