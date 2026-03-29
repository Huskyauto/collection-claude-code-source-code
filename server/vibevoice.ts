import fs from "fs";
import path from "path";

const HF_ASR_MODEL = "microsoft/VibeVoice-ASR";
const HF_TTS_MODEL = "microsoft/VibeVoice-1.5B";
const HF_REALTIME_MODEL = "microsoft/VibeVoice-Realtime-0.5B";

const GRADIO_ASR_ENDPOINT = "https://aka.ms/vibevoice-asr";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50000;
const ALLOWED_AUDIO_DIRS = ["/tmp", path.resolve(process.cwd(), "uploads"), path.resolve(process.cwd(), "project-assets"), path.resolve(process.cwd(), "data")];
const ALLOWED_OUTPUT_DIRS = ["/tmp", path.resolve(process.cwd(), "project-assets"), path.resolve(process.cwd(), "data")];

function getHFToken(): string | undefined {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
}

function sanitizePath(filePath: string, allowedDirs: string[]): string | null {
  const resolved = path.resolve(filePath);
  if (resolved.includes("..")) return null;
  const isAllowed = allowedDirs.some(dir => resolved.startsWith(dir + path.sep) || resolved === dir);
  if (!isAllowed) return null;
  return resolved;
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

export interface VibeVoiceASRResult {
  success: boolean;
  transcript?: string;
  speakers?: Array<{
    speaker: string;
    timestamp?: string;
    text: string;
  }>;
  language?: string;
  duration_seconds?: number;
  error?: string;
  provider: "vibevoice-asr";
}

export interface VibeVoiceTTSResult {
  success: boolean;
  audio_base64?: string;
  audio_url?: string;
  format?: string;
  duration_seconds?: number;
  speakers_used?: string[];
  error?: string;
  provider: "vibevoice-tts";
}

export async function vibevoiceTranscribe(params: {
  audio_path?: string;
  audio_base64?: string;
  audio_url?: string;
  language?: string;
  hotwords?: string[];
  enable_diarization?: boolean;
  enable_timestamps?: boolean;
}): Promise<VibeVoiceASRResult> {
  try {
    let audioBuffer: Buffer;

    if (params.audio_path) {
      const safePath = sanitizePath(params.audio_path, ALLOWED_AUDIO_DIRS);
      if (!safePath) {
        return { success: false, error: "Audio path not allowed. Files must be in /tmp, uploads, project-assets, or data directories.", provider: "vibevoice-asr" };
      }
      if (!fs.existsSync(safePath)) {
        return { success: false, error: `Audio file not found: ${safePath}`, provider: "vibevoice-asr" };
      }
      audioBuffer = fs.readFileSync(safePath);
    } else if (params.audio_base64) {
      audioBuffer = Buffer.from(params.audio_base64, "base64");
    } else if (params.audio_url) {
      if (!validateUrl(params.audio_url)) {
        return { success: false, error: "Invalid or disallowed audio URL. Must be a public https:// URL.", provider: "vibevoice-asr" };
      }
      const resp = await fetch(params.audio_url, { signal: AbortSignal.timeout(60000) });
      if (!resp.ok) {
        return { success: false, error: `Failed to download audio: ${resp.status}`, provider: "vibevoice-asr" };
      }
      audioBuffer = Buffer.from(await resp.arrayBuffer());
    } else {
      return { success: false, error: "Provide audio_path, audio_base64, or audio_url", provider: "vibevoice-asr" };
    }

    if (audioBuffer.length > MAX_AUDIO_SIZE) {
      return { success: false, error: `Audio file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB). Maximum is ${MAX_AUDIO_SIZE / 1024 / 1024}MB.`, provider: "vibevoice-asr" };
    }

    const hfToken = getHFToken();

    const result = await transcribeViaHuggingFace(audioBuffer, {
      language: params.language,
      hotwords: params.hotwords,
      enableDiarization: params.enable_diarization !== false,
      enableTimestamps: params.enable_timestamps !== false,
      token: hfToken,
    });

    return result;
  } catch (err: any) {
    console.error("[vibevoice-asr] Transcription failed:", err.message);
    return { success: false, error: `VibeVoice ASR failed: ${err.message}`, provider: "vibevoice-asr" };
  }
}

async function transcribeViaHuggingFace(audioBuffer: Buffer, options: {
  language?: string;
  hotwords?: string[];
  enableDiarization?: boolean;
  enableTimestamps?: boolean;
  token?: string;
}): Promise<VibeVoiceASRResult> {
  const hfToken = options.token;

  const apiUrl = `https://api-inference.huggingface.co/models/${HF_ASR_MODEL}`;

  const headers: Record<string, string> = {
    "Content-Type": "audio/wav",
  };
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: audioBuffer,
      signal: AbortSignal.timeout(120000),
    });

    if (response.ok) {
      const result = await response.json() as any;
      return parseHFASRResponse(result);
    }

    const errorText = await response.text();

    if (response.status === 503 || response.status === 429) {
      console.log("[vibevoice-asr] HF Inference API unavailable, trying Gradio endpoint...");
      return await transcribeViaGradio(audioBuffer, options);
    }

    if (response.status === 401 || response.status === 403) {
      console.log("[vibevoice-asr] HF auth issue, trying Gradio endpoint...");
      return await transcribeViaGradio(audioBuffer, options);
    }

    return { success: false, error: `HF API error (${response.status}): ${errorText}`, provider: "vibevoice-asr" };
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return { success: false, error: "Transcription timed out (120s limit)", provider: "vibevoice-asr" };
    }
    console.log("[vibevoice-asr] HF API failed, trying Gradio endpoint...");
    return await transcribeViaGradio(audioBuffer, options);
  }
}

