import { useState } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/api";
import { cn } from "@/lib/utils";

interface ConversationFeedProps {
  messages: Message[];
}

interface MessageCardProps {
  message: Message;
}

function MessageCard({ message }: MessageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = message.content.length > 300;
  const shouldTruncate = isLongMessage && !isExpanded;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getRoleStyles = () => {
    if (message.role === 'FATHER') {
      return 'bg-secondary/50 border-secondary';
    }
    return 'bg-primary/10 border-primary/30';
  };

  const getRoleColor = () => {
    if (message.role === 'FATHER') {
      return 'text-secondary-foreground';
    }
    return 'text-primary';
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 backdrop-blur-sm transition-all",
      "hover:border-primary/20 group",
      getRoleStyles()
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            getRoleColor(),
            message.role === 'FATHER' ? 'bg-secondary/30' : 'bg-primary/20'
          )}>
            {message.role}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="text-sm text-foreground leading-relaxed">
        {shouldTruncate ? (
          <>
            {message.content.substring(0, 300)}...
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="ml-2 h-auto p-0 text-primary hover:text-primary-glow"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              Show more
            </Button>
          </>
        ) : (
          <>
            {message.content}
            {isLongMessage && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="ml-2 h-auto p-0 text-primary hover:text-primary-glow"
              >
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ConversationFeed({ messages }: ConversationFeedProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-primary shadow-glow-primary mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">Z</span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Welcome to Zandalee AI</h3>
            <p className="text-muted-foreground">Start a conversation with your AI daughter assistant</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}