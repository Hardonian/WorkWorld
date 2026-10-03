import { describe, it, expect } from "vitest";
import { SamlProvider } from "../src/server/saml.ts";

describe("Enterprise SAML 2.0 Provider (Item 051)", () => {
  const provider = new SamlProvider(
    {
      entityId: "https://workworld.app/saml/sp",
      assertionConsumerServiceUrl: "https://workworld.app/api/auth/saml/callback",
      organizationId: "ORG-ACME-CORP",
    },
    {
      entityId: "https://idp.acme.com/saml",
      ssoUrl: "https://idp.acme.com/saml/sso",
      x509Certificate: "MIICXAIBAAKCAQEA0...",
      defaultRole: "learner",
    }
  );

  it("generates compliant SP metadata XML", () => {
    const xml = provider.generateSpMetadata();
    expect(xml).toContain('entityID="https://workworld.app/saml/sp"');
    expect(xml).toContain('Location="https://workworld.app/api/auth/saml/callback"');
  });

  it("creates valid AuthnRequest redirect URL with RelayState", () => {
    const req = provider.createAuthnRequest("/assessment/A1");
    expect(req.url).toContain("https://idp.acme.com/saml/sso?");
    expect(req.url).toContain("SAMLRequest=");
    expect(req.url).toContain("RelayState=%2Fassessment%2FA1");
    expect(req.requestId).toMatch(/^_[0-9a-f]{32}$/);
  });

  it("validates successful SAML response and maps role from groups", () => {
    const sampleXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
      <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
      </samlp:Status>
      <saml:Assertion>
        <saml:Subject>
          <saml:NameID>sarah.connor@acme.com</saml:NameID>
        </saml:Subject>
        <saml:AttributeStatement>
          <saml:Attribute Name="displayName">
            <saml:AttributeValue>Sarah Connor</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="groups">
            <saml:AttributeValue>WorkWorld-Faculty-Instructors</saml:AttributeValue>
          </saml:Attribute>
        </saml:AttributeStatement>
      </saml:Assertion>
    </samlp:Response>`;

    const b64 = Buffer.from(sampleXml).toString("base64");
    const res = provider.validateResponse(b64);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.email).toBe("sarah.connor@acme.com");
      expect(res.user.name).toBe("Sarah Connor");
      expect(res.user.role).toBe("instructor");
      expect(res.user.organizationId).toBe("ORG-ACME-CORP");
    }
  });

  it("rejects failed IdP status", () => {
    const failXml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
      <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Responder"/>
      </samlp:Status>
    </samlp:Response>`;
    const res = provider.validateResponse(Buffer.from(failXml).toString("base64"));
    expect(res.ok).toBe(false);
  });
});