async function transcribeViaGradio(audioBuffer: Buffer, options: {
  language?: string;
  hotwords?: string[];
  enableDiarization?: boolean;
  enableTimestamps?: boolean;
}): Promise<VibeVoiceASRResult> {
  try {
    const { Client } = await import("@gradio/client");

    const client = await Client.connect(GRADIO_ASR_ENDPOINT, {
      hf_token: getHFToken() as any,
    });

    const tmpPath = `/tmp/vibevoice_input_${Date.now()}.wav`;
    fs.writeFileSync(tmpPath, audioBuffer);

    try {
      const blob = new Blob([audioBuffer], { type: "audio/wav" });

      const hotwordsStr = options.hotwords?.join(", ") || "";

      const result = await client.predict("/run", {
        audio: blob,
        hotwords: hotwordsStr,
      });

      const data = result.data as any;

      if (typeof data === "string" || (Array.isArray(data) && typeof data[0] === "string")) {
        const transcript = Array.isArray(data) ? data[0] : data;
        return parseStructuredTranscript(transcript);
      }

      return {
        success: true,
        transcript: JSON.stringify(data),
        provider: "vibevoice-asr",
      };
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  } catch (err: any) {
    console.error("[vibevoice-asr] Gradio fallback failed:", err.message);
    return { success: false, error: `Gradio ASR failed: ${err.message}`, provider: "vibevoice-asr" };
  }
}

function parseHFASRResponse(result: any): VibeVoiceASRResult {
  if (typeof result === "string") {
    return parseStructuredTranscript(result);
  }

  if (result.text) {
    return {
      success: true,
      transcript: result.text,
      speakers: result.chunks?.map((c: any) => ({
        speaker: c.speaker || "unknown",
        timestamp: c.timestamp ? `${c.timestamp[0]}s-${c.timestamp[1]}s` : undefined,
        text: c.text,
      })),
      provider: "vibevoice-asr",
    };
  }

  if (Array.isArray(result)) {
    const transcript = result.map((r: any) => r.text || r).join(" ");
    return { success: true, transcript, provider: "vibevoice-asr" };
  }

  return { success: true, transcript: JSON.stringify(result), provider: "vibevoice-asr" };
}

function parseStructuredTranscript(raw: string): VibeVoiceASRResult {
  const speakers: Array<{ speaker: string; timestamp?: string; text: string }> = [];
  const lines = raw.split("\n").filter(l => l.trim());

  const speakerPattern = /\[?(Speaker\s*\d+|SPEAKER_\d+)\]?\s*[\[(]?([\d:.]+\s*[-–]\s*[\d:.]+)[\])]?\s*:?\s*(.*)/i;

  let hasStructure = false;
  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      hasStructure = true;
      speakers.push({
        speaker: match[1].trim(),
        timestamp: match[2].trim(),
        text: match[3].trim(),
      });
    }
  }

  return {
    success: true,
    transcript: raw,
    speakers: hasStructure ? speakers : undefined,
    provider: "vibevoice-asr",
  };
}

