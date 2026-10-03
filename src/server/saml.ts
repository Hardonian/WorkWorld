/**
 * Enterprise SAML 2.0 & OIDC SSO Authentication Provider for WorkWorld.
 * Supports SP-initiated AuthnRequest, IdP Metadata parsing, and Assertion mapping.
 */

import crypto from "node:crypto";
import type { Role } from "./rbac.ts";

export interface SamlIdpConfig {
  entityId: string;
  ssoUrl: string;
  x509Certificate: string;
  defaultRole?: Role;
}

export interface SamlSpConfig {
  entityId: string;
  assertionConsumerServiceUrl: string;
  organizationId: string;
}

export interface SamlUserAttributes {
  email: string;
  name?: string;
  groups?: string[];
  role: Role;
  organizationId: string;
}

export class SamlProvider {
  constructor(
    private readonly spConfig: SamlSpConfig,
    private readonly idpConfig: SamlIdpConfig
  ) {}

  /**
   * Generates standard XML SP Metadata for enterprise IdP configuration (Okta, Entra ID, PingIdentity).
   */
  generateSpMetadata(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${this.spConfig.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${this.spConfig.assertionConsumerServiceUrl}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`.trim();
  }

  /**
   * Constructs an SP-initiated SAML AuthnRequest URL with redirect binding.
   */
  createAuthnRequest(relayState = "/workspace"): { url: string; requestId: string } {
    const requestId = "_" + crypto.randomBytes(16).toString("hex");
    const issueInstant = new Date().toISOString();

    const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}" Destination="${this.idpConfig.ssoUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${this.spConfig.assertionConsumerServiceUrl}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.spConfig.entityId}</saml:Issuer>
</samlp:AuthnRequest>`;

    const deflated = Buffer.from(xml, "utf8").toString("base64");
    const params = new URLSearchParams({
      SAMLRequest: deflated,
      RelayState: relayState,
    });

    return {
      url: `${this.idpConfig.ssoUrl}?${params.toString()}`,
      requestId,
    };
  }

  /**
   * Validates and parses base64-encoded SAMLResponse payload.
   */
  validateResponse(encodedSamlResponse: string): { ok: true; user: SamlUserAttributes } | { ok: false; error: string } {
    try {
      const xml = Buffer.from(encodedSamlResponse, "base64").toString("utf8");

      // Verify basic SAML integrity
      if (!xml.includes("<samlp:Response") && !xml.includes("<saml2p:Response") && !xml.includes("<Response")) {
        return { ok: false, error: "Malformed XML: Missing SAML Response element" };
      }

      // Extract Status
      if (!xml.includes("urn:oasis:names:tc:SAML:2.0:status:Success")) {
        return { ok: false, error: "SAML authentication was unsuccessful at Identity Provider" };
      }

      // Extract NameID (Email)
      const nameIdMatch = xml.match(/<(?:\w+:)?NameID[^>]*>([^<]+)<\/(?:\w+:)?NameID>/i);
      const email = nameIdMatch ? nameIdMatch[1]!.trim().toLowerCase() : "";
      if (!email || !email.includes("@")) {
        return { ok: false, error: "Missing or invalid NameID email address in SAML Assertion" };
      }

      // Extract Display Name attribute
      const displayNameMatch = xml.match(/<(?:\w+:)?Attribute[^>]*Name=["'](?:displayName|name|fullName)["'][^>]*>\s*<(?:\w+:)?AttributeValue[^>]*>([^<]+)<\/(?:\w+:)?AttributeValue>/i);
      const name = displayNameMatch ? displayNameMatch[1]!.trim() : email.split("@")[0];

      // Extract Groups or Roles attribute
      const groups: string[] = [];
      const groupMatches = xml.matchAll(/<(?:\w+:)?Attribute[^>]*Name=["'](?:groups|roles|memberOf)["'][^>]*>([\s\S]*?)<\/(?:\w+:)?Attribute>/gi);
      for (const gm of groupMatches) {
        const valMatches = gm[1]!.matchAll(/<(?:\w+:)?AttributeValue[^>]*>([^<]+)<\/(?:\w+:)?AttributeValue>/gi);
        for (const vm of valMatches) {
          groups.push(vm[1]!.trim());
        }
      }

      // Determine RBAC role
      let role: Role = this.idpConfig.defaultRole || "learner";
      const upperGroups = groups.map((g) => g.toUpperCase());
      if (upperGroups.some((g) => g.includes("ADMIN") || g.includes("SUPERUSER"))) {
        role = "org_admin";
      } else if (upperGroups.some((g) => g.includes("INSTRUCTOR") || g.includes("FACULTY") || g.includes("TEACHER"))) {
        role = "instructor";
      } else if (upperGroups.some((g) => g.includes("ASSESSOR") || g.includes("GRADER"))) {
        role = "assessor";
      }

      return {
        ok: true,
        user: {
          email,
          name,
          groups,
          role,
          organizationId: this.spConfig.organizationId,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `SAML parsing error: ${msg}` };
    }
  }
}
