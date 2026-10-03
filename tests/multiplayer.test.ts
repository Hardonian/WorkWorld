import { describe, it, expect } from "vitest";
import { WarRoomSession } from "../src/server/multiplayer.ts";
import type { Action } from "../src/domain/types.ts";

describe("Multiplayer Live Ops War Room (Game Changer #6)", () => {
  it("coordinates human and agent team roles with action permission checks", () => {
    const session = new WarRoomSession("ROOM-ALPHA", "A1");

    // 1. Members join
    session.join({
      userId: "usr_alice",
      displayName: "Alice Director",
      role: "operations_director",
      isAgent: false,
    });

    session.join({
      userId: "usr_bob",
      displayName: "Bob Clerk",
      role: "inventory_clerk",
      isAgent: false,
    });

    session.join({
      userId: "bot_claudia",
      displayName: "Claude 3.7 AP Copilot",
      role: "ap_specialist",
      isAgent: true,
    });

    expect(session.getMembers()).toHaveLength(3);

    // 2. Chat messaging between members
    session.postChatMessage("usr_alice", "Team, review the vendor delivery delay immediately.");
    session.postChatMessage("bot_claudia", "Acknowledged. Checking invoice mismatch on INV-100.");
    expect(session.getChatLog()).toHaveLength(2);

    // 3. Role action permission check: Inventory clerk cannot authorize POs
    const authAction: Action = {
      type: "authorize_purchase_order",
      poId: "PO-100",
      actionId: "act-1",
      idempotencyKey: "k-1",
      expectedRevision: 0,
    };

    expect(() => session.dispatchAction("usr_bob", authAction)).toThrow(
      "Inventory clerks cannot authorize purchase orders"
    );

    // 4. Authorized member (director) dispatches action successfully
    const validDraft: Action = {
      type: "draft_purchase_order",
      poId: "PO-WAR-1",
      supplierId: "SUP-KETTLE",
      lines: [{ itemId: "GLV-100", qty: 2, unitPriceMinor: 3200 }],
      requestedDeliveryDay: 5,
      note: "Team restock",
      actionId: "act-2",
      idempotencyKey: "k-2",
      expectedRevision: 0,
    };

    const res = session.dispatchAction("usr_alice", validDraft);
    expect(res.ok).toBe(true);
    expect(session.getState().purchaseOrders["PO-WAR-1"]).toBeDefined();
  });
});
