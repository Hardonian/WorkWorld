import { describe, expect, it } from "vitest";
import { RequestError, assertSameOrigin, readJsonObject } from "../src/server/http.ts";

describe("API request boundary", () => {
  it("accepts a bounded same-origin JSON object", async () => {
    const request = new Request("https://workworld.test/api/actions", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://workworld.test" },
      body: JSON.stringify({ type: "add_work_note", text: "hello" }),
    });
    await expect(readJsonObject(request)).resolves.toMatchObject({ type: "add_work_note" });
  });

  it("rejects cross-site state changes", () => {
    const request = new Request("https://workworld.test/api/actions", {
      headers: { origin: "https://attacker.test" },
    });
    expect(() => assertSameOrigin(request)).toThrowError(RequestError);
  });

  it("rejects unsupported content types, arrays, and oversized bodies", async () => {
    await expect(
      readJsonObject(
        new Request("https://workworld.test/api/actions", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 415, code: "CONTENT_TYPE_INVALID" });

    await expect(
      readJsonObject(
        new Request("https://workworld.test/api/actions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "[]",
        }),
      ),
    ).rejects.toMatchObject({ status: 400, code: "PAYLOAD_INVALID" });

    await expect(
      readJsonObject(
        new Request("https://workworld.test/api/actions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "x".repeat(100) }),
        }),
        16,
      ),
    ).rejects.toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });
});