export async function vibevoiceTTS(params: {
  text: string;
  speakers?: Array<{ name: string; text: string }>;
  voice?: string;
  output_path?: string;
}): Promise<VibeVoiceTTSResult> {
  try {
    if (!params.text && (!params.speakers || params.speakers.length === 0)) {
      return { success: false, error: "Text or speakers array is required", provider: "vibevoice-tts" };
    }

    if (params.output_path) {
      const safePath = sanitizePath(params.output_path, ALLOWED_OUTPUT_DIRS);
      if (!safePath) {
        return { success: false, error: "Output path not allowed. Must be in /tmp, project-assets, or data directories.", provider: "vibevoice-tts" };
      }
      params.output_path = safePath;
    }

    const hfToken = getHFToken();

    const apiUrl = `https://api-inference.huggingface.co/models/${HF_TTS_MODEL}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (hfToken) {
      headers["Authorization"] = `Bearer ${hfToken}`;
    }

    let inputText = params.text;
    if (params.speakers && params.speakers.length > 0) {
      inputText = params.speakers
        .map(s => `[${s.name}]: ${s.text}`)
        .join("\n");
    }

    if (inputText.length > MAX_TEXT_LENGTH) {
      return { success: false, error: `Text too long (${inputText.length} chars). Maximum is ${MAX_TEXT_LENGTH}.`, provider: "vibevoice-tts" };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: inputText,
        parameters: {
          voice: params.voice,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 503) {
        return {
          success: false,
          error: "VibeVoice TTS model is loading or unavailable on HF Inference API. The model (1.5B parameters) may require a dedicated endpoint. Try again in a few minutes or use an alternative TTS provider.",
          provider: "vibevoice-tts",
        };
      }

      return {
        success: false,
        error: `VibeVoice TTS failed (${response.status}): ${errorText}`,
        provider: "vibevoice-tts",
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const format = contentType.includes("wav") ? "wav" : contentType.includes("flac") ? "flac" : "mp3";

    if (params.output_path) {
      const dir = path.dirname(params.output_path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(params.output_path, audioBuffer);
    }

    const audio_base64 = audioBuffer.toString("base64");

    return {
      success: true,
      audio_base64,
      format,
      duration_seconds: estimateAudioDuration(audioBuffer.length, format),
      speakers_used: params.speakers?.map(s => s.name),
      provider: "vibevoice-tts",
    };
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return { success: false, error: "VibeVoice TTS timed out (120s limit)", provider: "vibevoice-tts" };
    }
    console.error("[vibevoice-tts] TTS failed:", err.message);
    return { success: false, error: `VibeVoice TTS failed: ${err.message}`, provider: "vibevoice-tts" };
  }
}

function estimateAudioDuration(bytes: number, format: string): number {
  switch (format) {
    case "wav": return Math.round(bytes / (24000 * 2));
    case "mp3": return Math.round(bytes / 16000);
    default: return Math.round(bytes / 16000);
  }
}

export async function vibevoiceRealtimeTTS(params: {
  text: string;
  speaker?: string;
  output_path?: string;
}): Promise<VibeVoiceTTSResult> {
  try {
    if (!params.text || params.text.length > MAX_TEXT_LENGTH) {
      return { success: false, error: params.text ? `Text too long (max ${MAX_TEXT_LENGTH} chars)` : "Text is required", provider: "vibevoice-tts" };
    }
    if (params.output_path) {
      const safePath = sanitizePath(params.output_path, ALLOWED_OUTPUT_DIRS);
      if (!safePath) {
        return { success: false, error: "Output path not allowed. Must be in /tmp, project-assets, or data directories.", provider: "vibevoice-tts" };
      }
      params.output_path = safePath;
    }
    const hfToken = getHFToken();

    const apiUrl = `https://api-inference.huggingface.co/models/${HF_REALTIME_MODEL}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (hfToken) {
      headers["Authorization"] = `Bearer ${hfToken}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: params.text,
        parameters: {
          speaker: params.speaker || "Carter",
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `VibeVoice Realtime TTS failed (${response.status}): ${errorText}`,
        provider: "vibevoice-tts",
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "";
    const format = contentType.includes("wav") ? "wav" : "mp3";

    if (params.output_path) {
      const dir = path.dirname(params.output_path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(params.output_path, audioBuffer);
    }

    return {
      success: true,
      audio_base64: audioBuffer.toString("base64"),
      format,
      duration_seconds: estimateAudioDuration(audioBuffer.length, format),
      speakers_used: [params.speaker || "Carter"],
      provider: "vibevoice-tts",
    };
  } catch (err: any) {
    console.error("[vibevoice-realtime] TTS failed:", err.message);
    return { success: false, error: `VibeVoice Realtime TTS failed: ${err.message}`, provider: "vibevoice-tts" };
  }
}

export function isVibeVoiceAvailable(): boolean {
  return true;
}

export const VIBEVOICE_SPEAKERS = [
  "Carter", "Alyssa", "Angelo", "Bella", "Davis",
  "Elijah", "Evelyn", "James", "Joanna", "Kenji",
  "Madeline", "Nova",
];

export const VIBEVOICE_INFO = {
  asr: {
    model: HF_ASR_MODEL,
    features: ["60-minute single-pass processing", "Speaker diarization (Who, When, What)", "50+ languages", "Custom hotwords", "Timestamped output"],
    maxDuration: "60 minutes",
    languages: "50+",
  },
  tts: {
    model: HF_TTS_MODEL,
    features: ["90-minute long-form generation", "Up to 4 speakers", "Expressive conversational speech", "Multi-lingual (English, Chinese)"],
    maxDuration: "90 minutes",
    maxSpeakers: 4,
  },
  realtime: {
    model: HF_REALTIME_MODEL,
    features: ["Real-time streaming TTS", "~200ms first-speech latency", "0.5B parameters (lightweight)", "10-minute generation per pass"],
    speakers: VIBEVOICE_SPEAKERS,
  },
};
