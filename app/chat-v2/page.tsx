"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Mic, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBellClient } from "@/components/notification-bell-client";

const isConfirmationRequest = (text: string) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("confirma?") ||
    lower.includes("confirma ?") ||
    lower.includes("confirmar?") ||
    lower.includes("confirmar ?") ||
    lower.includes("posso confirmar") ||
    lower.includes("você confirma") ||
    lower.includes("deseja confirmar")
  );
};

export default function ChatV2Page() {
  const [input, setInput] = useState("");
  
  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat-v2" }),
    messages: [
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Olá! Sou a nova versão inteligente do Finchat (V2). Estou pronto para conversar e gerenciar suas finanças. O que vamos fazer hoje?"
          }
        ]
      }
    ] as UIMessage[]
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearHistory = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Histórico limpo! Como posso ajudar?"
          }
        ]
      }
    ]);
  };

  return (
    <div className="chat-main-container fixed inset-0 bottom-[80px] max-w-md mx-auto flex flex-col">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-lg border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary">
            <Image src="/logo.png" alt="Finchat" width={32} height={32} className="object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight">Finchat V2 (Beta)</span>
        </div>
        <Link href="/calendario" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors">
          <Calendar size={20} />
        </Link>
        <NotificationBellClient />
      </div>

      {/* Area de Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 no-scrollbar pt-4 pb-4">
        {messages.length > 1 && (
          <div className="flex justify-center pt-2 pb-2">
            <button 
              onClick={clearHistory}
              className="text-[10px] uppercase tracking-wider bg-secondary/50 text-muted-foreground px-3 py-1.5 rounded-full hover:bg-secondary flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Limpar Histórico
            </button>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const msgText = msg.parts
            ?.filter((p: any) => p.type === 'text')
            ?.map((p: any) => p.text)
            ?.join('\n') || '';
          const isLast = index === messages.length - 1;
          const showConfirmation = isLast && msg.role === 'assistant' && !isLoading && isConfirmationRequest(msgText);

          return (
            <div
              key={msg.id}
              className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                <div
                  className={`p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2 opacity-70 text-xs font-semibold tracking-wide uppercase">
                      <Image src="/logo.png" alt="Finchat" width={14} height={14} className="object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" /> 
                      Agente V2
                    </div>
                  )}
                  
                  {/* Texto da mensagem */}
                  {msg.parts.some((p: any) => p.type === 'text') && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.parts
                        .filter((p: any) => p.type === 'text')
                        .map((p: any) => p.text)
                        .join('\n')}
                    </p>
                  )}

                  {/* Exibição de Tool Calls (Ferramentas acionadas) */}
                  {msg.parts
                    .filter((p: any) => p.type === 'tool-call')
                    .map((part: any) => {
                      const { toolName, toolCallId, state, result } = part;
                      
                      if (state === 'result' && result) {
                        return (
                          <div key={toolCallId} className="mt-2 text-xs bg-black/20 p-2 rounded border border-white/10">
                            <span className="text-green-400 font-bold">✓ Executou: {toolName}</span>
                            {result.message && <p className="mt-1 opacity-80">{result.message}</p>}
                          </div>
                        );
                      } else if (state === 'call') {
                        return (
                          <div key={toolCallId} className="mt-2 text-xs bg-black/20 p-2 rounded border border-white/10 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span className="text-primary font-bold">Processando: {toolName}...</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                </div>

                {/* Botões de Confirmação */}
                {showConfirmation && (
                  <div className="flex gap-2 mt-2 w-full justify-start animate-in fade-in slide-in-from-top-1 duration-200">
                    <Button
                      size="sm"
                      className="rounded-full px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                      onClick={() => sendMessage({ text: "aceitar" })}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-5 h-9 bg-secondary hover:bg-secondary/80 border-white/10 text-foreground font-semibold shadow-sm"
                      onClick={() => sendMessage({ text: "recusar" })}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Texto */}
      <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-white/5 z-40">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Mande sua despesa, receita ou pergunta..."
            className="flex-1 rounded-full h-14 bg-secondary border-none text-base px-5"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
            disabled={isLoading || !input.trim()}
          >
            <Send size={20} className="text-primary-foreground ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}
