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

    if (!transcription.text) {
      return { success: false, error: 'Não foi possível transcrever o áudio.' };
    }

    return { success: true, text: transcription.text };
  } catch (error: any) {
    console.error('Erro ao transcrever áudio:', error);
    const errorMessage = error?.message || 'Ocorreu um erro ao processar seu áudio.';
    return { success: false, error: errorMessage };
  }
}
