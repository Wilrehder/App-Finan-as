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
import { transcribeAudio } from "./audio-actions";

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

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mimeTypeRef = useRef<string>('');

  const playSound = (type: 'start' | 'stop' | 'send') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'start') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      } else if (type === 'stop') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      } else if (type === 'send') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      }
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.error(e);
    }
  };

  function getSupportedMimeType(): string {
    if (mimeTypeRef.current) return mimeTypeRef.current;
    const candidates = [
      'audio/mp4',          // iOS Safari
      'audio/aac',          // iOS fallback
      'audio/webm;codecs=opus', // Chrome/Android
      'audio/webm',         // Chrome fallback
      'audio/ogg',          // Firefox
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeTypeRef.current = type;
        return type;
      }
    }
    mimeTypeRef.current = '';
    return '';
  }

  function isStreamAlive(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const tracks = stream.getTracks();
    return tracks.length > 0 && tracks.every(t => t.readyState === 'live');
  }

  function killStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  const startRecording = async () => {
    try {
      setIsTranscribing(false);
      let stream = streamRef.current;
      if (!isStreamAlive(stream)) {
        killStream();
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      if (!stream) {
        throw new Error("Microphone stream not available");
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioCtxRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        const canvas = canvasRef.current;
        if (!canvas) { animationRef.current = requestAnimationFrame(drawVisualizer); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        animationRef.current = requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = 3, gap = 2;
        const maxBars = Math.floor(canvas.width / (barWidth + gap));
        for (let i = 0; i < maxBars; i++) {
          const value = dataArray[Math.floor((i / maxBars) * bufferLength)];
          const height = Math.max(4, (value / 255) * canvas.height);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + gap), (canvas.height - height) / 2, barWidth, height, 2);
          ctx.fill();
        }
      };

      let mediaRecorder: MediaRecorder;
      const mimeType = getSupportedMimeType();
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        killStream();
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';

        let ext = 'webm';
        if (actualMime.includes('mp4') || actualMime.includes('aac') || actualMime.includes('m4a')) ext = 'm4a';
        else if (actualMime.includes('ogg') || actualMime.includes('oga')) ext = 'ogg';
        else if (actualMime.includes('wav')) ext = 'wav';

        const totalSize = audioChunksRef.current.reduce((s, b) => s + b.size, 0);

        if (totalSize < 500) {
          setIsTranscribing(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            parts: [{ type: 'text', text: '⚠️ Não captei nenhum áudio. Verifique se o microfone está permitido e tente novamente.' }]
          }]);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${ext}`);

        setIsTranscribing(true);
        const res = await transcribeAudio(formData);
        setIsTranscribing(false);
        if (res.success && res.text) {
          sendMessage({ text: res.text });
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            parts: [{ type: 'text', text: res.error || 'Erro ao transcrever áudio.' }]
          }]);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      playSound('start');
      setTimeout(() => drawVisualizer(), 50);
    } catch (error: any) {
      console.error('Erro ao acessar microfone:', error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      playSound('stop');
      killStream();
    }
  };

  useEffect(() => {
    return () => {
      killStream();
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
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

  const isLoading = status === 'submitted' || status === 'streaming' || isTranscribing;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    playSound('send');
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

                {/* Botões de Confirmação */}
                {showConfirmation && (
                  <div className="flex gap-2 mt-2 w-full justify-start animate-in fade-in slide-in-from-top-1 duration-200">
                    <Button
                      size="sm"
                      className="rounded-full px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                      onClick={() => { playSound('send'); sendMessage({ text: "aceitar" }); }}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-5 h-9 bg-secondary hover:bg-secondary/80 border-white/10 text-foreground font-semibold shadow-sm"
                      onClick={() => { playSound('send'); sendMessage({ text: "recusar" }); }}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

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

      {/* Input de Texto / Áudio */}
      <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-white/5 z-40">
        <form onSubmit={handleSubmit} className="flex gap-2" id="tour-chat-input">
          {isRecording ? (
            <div className="flex-1 rounded-full h-14 bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-between px-6 font-medium">
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Gravando</span>
              </div>
              <canvas 
                ref={canvasRef} 
                width={100} 
                height={24} 
                className="opacity-100"
              />
            </div>
          ) : (
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Mande sua despesa, receita ou pergunta..."
              className="flex-1 rounded-full h-14 bg-secondary border-none text-base px-5"
              disabled={isLoading}
            />
          )}

          {isRecording ? (
            <Button 
              type="button" 
              onClick={stopRecording}
              size="icon" 
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 flex-shrink-0"
            >
              <Square size={20} className="text-white" />
            </Button>
          ) : (
            <>
              {input.trim() ? (
                <Button 
                  type="submit" 
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
                  disabled={isLoading}
                >
                  <Send size={20} className="text-primary-foreground ml-1" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={startRecording}
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 flex-shrink-0 text-foreground"
                  disabled={isLoading}
                >
                  <Mic size={20} />
                </Button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
