import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "WorkWorld Demo Simulation & Evaluation API",
      version: "0.1.0",
      description:
        "Local/demo API for driving simulations and retrieving narrow deterministic assessment evidence. Session ids are capability tokens; production authentication and tenancy are not implemented.",
      contact: {
        name: "WorkWorld Engineering",
        url: "https://github.com/Hardonian/workworld",
      },
    },
    servers: [
      {
        url: "http://localhost:3100/api/v1",
        description: "Local development server",
      },
    ],
    paths: {
      "/episodes": {
        get: {
          summary: "List available scenario definitions or observe an active session",
          parameters: [
            {
              name: "sessionId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Optional session ID to retrieve current observation",
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        },
        post: {
          summary: "Initialize a new simulation episode session",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    scenarioId: { type: "string", example: "A1" },
                    condition: { type: "string", enum: ["human", "agent", "assisted"], default: "agent" },
                    seed: { type: "integer", default: 42 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Episode initialized with session ID and initial observation",
            },
          },
        },
      },
      "/actions": {
        post: {
          summary: "Submit a typed domain action against an active session",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string" },
                    action: { type: "object" },
                  },
                  required: ["sessionId", "action"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Action transition result and updated observation",
            },
          },
        },
      },
      "/evaluations": {
        post: {
          summary: "Deterministically grade an episode session against ground-truth policy",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string" },
                  },
                  required: ["sessionId"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Evaluation report with fatal and non-fatal check outcomes",
            },
          },
        },
      },
      "/billing/plans": {
        get: {
          summary: "List commercial subscription plan tiers and pricing",
          responses: {
            "200": { description: "Available subscription tiers (community, academic, enterprise)" },
          },
        },
      },
      "/billing/checkout": {
        post: {
          summary: "Create a Stripe Checkout Session for tiered seat licenses",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    orgId: { type: "string" },
                    tier: { type: "string", enum: ["community", "academic", "enterprise"] },
                    seatCount: { type: "integer", minimum: 1 },
                  },
                  required: ["orgId", "tier", "seatCount"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Stripe checkout session redirect URL and monthly pricing" },
          },
        },
      },
      "/webhooks/stripe": {
        post: {
          summary: "Inbound Stripe webhook for subscription lifecycle events",
          responses: {
            "200": { description: "Webhook event processed and organization entitlement updated" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
