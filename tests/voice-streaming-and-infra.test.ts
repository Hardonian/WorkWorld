import { describe, it, expect } from "vitest";
import { RealtimeVoiceStreamingEngine } from "../src/server/voice-stream.ts";
import fs from "node:fs";

describe("Real-Time Voice Streaming Engine (Tier 5)", () => {
  it("processes audio packets, monitors energy, and detects speech activity", () => {
    const engine = new RealtimeVoiceStreamingEngine({
      sessionId: "voice-session-101",
      sampleRate: 16000,
      channels: 1,
      silenceThresholdDb: -40,
      bargeInWindowMs: 250,
    });

    const silentPacket = engine.processClientAudioFrame("base64_silence_data", -50);
    expect(silentPacket.packetId).toBe(1);
    expect(silentPacket.isSpeech).toBe(false);
    expect(engine.hasBargeInTriggered()).toBe(false);

    // Stream 3 consecutive speech frames (> 250ms) to trigger barge-in
    engine.processClientAudioFrame("base64_speech_chunk_1", -20);
    engine.processClientAudioFrame("base64_speech_chunk_2", -18);
    engine.processClientAudioFrame("base64_speech_chunk_3", -19);

    expect(engine.hasBargeInTriggered()).toBe(true);

    engine.resetBargeIn();
    expect(engine.hasBargeInTriggered()).toBe(false);
  });

  it("records transcripts and computes call duration and word counts", () => {
    const engine = new RealtimeVoiceStreamingEngine({
      sessionId: "voice-session-102",
      sampleRate: 16000,
      channels: 1,
      silenceThresholdDb: -40,
      bargeInWindowMs: 200,
    });

    // Process 20 frames = 2.0s
    for (let i = 0; i < 20; i++) {
      engine.processClientAudioFrame("pcm_data", -25);
    }

    engine.recordTranscript("caller", "Hello, I am calling about Purchase Order 104.");
    engine.recordTranscript("supplier_rep", "Certainly, let me review your account balance.");

    const history = engine.getTranscriptHistory();
    expect(history).toHaveLength(2);
    expect(history[0]?.speaker).toBe("caller");

    const summary = engine.generateCallSummary();
    expect(summary.totalPackets).toBe(20);
    expect(summary.totalDurationSeconds).toBe(2.0);
    expect(summary.callerWordCount).toBe(8);
    expect(summary.supplierWordCount).toBe(7);
  });
});

describe("Cloud Infrastructure as Code (Tier 5)", () => {
  it("verifies production Terraform and Kubernetes manifests exist", () => {
    expect(fs.existsSync("infra/terraform/main.tf")).toBe(true);
    expect(fs.existsSync("infra/kubernetes/deployment.yaml")).toBe(true);

    const tf = fs.readFileSync("infra/terraform/main.tf", "utf8");
    expect(tf).toContain("aws_vpc");
    expect(tf).toContain("aws_ecs_cluster");
    expect(tf).toContain("aws_secretsmanager_secret");

    const k8s = fs.readFileSync("infra/kubernetes/deployment.yaml", "utf8");
    expect(k8s).toContain("workworld-app");
    expect(k8s).toContain("runAsNonRoot: true");
    expect(k8s).toContain("HorizontalPodAutoscaler");
  });
});
