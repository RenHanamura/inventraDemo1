import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, RefreshCw, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatAction } from '@/hooks/useInventraChat';
import ReactMarkdown from 'react-markdown';

interface InventraChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onAction: (action: ChatAction) => void;
  onClear: () => void;
  quickPrompts: { id: string; label: string }[];
}

export function InventraChatPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  onSendMessage,
  onAction,
  onClear,
  quickPrompts,
}: InventraChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
          "h-[600px] max-h-[calc(100vh-6rem)]",
          "rounded-2xl overflow-hidden shadow-2xl",
          "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
          "border border-white/10 backdrop-blur-xl",
          "flex flex-col",
          "animate-scale-in origin-bottom-right"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-primary/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Inventra AI</h3>
              <p className="text-xs text-slate-400">Your inventory assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              title="Clear chat"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-slate-700/80 text-slate-100 rounded-bl-sm"
                  )}
                >
                  <div className="prose prose-sm prose-invert max-w-none leading-relaxed [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  
                  {/* Action buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                      {message.actions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          size="sm"
                          onClick={() => onAction(action)}
                          className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-0 gap-1"
                        >
                          {action.type === 'navigate' ? (
                            <ArrowRight className="h-3 w-3" />
                          ) : (
                            <ExternalLink className="h-3 w-3" />
                          )}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700/80 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-400">Inventra is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Badge
                  key={prompt.id}
                  variant="outline"
                  className="cursor-pointer text-xs py-1.5 px-3 bg-white/5 border-white/20 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => handleQuickPrompt(prompt.label)}
                >
                  {prompt.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary/50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 bg-primary hover:bg-primary/90 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Powered by Inventra AI • Responses may vary
          </p>
        </form>
      </div>
    </>
  );
}
