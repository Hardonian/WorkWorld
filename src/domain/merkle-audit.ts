/**
 * Cryptographic Merkle Audit Tree & State Sealing Engine.
 * Constructs cryptographic Merkle trees over simulation action histories
 * to guarantee that no learner or agent action can be backdated, modified, or forged.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import { createHash } from "node:crypto";
import type { Action } from "./types.ts";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface MerkleProofStep {
  position: "left" | "right";
  hash: string;
}

export class MerkleAuditTree {
  private leaves: string[] = [];
  private layers: string[][] = [];

  constructor(actions: Action[] = []) {
    if (actions.length > 0) {
      this.buildTree(actions);
    }
  }

  /**
   * Hashes an individual domain action into a Merkle leaf node.
   */
  static hashAction(action: Action, index: number): string {
    const canonical = JSON.stringify({
      index,
      type: action.type,
      actionId: action.actionId,
      idempotencyKey: action.idempotencyKey,
      payload: action,
    });
    return sha256(canonical);
  }

  /**
   * Builds the complete Merkle Tree from an action history sequence.
   */
  buildTree(actions: Action[]): string {
    this.leaves = actions.map((a, i) => MerkleAuditTree.hashAction(a, i));
    if (this.leaves.length === 0) {
      this.leaves = [sha256("EMPTY_TREE")];
    }

    this.layers = [this.leaves];

    let currentLayer = this.leaves;
    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]!;
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1]! : left; // Duplicate odd leaf
        nextLayer.push(sha256(left + right));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return this.getRoot();
  }

  /**
   * Returns the root hash of the Merkle Tree.
   */
  getRoot(): string {
    if (this.layers.length === 0 || !this.layers[this.layers.length - 1]?.[0]) {
      return sha256("EMPTY_TREE");
    }
    return this.layers[this.layers.length - 1]![0]!;
  }

  /**
   * Generates a cryptographic inclusion proof for an action at a specific sequence index.
   */
  generateProof(leafIndex: number): MerkleProofStep[] {
    const proof: MerkleProofStep[] = [];
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      return proof;
    }

    let currentIndex = leafIndex;
    for (let l = 0; l < this.layers.length - 1; l++) {
      const layer = this.layers[l]!;
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        proof.push({
          position: isRight ? "left" : "right",
          hash: layer[siblingIndex]!,
        });
      } else {
        // Paired with self
        proof.push({
          position: "right",
          hash: layer[currentIndex]!,
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verifies an inclusion proof against a known Merkle Root.
   */
  static verifyProof(leafHash: string, proof: MerkleProofStep[], expectedRoot: string): boolean {
    let currentHash = leafHash;

    for (const step of proof) {
      if (step.position === "left") {
        currentHash = sha256(step.hash + currentHash);
      } else {
        currentHash = sha256(currentHash + step.hash);
      }
    }

    return currentHash === expectedRoot;
  }
}
