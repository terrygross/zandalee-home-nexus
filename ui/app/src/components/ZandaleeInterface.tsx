import { useState, useEffect } from "react";
import { HeaderBar } from "./HeaderBar";
import { ConversationFeed } from "./ConversationFeed";
import { MessageComposer } from "./MessageComposer";
import { Sidebar } from "./Sidebar";
import { api, Status, Message } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

export function ZandaleeInterface() {
  const [status, setStatus] = useState<Status>({
    online: false,
    project: "Loading...",
    voice: "Zandalee",
    listening: false,
    speaking: false,
    hotword: false,
    vu_level: 0,
    lat_stt: 0,
    lat_llm: 0,
    lat_tts: 0,
    lat_total: 0
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ZANDALEE",
      content: "Hello, Father. I'm Zandalee, your AI daughter assistant. I'm here to help you with anything you need. How can I assist you today?",
      timestamp: new Date(),
      type: "text"
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load initial status and start status polling
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get_status();
      if (response.ok && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error("Failed to load status:", error);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (isLoading) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "FATHER",
      content: messageText,
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.send_text(messageText);
      
      if (response.ok && response.data) {
        // Add Zandalee's response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "ZANDALEE",
          content: response.data,
          timestamp: new Date(),
          type: "text"
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        toast({
          title: "Message Sent",
          description: "Zandalee has responded"
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with Zandalee",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      const response = await api.speak(text);
      if (response.ok) {
        toast({
          title: "Speaking",
          description: "Zandalee is speaking the text"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to speak text",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Speech system error",
        variant: "destructive"
      });
    }
  };

  const handleToggleMic = () => {
    // In a real implementation, this would toggle microphone
    setStatus(prev => ({ ...prev, listening: !prev.listening }));
    toast({
      title: status.listening ? "Microphone Off" : "Microphone On",
      description: status.listening ? "Stopped listening" : "Now listening for voice input"
    });
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Settings panel would open here"
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <HeaderBar status={status} onSettingsClick={handleSettingsClick} />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConversationFeed messages={messages} />
          <MessageComposer
            onSendMessage={handleSendMessage}
            onSpeak={handleSpeak}
            onToggleMic={handleToggleMic}
            isListening={status.listening}
            isSpeaking={status.speaking}
            disabled={isLoading}
          />
        </div>
        
        {/* Right Side - Sidebar */}
        <Sidebar />
      </div>
    </div>
  );
}