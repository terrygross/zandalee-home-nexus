
import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings, Mic, Hand, FileText, Brain, Volume2, Share2, Plus, FolderPlus, Sun, Moon, Monitor } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useSession } from '@/contexts/SessionContext';
import { useGatewayWS } from '@/hooks/useGatewayWS';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdminAudit } from '@/hooks/useSuperAdminAudit';
import { SuperAdminAuditBanner } from '@/components/SuperAdminAuditBanner';
import { ProjectChatProvider } from '@/contexts/ProjectChatContext';
import { useChatStorage } from '@/utils/chatStorage';
import { useTheme } from 'next-themes';
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
  const headerRef = useRef<HTMLDivElement>(null);
  const { isHealthy } = useGateway();
  const { user } = useSession();
  const { toast } = useToast();
  const { createNewChat, createNewProject } = useChatStorage();
  const { theme, setTheme } = useTheme();

  // WebSocket for permission events
  useGatewayWS((evt) => {
    if (evt.event === 'created') {
      toast({
        title: "Permission Request",
        description: `New permission request: ${evt.record?.kind}`,
      });
    }
  });

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

  // Measure header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--terminal-header-height', `${height}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [entries, hasNewAttempts]);

  const handleNewChat = () => {
    const chatId = createNewChat();
    toast({
      title: "New Chat Created",
      description: "Started a new conversation",
    });
  };

  const handleNewProject = () => {
    const projectId = createNewProject();
    toast({
      title: "New Project Created",
      description: "Started a new project",
    });
  };

  const cycleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };
  
  return (
    <ProjectChatProvider>
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Sticky Header and Navigation Container */}
          <div 
            ref={headerRef}
            className="sticky top-0 z-[100] flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border" 
            style={{ top: 'env(safe-area-inset-top)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:px-6 border-b border-border/50">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <Button
                  onClick={handleNewChat}
                  size="sm"
                  className="bg-lcars-purple hover:bg-lcars-pink text-black font-bold px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full flex-shrink-0"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">NEW CHAT</span>
                </Button>
                
                <Button
                  onClick={handleNewProject}
                  size="sm"
                  className="bg-lcars-cyan hover:bg-lcars-teal text-black font-bold px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full flex-shrink-0"
                >
                  <FolderPlus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">NEW PROJECT</span>
                </Button>
                
                <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex-shrink-0">
                  ZANDALEE TERMINAL
                </h1>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={cycleTheme}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 bg-lcars-cyan hover:bg-lcars-teal text-black font-bold px-2 sm:px-3 py-1.5 text-xs rounded-full"
                  title="Toggle Theme"
                >
                  {getThemeIcon()}
                  <span className="hidden sm:inline">THEME</span>
                </Button>
                
                <div className="text-center">
                  <div className="text-xs font-bold text-muted-foreground">GATEWAY</div>
                  <Badge variant={isHealthy ? "default" : "destructive"} className="text-xs px-2 py-0.5">
                    {isHealthy ? "ONLINE" : "OFFLINE"}
                  </Badge>
                </div>
              </div>
            </div>
          
            {/* Tab Navigation */}
            <div className="px-3 sm:px-6 pb-3 pt-3">
              <div className="border-2 border-border rounded-[20px] p-1 overflow-hidden">
                <div className="flex w-full gap-1">
                  {[
                    { id: 'chat', label: 'CHAT', icon: MessageCircle, color: 'bg-lcars-purple' },
                    { id: 'voice', label: 'VOICE', icon: Volume2, color: 'bg-lcars-orange' },
                    { id: 'memories', label: 'MEMORIES', icon: Brain, color: 'bg-lcars-yellow' },
                    { id: 'mic', label: 'MIC', icon: Mic, color: 'bg-lcars-pink' },
                    { id: 'hands', label: 'HANDS', icon: Hand, color: 'bg-lcars-cyan' },
                    { id: 'docs', label: 'DOCS', icon: FileText, color: 'bg-lcars-violet' },
                    { id: 'shared', label: 'SHARED', icon: Share2, color: 'bg-lcars-teal' },
                    { id: 'settings', label: 'SETTINGS', icon: Settings, color: 'bg-lcars-blue' }
                   ].filter(tab => {
                     // Hide Settings tab for non-admin users
                     if (tab.id === 'settings' && user?.role !== 'superadmin' && user?.role !== 'admin') {
                       return false;
                     }
                     return true;
                   }).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex-1 inline-flex items-center justify-center gap-1 px-1 md:px-3 py-2.5 min-w-0
                          text-xs md:text-sm font-bold rounded-full transition-all text-black touch-manipulation
                          ${activeTab === tab.id 
                            ? 'bg-lcars-orange shadow-sm' 
                            : `${tab.color} hover:bg-lcars-orange`
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden md:inline whitespace-nowrap overflow-hidden text-ellipsis">{tab.label}</span>
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
          </div>
        
          {/* Main Content - Single Scroll Container */}
          <div className="flex-1 overflow-auto min-h-0">
            <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ChatPane />
            </TabsContent>
            
            <TabsContent value="voice" className="h-full m-0 p-4">
              <VoicePane />
            </TabsContent>
            
            <TabsContent value="memories" className="h-full m-0 p-4">
              <MemoriesPane />
            </TabsContent>
            
            <TabsContent value="mic" className="h-full m-0 p-4">
              <MicWizardPane />
            </TabsContent>
            
            <TabsContent value="hands" className="h-full m-0 p-4">
              <HandsPane />
            </TabsContent>
            
            <TabsContent value="docs" className="h-full m-0 p-4">
              <DocsPane />
            </TabsContent>
            
            <TabsContent value="shared" className="h-full m-0 p-4">
              <SharedPane />
            </TabsContent>

            {/* Settings tab - conditionally rendered for admins only */}
            {(user?.role === 'superadmin' || user?.role === 'admin') && (
              <TabsContent value="settings" className="h-full m-0">
                <SettingsPane />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </ProjectChatProvider>
  );
};
