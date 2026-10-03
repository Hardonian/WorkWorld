import { describe, it, expect } from "vitest";
import { VoiceCallManager } from "../src/domain/voice.ts";

describe("Live Voice & Phone Call Negotiation Engine (Game Changer #2)", () => {
  it("manages complete call lifecycle from ringing to terms commitment", () => {
    const manager = new VoiceCallManager();
    const caller = {
      id: "CALLER-01",
      name: "Dave Jenkins",
      role: "Logistics Dispatcher",
      organization: "Apex Global Logistics",
      phoneNumber: "+1 (800) 555-0199",
    };

    // 1. Ringing
    const session = manager.initiateIncomingCall(
      caller,
      "Urgent delivery postponement notification",
      "Hello, this is Dave from Apex. Our refrigerated trailer had a breakdown on Highway 10."
    );
    expect(session.status).toBe("ringing");
    expect(session.transcript).toHaveLength(1);

    // 2. Answer
    manager.answerCall();
    expect(manager.getSession()?.status).toBe("connected");

    // 3. Utterances
    manager.addUtterance("participant", "Dave, can you expedite the delivery if we waive the inspection delay?", 15);
    manager.addUtterance("caller", "Yes, if you waive the delay, we can guarantee arrival by Day 3.", 30);
    expect(manager.getSession()?.transcript).toHaveLength(3);

    // 4. Commit terms
    manager.commitNegotiationTerms({
      agreedDeliveryDay: 3,
      agreedUnitPriceMinor: 3200,
      waivedExpediteFee: true,
      notes: "Verbal agreement locked via phone call",
    });

    // 5. Generate synchronized domain actions
    const actions = manager.generateSynchronizedActions("TCK-101");
    expect(actions).toHaveLength(2);
    expect(actions[0]!.type).toBe("update_ticket");
    expect(actions[1]!.type).toBe("add_work_note");

    // 6. End call
    const ended = manager.endCall(45);
    expect(ended.status).toBe("ended");
    expect(ended.endedAtSeconds).toBe(45);
  });
});
