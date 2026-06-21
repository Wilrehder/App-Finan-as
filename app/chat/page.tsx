"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Mic, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBellClient } from "@/components/notification-bell-client";

export default function ChatPage() {
  const [input, setInput] = useState("");
  
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat-v2" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: [
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Olá! Sou o Finchat, seu assistente financeiro inteligente. Estou pronto para gerenciar suas finanças e responder suas dúvidas. O que vamos fazer hoje?"
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('finchat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((msg: any) => {
            const role = msg.role === 'bot' ? 'assistant' : msg.role;
            let parts = msg.parts;
            if (!parts && msg.content) {
              parts = [{ type: 'text', text: msg.content }];
            }
            return {
              id: msg.id || Date.now().toString() + Math.random().toString(),
              role,
              parts: parts || []
            };
          });
          setMessages(sanitized);
        }
      } catch (e) {
        console.error("Erro ao recuperar histórico:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('finchat_history', JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoaded]);

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
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
            <Image src="/logo.png" alt="Finchat" width={32} height={32} className="object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight">Finchat</span>
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
        
        {messages.map((msg) => (
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
                    Finchat
                  </div>
                )}
                
                {/* Texto da mensagem */}
                {msg.parts && msg.parts.some((p: any) => p.type === 'text') && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.parts
                      .filter((p: any) => p.type === 'text')
                      .map((p: any) => p.text)
                      .join('\n')}
                  </p>
                )}

                 {/* Exibição de Tool Calls (Ferramentas acionadas) */}
                 {msg.parts && msg.parts
                   .filter((p: any) => p.type.startsWith('tool-') || p.type === 'dynamic-tool')
                   .map((part: any) => {
                     const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.substring(5);
                     const { toolCallId, state, output, errorText } = part;
                     
                     if (state === 'output-available' && output) {
                       return (
                         <div key={toolCallId} className="mt-2 text-xs bg-black/20 p-2 rounded border border-white/10">
                           <span className="text-green-400 font-bold">✓ Executou: {toolName}</span>
                           {output.message && <p className="mt-1 opacity-80">{output.message}</p>}
                         </div>
                       );
                     } else if (state === 'output-error') {
                       return (
                         <div key={toolCallId} className="mt-2 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                           <span className="text-red-400 font-bold">❌ Erro no {toolName}</span>
                           {errorText && <p className="mt-1 opacity-80 text-red-300">{errorText}</p>}
                         </div>
                       );
                     } else {
                       // Estados de processamento: input-streaming, input-available, approval-requested, approval-responded
                       return (
                         <div key={toolCallId} className="mt-2 text-xs bg-black/20 p-2 rounded border border-white/10 flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                           <span className="text-primary font-bold">Processando: {toolName}...</span>
                         </div>
                       );
                     }
                   })}
              </div>
            </div>
          </div>
        ))}

         {isLoading && (
           messages[messages.length - 1]?.role !== 'assistant' ||
           (!messages[messages.length - 1].parts || messages[messages.length - 1].parts.length === 0)
         ) && (
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

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex flex-col gap-1.5 animate-in fade-in duration-200">
            <span className="font-bold flex items-center gap-1.5">⚠️ Erro de Comunicação</span>
            <p className="text-xs leading-relaxed opacity-90">
              Não foi possível obter resposta da IA. Se estiver testando localmente, certifique-se de configurar as variáveis de ambiente. Em produção, verifique a chave da OpenAI no painel da Vercel.
            </p>
            {error.message && (
              <code className="text-[10px] p-2 bg-black/30 rounded border border-white/5 font-mono overflow-x-auto break-all text-white">
                Detalhes: {error.message}
              </code>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Texto */}
      <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-white/5 z-40">
        <form onSubmit={handleSubmit} className="flex gap-2" id="tour-chat-input">
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
