import { useState, useEffect } from 'react';
import { Brain, BookOpen, Loader2, RefreshCw } from 'lucide-react';

import { ChatInterface } from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useMemory } from '@/hooks/useMemory';
import { useDiary } from '@/hooks/useDiary';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';

interface ProjectChatPaneProps {
  selectedProject: any;
}

export const ProjectChatPane = ({ selectedProject }: ProjectChatPaneProps) => {
  const { user } = useSession();
  const {
    messages,
    isLoading,
    streamingMessage,
    handleSendMessage,
    handleClearChat,
    handleExportChat,
    handleImportChat,
  } = useChat(selectedProject);
  const [providers, setProviders] = useState<any[]>([]);
	const [selectedProvider, setSelectedProvider] = useState<any>(null);
	const [models, setModels] = useState<any[]>([]);
	const [selectedModel, setSelectedModel] = useState<any>(null);
  const { toast } = useToast();
  const { getProviders, getModels } = useGateway();

  // Memory
  const { memories, loadMemories, loading: loadingMemories } = useMemory(selectedProject);

  // Diary
  const { diary, loadDiary, loading: loadingDiary } = useDiary(selectedProject);

  useEffect(() => {
		const fetchProviders = async () => {
			try {
				const response = await getProviders();
				setProviders(response);
				setSelectedProvider(response[0]);
			} catch (error: any) {
				toast({
					title: "Error",
					description: error?.message || "Failed to load providers",
					variant: "destructive",
				});
			}
		};
		fetchProviders();
	}, [getProviders, toast]);

	useEffect(() => {
		const fetchModels = async () => {
			if (!selectedProvider) return;
			try {
				const response = await getModels(selectedProvider.id);
				setModels(response);
				setSelectedModel(response[0]);
			} catch (error: any) {
				toast({
					title: "Error",
					description: error?.message || "Failed to load models",
					variant: "destructive",
				});
			}
		};
		fetchModels();
	}, [getModels, selectedProvider, toast]);

  return (
    <div className="flex flex-col h-full">
      {/* Memory & Diary Section - Fixed at top */}
      <div className="flex-shrink-0 border-b border-border/50">
        <div className="p-4 space-y-4">
          {/* Memory Section */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Memories ({memories.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadMemories}
                disabled={loadingMemories}
              >
                {loadingMemories ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-32">
              <div className="space-y-2 pr-4">
                {memories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No memories loaded</p>
                ) : (
                  memories.slice(0, 5).map((memory, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/50 rounded border-l-2 border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">{memory.created_at}</p>
                      <p>{memory.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Diary Section */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Diary ({diary.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDiary}
                disabled={loadingDiary}
              >
                {loadingDiary ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-32">
              <div className="space-y-2 pr-4">
                {diary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diary entries loaded</p>
                ) : (
                  diary.slice(0, 5).map((entry, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/50 rounded border-l-2 border-secondary/20">
                      <p className="text-xs text-muted-foreground mb-1">{entry.created_at}</p>
                      <p>{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Chat Section - Takes remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatInterface
          selectedProject={selectedProject}
          onSendMessage={handleSendMessage}
          messages={messages}
          isLoading={isLoading}
          streamingMessage={streamingMessage}
          onClearChat={handleClearChat}
          onExportChat={handleExportChat}
          onImportChat={handleImportChat}
          providers={providers}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
};
