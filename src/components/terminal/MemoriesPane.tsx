import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MessageCircle, FolderOpen, Brain, MoreHorizontal, Plus, History, Archive } from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useToast } from '@/hooks/use-toast';
import { useChatStorage } from '@/utils/chatStorage';

export const MemoriesPane = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { memorySearch } = useGateway();
  const { toast } = useToast();
  const { 
    getChatStore, 
    getProjectStore, 
    createNewChat, 
    createProject,
    deleteChat,
    deleteProject,
    duplicateChat,
    renameChat,
    renameProject
  } = useChatStorage();

  // Get chat and project data
  const chatStore = getChatStore();
  const projectStore = getProjectStore();

  // Filter chats and projects based on search
  const filteredChats = chatStore.items.filter(chat =>
    chat.title.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
    chat.messages?.some(msg => msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
  );

  const filteredProjects = projectStore.items.filter(project =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const handleMemorySearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await memorySearch(searchQuery, 20);
      setMemories(results?.results || []);
    } catch (error: any) {
      toast({
        title: 'Search Error',
        description: error.message || 'Failed to search memories',
        variant: 'destructive'
      });
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'memory' | 'chat' | 'project') => {
    if (e.key === 'Enter') {
      switch (type) {
        case 'memory':
          handleMemorySearch();
          break;
        case 'chat':
          // Chat search is handled by filter
          break;
        case 'project':
          // Project search is handled by filter
          break;
      }
    }
  };

  const handleChatAction = (action: string, chatId: string) => {
    switch (action) {
      case 'duplicate':
        duplicateChat(chatId);
        toast({ title: 'Chat duplicated successfully' });
        break;
      case 'delete':
        deleteChat(chatId);
        toast({ title: 'Chat deleted successfully' });
        break;
      case 'rename':
        const newName = prompt('Enter new chat name:');
        if (newName) {
          renameChat(chatId, newName);
          toast({ title: 'Chat renamed successfully' });
        }
        break;
    }
  };

  const handleProjectAction = (action: string, projectId: string) => {
    switch (action) {
      case 'delete':
        deleteProject(projectId);
        toast({ title: 'Project deleted successfully' });
        break;
      case 'rename':
        const newName = prompt('Enter new project name:');
        if (newName) {
          renameProject(projectId, newName);
          toast({ title: 'Project renamed successfully' });
        }
        break;
    }
  };

  const handleNewChat = () => {
    createNewChat();
    toast({ title: 'New chat created' });
  };

  const handleNewProject = () => {
    createProject();
    toast({ title: 'New project created' });
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Desktop/Tablet: Side by side layout */}
      <div className="hidden md:flex flex-1 gap-4">
        {/* Chat History Section */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-lcars-purple" />
                Chat History
              </div>
              <Button onClick={handleNewChat} size="sm" className="bg-lcars-purple hover:bg-lcars-pink">
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
            <div className="flex space-x-2 flex-shrink-0">
              <Input
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'chat')}
                placeholder="Search chats..."
                className="bg-lcars-surface border-lcars-blue"
              />
              <Button size="sm" className="bg-lcars-blue hover:bg-lcars-cyan">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat) => (
                    <div key={chat.id} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-purple/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">{chat.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(chat.updated_at).toLocaleDateString()} • {chat.messages?.length || 0} messages
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-lcars-blue z-[300]">
                            <DropdownMenuItem onClick={() => handleChatAction('duplicate', chat.id)}>
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChatAction('rename', chat.id)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChatAction('delete', chat.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {chatSearchQuery ? `No chats found for "${chatSearchQuery}"` : "No chat history"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Projects History Section */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-lcars-cyan" />
                Projects History
              </div>
              <Button onClick={handleNewProject} size="sm" className="bg-lcars-cyan hover:bg-lcars-teal">
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
            <div className="flex space-x-2 flex-shrink-0">
              <Input
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'project')}
                placeholder="Search projects..."
                className="bg-lcars-surface border-lcars-blue"
              />
              <Button size="sm" className="bg-lcars-blue hover:bg-lcars-cyan">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-cyan/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">{project.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(project.updated_at).toLocaleDateString()} • {project.chats?.length || 0} chats
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-lcars-blue z-[300]">
                            <DropdownMenuItem onClick={() => handleProjectAction('rename', project.id)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleProjectAction('delete', project.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {projectSearchQuery ? `No projects found for "${projectSearchQuery}"` : "No projects"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Memory Search Section */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-lcars-orange" />
              Memory Search
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
            <div className="flex space-x-2 flex-shrink-0">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'memory')}
                placeholder="Search memories..."
                className="bg-lcars-surface border-lcars-blue"
              />
              <Button onClick={handleMemorySearch} disabled={loading || !searchQuery.trim()} size="sm" className="bg-lcars-orange hover:bg-lcars-yellow">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Searching...
                  </div>
                ) : memories.length > 0 ? (
                  memories.map((memory, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-orange/30">
                      <p className="text-sm mb-2">{memory.text || memory.content || 'No content'}</p>
                      <div className="flex flex-wrap gap-1">
                        {memory.tags?.map((tag: string, tagIndex: number) => (
                          <span
                            key={tagIndex}
                            className="text-xs bg-lcars-blue/20 text-lcars-text-primary px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {memory.kind && (
                          <span className="text-xs bg-lcars-orange/20 text-lcars-text-primary px-2 py-1 rounded">
                            {memory.kind}
                          </span>
                        )}
                      </div>
                      {memory.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {memory.source}
                        </p>
                      )}
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No memories found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Enter a search query to find memories
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Stacked layout with tabs */}
      <div className="md:hidden flex-1">
        <Tabs defaultValue="history" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="history">Chat History</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-lcars-purple" />
                    Chat History
                  </div>
                  <Button onClick={handleNewChat} size="sm" className="bg-lcars-purple hover:bg-lcars-pink">
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
                <div className="flex space-x-2 flex-shrink-0">
                  <Input
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="bg-lcars-surface border-lcars-blue"
                  />
                  <Button size="sm" className="bg-lcars-blue hover:bg-lcars-cyan">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-2 pr-4">
                    {filteredChats.length > 0 ? (
                      filteredChats.map((chat) => (
                        <div key={chat.id} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-purple/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate text-sm">{chat.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(chat.updated_at).toLocaleDateString()} • {chat.messages?.length || 0} messages
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-lcars-blue z-[300]">
                                <DropdownMenuItem onClick={() => handleChatAction('duplicate', chat.id)}>
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChatAction('rename', chat.id)}>
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChatAction('delete', chat.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        {chatSearchQuery ? `No chats found for "${chatSearchQuery}"` : "No chat history"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-lcars-cyan" />
                    Projects
                  </div>
                  <Button onClick={handleNewProject} size="sm" className="bg-lcars-cyan hover:bg-lcars-teal">
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
                <div className="flex space-x-2 flex-shrink-0">
                  <Input
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="bg-lcars-surface border-lcars-blue"
                  />
                  <Button size="sm" className="bg-lcars-blue hover:bg-lcars-cyan">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-2 pr-4">
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((project) => (
                        <div key={project.id} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-cyan/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate text-sm">{project.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(project.updated_at).toLocaleDateString()} • {project.chats?.length || 0} chats
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-lcars-blue z-[300]">
                                <DropdownMenuItem onClick={() => handleProjectAction('rename', project.id)}>
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleProjectAction('delete', project.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        {projectSearchQuery ? `No projects found for "${projectSearchQuery}"` : "No projects"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memories" className="flex-1 mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-lcars-orange" />
                  Memory Search
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 pb-4">
                <div className="flex space-x-2 flex-shrink-0">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'memory')}
                    placeholder="Search memories..."
                    className="bg-lcars-surface border-lcars-blue"
                  />
                  <Button onClick={handleMemorySearch} disabled={loading || !searchQuery.trim()} size="sm" className="bg-lcars-orange hover:bg-lcars-yellow">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-2 pr-4">
                    {loading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Searching...
                      </div>
                    ) : memories.length > 0 ? (
                      memories.map((memory, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-lcars-surface/20 border-lcars-orange/30">
                          <p className="text-sm mb-2">{memory.text || memory.content || 'No content'}</p>
                          <div className="flex flex-wrap gap-1">
                            {memory.tags?.map((tag: string, tagIndex: number) => (
                              <span
                                key={tagIndex}
                                className="text-xs bg-lcars-blue/20 text-lcars-text-primary px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {memory.kind && (
                              <span className="text-xs bg-lcars-orange/20 text-lcars-text-primary px-2 py-1 rounded">
                                {memory.kind}
                              </span>
                            )}
                          </div>
                          {memory.source && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Source: {memory.source}
                            </p>
                          )}
                        </div>
                      ))
                    ) : searchQuery ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No memories found for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Enter a search query to find memories
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
