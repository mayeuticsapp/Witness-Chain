import type { Proof } from "@shared/schema";
import type { Manifest } from "./mock-data";

export interface SearchProofsParams {
  userId?: string;
  site?: string;
  client?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateProofPayload {
  actorUserId: string;
  actorRole: string;
  actorDeviceId: string;
  interventionId: string;
  site: string;
  client: string;
  workflowStep?: string;
  timestampLocal: string;
  gpsLat?: string;
  gpsLng?: string;
  gpsAccuracy?: string;
  contentHash: string;
  signatureLocal?: string;
  captureMetadata?: any;
  auditLog: Array<{ event: string; ts: string }>;
}

function toISOString(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return date;
  return date.toISOString();
}

function proofToManifest(proof: Proof): Manifest {
  return {
    proof_id: proof.id,
    protocol_version: proof.protocolVersion,
    status: proof.status as Manifest['status'],
    actor: {
      user_id: proof.actorUserId,
      role: proof.actorRole as "technician" | "auditor" | "admin",
      device_id: proof.actorDeviceId,
    },
    context: {
      intervention_id: proof.interventionId,
      site: proof.site,
      client: proof.client,
      workflow_step: proof.workflowStep || undefined,
    },
    capture: {
      timestamp_local: toISOString(proof.timestampLocal),
      gps: {
        lat: proof.gpsLat ? parseFloat(proof.gpsLat) : 0,
        lng: proof.gpsLng ? parseFloat(proof.gpsLng) : 0,
        accuracy_m: proof.gpsAccuracy ? parseFloat(proof.gpsAccuracy) : 0,
      },
      file_name: proof.fileName,
      file_type: proof.fileType,
      content_hash: proof.contentHash,
      signature_local: proof.signatureLocal || undefined,
      preview_url: proof.fileUrl || undefined,
      metadata: proof.captureMetadata as any,
    },
    tsa: proof.tsaProvider ? {
      provider: proof.tsaProvider,
      tsa_token: proof.tsaToken || "",
      tsa_timestamp: toISOString(proof.tsaTimestamp),
    } : undefined,
    storage: proof.wormPath ? {
      worm_path: proof.wormPath,
      retention_until: toISOString(proof.retentionUntil),
    } : undefined,
    blockchain_anchor: proof.merkleRoot ? {
      merkle_root: proof.merkleRoot,
      txid: proof.txid || "",
      chain: proof.chain || "",
      anchored_at: toISOString(proof.anchoredAt),
    } : undefined,
    integrity_checks: proof.integrityScore ? {
      deepfake_detected: proof.deepfakeDetected || false,
      gps_spoofing: proof.gpsSpoofing || false,
      score: parseFloat(proof.integrityScore),
    } : undefined,
    audit: {
      created_at: toISOString(proof.createdAt),
      server_signature: proof.serverSignature || undefined,
      log_chain: (proof.auditLog as Array<{ event: string; ts: string }>) || [],
    },
  };
}

export const api = {
  async createProof(file: File, data: CreateProofPayload): Promise<Manifest> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(data));

    const response = await fetch('/api/proofs', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create proof');
    }

    const proof: Proof = await response.json();
    return proofToManifest(proof);
  },

  async getProofById(id: string): Promise<Manifest | null> {
    const response = await fetch(`/api/proofs/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch proof');
    }

    const proof: Proof = await response.json();
    return proofToManifest(proof);
  },

  async searchProofs(params: SearchProofsParams = {}): Promise<Manifest[]> {
    const queryParams = new URLSearchParams();
    
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.site) queryParams.append('site', params.site);
    if (params.client) queryParams.append('client', params.client);
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`/api/proofs?${queryParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search proofs');
    }

    const proofs: Proof[] = await response.json();
    return proofs.map(proofToManifest);
  },

  async updateProofStatus(id: string, status: string): Promise<Manifest> {
    const response = await fetch(`/api/proofs/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update proof status');
    }

    const proof: Proof = await response.json();
    return proofToManifest(proof);
  },
};
