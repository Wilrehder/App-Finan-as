"use server"

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(formData: FormData) {
  try {
    const file = formData.get('audio') as File;
    
    if (!file) {
      return { success: false, error: 'Nenhum arquivo de áudio recebido.' };
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt', // Define idioma para português, ajuda na precisão
    });

    const cleanedText = (transcription.text || "").trim();

    // Filtro para detectar se o áudio foi apenas silêncio, ruído ou gerou alucinações comuns do Whisper
    const isSilenceOrHallucination = (text: string) => {
      // Remove pontuação e caracteres especiais para avaliar apenas as palavras
      const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
      
      // Se não sobrou nenhuma letra/número (ex: apenas "...", "?", ".")
      if (!clean) return true;

      // Lista de alucinações comuns geradas pelo Whisper quando há silêncio ou ruído de fundo
      const commonHallucinations = [
        "obrigado",
        "obrigada",
        "obrigado por assistir",
        "obrigada por assistir",
        "tchau",
        "bye",
        "subtitles by",
        "amaraorg",
        "legendado por",
        "editor de legenda",
        "legenda",
        "legendas"
      ];

      return commonHallucinations.includes(clean);
    };

    if (isSilenceOrHallucination(cleanedText)) {
      return { success: false, error: '⚠️ Não foi possível detectar nenhum áudio ou fala.' };
    }

    return { success: true, text: cleanedText };
  } catch (error: any) {
    console.error('Erro ao transcrever áudio:', error);
    const errorMessage = error?.message || 'Ocorreu um erro ao processar seu áudio.';
    return { success: false, error: errorMessage };
  }
}
