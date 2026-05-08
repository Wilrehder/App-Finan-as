"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Send, Mic, Square, Trash2, Calendar } from "lucide-react"
import Link from "next/link"
import { parseUserIntent, confirmTransaction, confirmFixedTransaction, deleteLastTransaction, confirmReminder } from "./actions"
import { transcribeAudio } from "./audio-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationBellClient } from "@/components/notification-bell-client"

type MessageOption = {
  label: string;
  action: string;
  primary?: boolean;
};

type Message = {
  id: string
  role: "user" | "bot"
  content: string
  options?: MessageOption[]
  payload?: any
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "bot",
    content: "Olá! O que você deseja fazer hoje?",
    options: [
      { label: "Despesa", action: "despesa" },
      { label: "Receita", action: "receita" },
      { label: "Resumo", action: "resumo_opcoes" }
    ]
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [isLoaded, setIsLoaded] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editModal, setEditModal] = useState<{ payload: any; msgId: string } | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  // Stream cacheado — pedimos permissão do mic uma só vez
  const streamRef = useRef<MediaStream | null>(null)
  // MIME type detectado uma vez e reutilizado
  const mimeTypeRef = useRef<string>('')

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
      // Ignore audio context errors on browsers that block it without user gesture
    }
  }

  const startRecording = async () => {
    try {
      // Pega o novo stream PRIMEIRO, depois libera o antigo.
      // Isso evita a race condition do iOS onde killStream() solta o mic e
      // getUserMedia() tenta pegar antes do OS liberar o recurso.
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1,
          }
        });
      } catch {
        // Fallback: tenta sem constraints especiais (mais compatível com iOS)
        newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Só libera o stream antigo depois de ter o novo
      killStream();
      streamRef.current = newStream;
      const stream = newStream;

      // AudioContext — no iOS começa em estado 'suspended', resume() é obrigatório
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioCtxRef.current = audioContext;

      // Força resume (necessário no iOS após interação do usuário)
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

      // Tenta criar o MediaRecorder com o MIME mais adequado
      let mediaRecorder: MediaRecorder;
      const mimeType = getSupportedMimeType();
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        // Se falhou com o MIME sugerido, deixa o browser decidir
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        killStream(); // Garantir que o microfone seja liberado completamente do iOS
        
        // Usa o MIME real gravado (não o que foi pedido — no iOS podem divergir)
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';

        let ext = 'webm';
        if (actualMime.includes('mp4') || actualMime.includes('aac') || actualMime.includes('m4a')) ext = 'm4a';
        else if (actualMime.includes('ogg') || actualMime.includes('oga')) ext = 'ogg';
        else if (actualMime.includes('wav')) ext = 'wav';

        const totalSize = audioChunksRef.current.reduce((s, b) => s + b.size, 0);

        if (totalSize < 500) {
          // Blob vazio ou minúsculo = gravação falhou silenciosamente
          setLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'bot',
            content: '⚠️ Não captei nenhum áudio. Verifique se o microfone está permitido e tente novamente.'
          }]);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${ext}`);

        setLoading(true);
        const res = await transcribeAudio(formData);
        if (res.success && res.text) {
          handleSend(res.text);
        } else {
          setLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'bot',
            content: res.error || 'Erro ao transcrever áudio.'
          }]);
        }
      };

      // timeslice de 250ms — garante que ondataavailable dispare regularmente (essencial no iOS)
      mediaRecorder.start(250);
      setIsRecording(true);
      playSound('start');
      setTimeout(() => drawVisualizer(), 50);
    } catch (error: any) {
      console.error('Erro ao acessar microfone:', error);

      alert("Não foi possível acessar o microfone. Verifique as permissões.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      playSound('stop')
      killStream(); // Força o encerramento das tracks de áudio aqui também
    }
  }

  // ─── Detecta MIME type suportado (iOS usa audio/mp4, outros usam webm) ────────────────
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
    mimeTypeRef.current = ''; // browser decides
    return '';
  }

  // ─── Verifica se o stream em cache ainda está válido ──────────────────────────────
  function isStreamAlive(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const tracks = stream.getTracks();
    return tracks.length > 0 && tracks.every(t => t.readyState === 'live');
  }

  // ─── Descarta stream morto e limpa a referência ───────────────────────────────
  function killStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  // Libera o stream apenas quando o componente desmonta
  useEffect(() => {
    return () => {
      killStream();
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const saved = localStorage.getItem('finchat_history')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch (e) {}
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('finchat_history', JSON.stringify(messages))
    }
  }, [messages, isLoaded])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const clearHistory = () => {
    setMessages(INITIAL_MESSAGES)
    localStorage.removeItem('finchat_history')
    setShowClearConfirm(false)
  }

  const handleSend = async (text: string, forceAction?: string, payload?: any) => {
    if (!text.trim() && !forceAction) return

    playSound('send')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim() || forceAction || "..."
    }

    setMessages(prev => {
      // Remover botões da última mensagem do bot ao interagir
      const newPrev = [...prev]
      if (newPrev.length > 0 && newPrev[newPrev.length - 1].role === 'bot') {
        newPrev[newPrev.length - 1].options = undefined
      }
      return [...newPrev, userMessage]
    })
    
    setInput("")
    setLoading(true)

    try {
      if (forceAction === 'nav_settings') {
        window.location.href = '/configuracoes'
        return
      } else if (forceAction === 'confirmar') {
        const response = await confirmTransaction(payload)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: response.message
        }])
      } else if (forceAction === 'confirmar_fixa') {
        const response = await confirmFixedTransaction(payload)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: response.message
        }])
      } else if (forceAction === 'confirmar_lembrete') {
        const response = await confirmReminder(payload)
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: response.message
        }])
      } else if (forceAction === 'cancelar') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Tudo bem, operação cancelada. O que mais deseja fazer?",
          options: [
            { label: "Despesa", action: "despesa" },
            { label: "Receita", action: "receita" }
          ]
        }])
      } else if (forceAction === 'confirm_delete') {
        const response = await deleteLastTransaction()
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: response.message
        }])
      } else if (forceAction === 'despesa') {
         setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Certo, é uma despesa. Me fale o valor e com o que foi.\n\n💬 *\"Gastei 150 no mercado\"* ou *\"paguei 80 de farmacia\"*"
        }])
      } else if (forceAction === 'receita') {
         setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Legal, uma receita. Qual o valor e de onde veio?\n\n💬 *\"Recebi 3.000 de salario\"* ou *\"caiu 500 de freelance\""
        }])
      } else if (forceAction === 'fixa') {
         setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Vamos cadastrar uma conta fixa! É uma despesa ou receita?\n\n💬 *\"Despesa fixa de 200 reais todo dia 10\"* ou *\"Receita fixa de 3 mil todo dia 5\""
        }])
      } else if (forceAction === 'confirm_delete_prompt') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Você deseja apagar a Última transação que você registrou? Isso não pode ser desfeito.",
          options: [
            { label: "Cancelar", action: "cancelar" },
            { label: "Sim, apagar", action: "confirm_delete", primary: true }
          ]
        }])
      } else if (forceAction === 'resumo_opcoes') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "De qual período você gostaria de ver o resumo?",
          options: [
            { label: "Hoje", action: "resumo_hoje" },
            { label: "Ontem", action: "resumo_ontem" },
            { label: "Esta semana", action: "resumo_semana" },
            { label: "Outro", action: "resumo_outro" }
          ]
        }])
      } else if (forceAction === 'resumo_outro') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Me diga de qual período você quer o relatório. (Ex: 'abril', 'ano 2026', 'mês 05')"
        }])
      } else if (forceAction === 'resumo_hoje') {
        const response = await parseUserIntent('resumo hoje')
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: response.message }])
      } else if (forceAction === 'resumo_ontem') {
        const response = await parseUserIntent('resumo ontem')
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: response.message }])
      } else if (forceAction === 'resumo_semana') {
        const response = await parseUserIntent('resumo desta semana')
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: response.message }])
      } else if (forceAction === 'resumo') {
        const response = await parseUserIntent('resumo deste mês')
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: response.message }])
      } else {
        // Context Awareness: Check what the bot asked last
        const lastBotMessage = messages[messages.length - 1];
        let textToParse = userMessage.content;
        let contextPayload = undefined;
        
        if (lastBotMessage && lastBotMessage.role === 'bot') {
          if (lastBotMessage.content.includes("Me diga de qual período você quer o relatório")) {
            textToParse = "resumo " + textToParse;
          } else if (lastBotMessage.content.includes("Certo, é uma despesa. Me fale o valor")) {
            textToParse = "despesa " + textToParse;
          } else if (lastBotMessage.content.includes("Legal, uma receita. Qual o valor")) {
            textToParse = "receita " + textToParse;
          }
          
          // Pass context along if the bot was asking a follow up question
          if (lastBotMessage.payload) {
            contextPayload = lastBotMessage.payload;
          }
        }

        // Intent parsing normal
        const response = await parseUserIntent(textToParse, contextPayload)
        
        let newBotMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: response.message,
        }

        // Se for um relatório, não pede confirmação. Se for registro e sucesso, pede.
        if (response.success && (response as any).payload && (response as any).payload.action === 'open_settings') {
          newBotMsg.options = [
            { label: "Ir para Ajustes", action: "nav_settings", primary: true }
          ]
        } else if (response.success && (response as any).payload && !(response as any).isReport && !(response as any).isDeleteRequest) {
          const intent = (response as any).payload?.intent;
          const isFixed = intent === 'register_fixed';
          const isIncomplete = intent === 'incomplete_fixed';

          // Sempre salva o payload para manter contexto entre turnos
          newBotMsg.payload = (response as any).payload;

          if (!isIncomplete) {
            // Só exibe botões de confirmar quando temos dados completos
            const confirmAction = intent === 'register_fixed' ? 'confirmar_fixa' : 
                                 intent === 'reminder' ? 'confirmar_lembrete' : 'confirmar';
            newBotMsg.options = [
              { label: "Cancelar", action: "cancelar" },
              { label: "Confirmar", action: confirmAction, primary: true }
            ]
          }
        } else if (response.success && (response as any).isDeleteRequest) {
          newBotMsg.options = [
            { label: "Cancelar", action: "cancelar" },
            { label: "Sim, apagar", action: "confirm_delete", primary: true }
          ]
          newBotMsg.payload = (response as any).payload
        } else if (!response.success) {
          // Mantém contexto se existia (resposta errada para pergunta do bot)
          if ((response as any).payload) {
            newBotMsg.payload = (response as any).payload;
          }
          if ((response as any).isShowCapabilities) {
            // Sem contexto — exibe menu completo de capacidades
            newBotMsg.options = [
              { label: "💸 Despesa", action: "despesa" },
              { label: "💰 Receita", action: "receita" },
              { label: "🔄 Fixa Mensal", action: "fixa" },
              { label: "📊 Resumo", action: "resumo_opcoes" },
              { label: "🗑️ Apagar última", action: "confirm_delete_prompt" },
            ]
          } else {
            newBotMsg.options = [
              { label: "Despesa", action: "despesa" },
              { label: "Receita", action: "receita" },
              { label: "Resumo", action: "resumo_opcoes" }
            ]
          }
        }

        setMessages(prev => [...prev, newBotMsg])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: "Ocorreu um erro ao processar sua solicitação."
      }])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  return (
    <div className="chat-main-container fixed inset-0 bottom-[80px] max-w-md mx-auto flex flex-col">
      {/* Header Fixo */}
      <div className="px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-lg border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-2">
          {/* Logo sem fundo colorido para que a logo branca apareça corretamente */}
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

      <div className="flex-1 overflow-y-auto px-4 space-y-4 no-scrollbar pt-4 pb-4">
        {messages.length > 1 && (
          <div className="flex justify-center pt-2 pb-2">
            <button 
              onClick={() => setShowClearConfirm(true)}
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
                {msg.role === "bot" && (
                  <div className="flex items-center gap-2 mb-2 opacity-70 text-xs font-semibold tracking-wide uppercase">
                    <Image src="/logo.png" alt="Finchat" width={14} height={14} className="object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" /> 
                    Agente
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              
              {/* Opções em formato de botão embutido na mensagem */}
              {msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.options.map(opt => (
                    <Button
                      key={opt.action}
                      size="sm"
                      variant={opt.primary ? "default" : "outline"}
                      className={`rounded-full px-4 h-9 ${opt.primary ? '' : 'bg-background hover:bg-secondary'}`}
                      onClick={() => handleSend(opt.label, opt.action, msg.payload)}
                      disabled={loading}
                    >
                      {opt.label}
                    </Button>
                  ))}
                  {/* Botão Alterar — aparece apenas em mensagens de confirmação de transação */}
                  {msg.payload?.intent && ['register','register_fixed'].includes(msg.payload.intent) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-4 h-9 bg-background hover:bg-secondary border-amber-500/40 text-amber-400"
                      onClick={() => {
                        setEditAmount(msg.payload.amount?.toString() ?? '')
                        setEditDate(
                          msg.payload.intent === 'register_fixed'
                            ? (msg.payload.day_of_month?.toString() ?? '')
                            : (msg.payload.transaction_date ?? '')
                        )
                        setEditModal({ payload: msg.payload, msgId: msg.id })
                      }}
                      disabled={loading}
                    >
                      ✏️ Alterar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
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

      <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-white/5 z-40">
        <form onSubmit={onSubmit} className="flex gap-2">
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
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 rounded-full h-14 bg-secondary border-none text-base px-5"
              disabled={loading}
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
                  disabled={loading}
                >
                  <Send size={20} className="text-primary-foreground ml-1" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={startRecording}
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/80 flex-shrink-0 text-foreground"
                  disabled={loading}
                >
                  <Mic size={20} />
                </Button>
              )}
            </>
          )}
        </form>
      </div>

      {/* Custom Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">Limpar Histórico?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Você está prestes a apagar as mensagens deste chat. Suas transações financeiras e seu saldo não serão afetados.
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowClearConfirm(false)}
                className="rounded-full hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={clearHistory}
                className="rounded-full flex items-center gap-2"
              >
                <Trash2 size={16} /> Apagar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de edição de valor/data ─── */}
      {editModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div
            className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10 space-y-5 animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-center">Editar Lançamento</h3>

            {/* Campo: Valor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Valor (R$)</label>
              <Input
                type="number"
                inputMode="decimal"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                placeholder="Ex: 1500"
                className="h-12 rounded-xl text-base"
              />
            </div>

            {/* Campo: Data ou Dia do mês */}
            <div className="space-y-1.5">
              {editModal.payload.intent === 'register_fixed' ? (
                <>
                  <label className="text-sm font-medium text-muted-foreground">Dia de cobrança (1–31)</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    placeholder="Ex: 10"
                    className="h-12 rounded-xl text-base"
                  />
                </>
              ) : (
                <>
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setEditModal(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl h-12"
                onClick={() => {
                  if (!editModal) return;
                  const sanitizedAmount = editAmount.replace(',', '.');
                  const newAmount = parseFloat(sanitizedAmount);
                  if (isNaN(newAmount) || newAmount <= 0) {
                     alert("Por favor, insira um valor válido maior que zero.");
                     return;
                  }

                  const updatedPayload = {
                    ...editModal.payload,
                    amount: newAmount,
                    ...(editModal.payload.intent === 'register_fixed'
                      ? { day_of_month: parseInt(editDate) || editModal.payload.day_of_month }
                      : { transaction_date: editDate || editModal.payload.transaction_date }),
                  };

                  setEditModal(null);
                  
                  // Dispara a confirmação direto com os dados atualizados
                  const confirmAction = editModal.payload.intent === 'register_fixed' ? 'confirmar_fixa' : 'confirmar';
                  handleSend("Confirmar edição", confirmAction, updatedPayload);
                }}
              >
                ✅ Salvar e Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
