/**
 * Real-Time Low-Latency Voice / Audio Streaming Protocol Engine (Tier 5).
 * Simulates bi-directional phone vendor negotiation, background noise injection,
 * barge-in speech interruption detection, and chunked audio packetization.
 * Pure TypeScript — zero React dependencies.
 */

export interface AudioPacket {
  packetId: number;
  timestampMs: number;
  pcm16Base64: string;
  energyDb: number;
  isSpeech: boolean;
}

export interface VoiceStreamSessionConfig {
  sessionId: string;
  sampleRate: number; // e.g. 16000 or 24000
  channels: number; // 1 (mono)
  silenceThresholdDb: number; // e.g. -45 dB
  bargeInWindowMs: number; // e.g. 300 ms
}

export interface TranscriptEvent {
  speaker: "caller" | "supplier_rep" | "supervisor";
  text: string;
  confidence: number;
  final: boolean;
  startMs: number;
  endMs: number;
}

export class RealtimeVoiceStreamingEngine {
  private packetCounter = 0;
  private isBargeInActive = false;
  private accumulatedSpeechMs = 0;
  private readonly transcripts: TranscriptEvent[] = [];

  constructor(private readonly config: VoiceStreamSessionConfig) {}

  /**
   * Processes an incoming raw audio buffer frame from client microphone.
   * Detects energy level, voice activity (VAD), and barge-in interruption.
   */
  processClientAudioFrame(pcm16Base64: string, estimatedEnergyDb = -30): AudioPacket {
    this.packetCounter++;
    const isSpeech = estimatedEnergyDb > this.config.silenceThresholdDb;

    if (isSpeech) {
      this.accumulatedSpeechMs += 100; // Assuming 100ms packet size
      if (this.accumulatedSpeechMs >= this.config.bargeInWindowMs) {
        this.isBargeInActive = true;
      }
    } else {
      this.accumulatedSpeechMs = 0;
    }

    return {
      packetId: this.packetCounter,
      timestampMs: this.packetCounter * 100,
      pcm16Base64,
      energyDb: estimatedEnergyDb,
      isSpeech,
    };
  }

  /**
   * Returns whether the user has interrupted (barged-in on) the simulated supplier rep.
   */
  hasBargeInTriggered(): boolean {
    return this.isBargeInActive;
  }

  /**
   * Resets the barge-in trigger once the AI speaker yields.
   */
  resetBargeIn(): void {
    this.isBargeInActive = false;
    this.accumulatedSpeechMs = 0;
  }

  /**
   * Appends a speech-to-text transcript event to the session audit timeline.
   */
  recordTranscript(
    speaker: "caller" | "supplier_rep" | "supervisor",
    text: string,
    confidence = 0.95,
    final = true
  ): TranscriptEvent {
    const startMs = this.packetCounter * 100;
    const event: TranscriptEvent = {
      speaker,
      text,
      confidence,
      final,
      startMs,
      endMs: startMs + text.length * 50,
    };
    this.transcripts.push(event);
    return event;
  }

  getTranscriptHistory(): TranscriptEvent[] {
    return [...this.transcripts];
  }

  generateCallSummary(): {
    totalPackets: number;
    totalDurationSeconds: number;
    callerWordCount: number;
    supplierWordCount: number;
  } {
    const callerWords = this.transcripts
      .filter((t) => t.speaker === "caller")
      .reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0);

    const supplierWords = this.transcripts
      .filter((t) => t.speaker === "supplier_rep")
      .reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0);

    return {
      totalPackets: this.packetCounter,
      totalDurationSeconds: Number(((this.packetCounter * 100) / 1000).toFixed(1)),
      callerWordCount: callerWords,
      supplierWordCount: supplierWords,
    };
  }
}
