import { format } from "date-fns";

export interface Actor {
  user_id: string;
  role: "technician" | "auditor" | "admin";
  device_id: string;
}

export interface Context {
  intervention_id: string;
  site: string;
  client: string;
  workflow_step?: string;
}

export interface Capture {
  timestamp_local: string;
  gps: {
    lat: number;
    lng: number;
    accuracy_m: number;
  };
  file_name: string;
  file_type: string;
  content_hash: string;
  signature_local?: string;
  metadata?: {
    device_os: string;
    app_version: string;
    network: string;
  };
  // Mock field for image data
  preview_url?: string;
}

export interface TSA {
  provider: string;
  tsa_token: string;
  tsa_timestamp: string;
}

export interface Storage {
  worm_path: string;
  retention_until: string;
}

export interface BlockchainAnchor {
  merkle_root: string;
  txid: string;
  chain: string;
  anchored_at: string;
}

export interface IntegrityChecks {
  deepfake_detected: boolean;
  gps_spoofing: boolean;
  score: number;
}

export interface AuditEvent {
  event: string;
  ts: string;
}

export interface Manifest {
  proof_id: string;
  protocol_version: string;
  actor: Actor;
  context: Context;
  capture: Capture;
  tsa?: TSA;
  storage?: Storage;
  blockchain_anchor?: BlockchainAnchor;
  integrity_checks?: IntegrityChecks;
  audit: {
    created_at: string;
    server_signature?: string;
    log_chain: AuditEvent[];
  };
  status: "captured" | "processing" | "certified" | "anchored";
}

// Mock Data Store
const MOCK_PROOFS: Manifest[] = [
  {
    proof_id: "550e8400-e29b-41d4-a716-446655440000",
    protocol_version: "1.0.0",
    status: "anchored",
    actor: {
      user_id: "TECH-001",
      role: "technician",
      device_id: "IPHONE-14-PRO-MAX-X99"
    },
    context: {
      intervention_id: "INT-2025-001",
      site: "Cantiere Milano Nord",
      client: "EdilFuturo SpA",
      workflow_step: "Ispezione Iniziale"
    },
    capture: {
      timestamp_local: new Date(Date.now() - 86400000).toISOString(),
      gps: { lat: 45.4642, lng: 9.1900, accuracy_m: 3.5 },
      file_name: "evidence_damage_001.jpg",
      file_type: "image/jpeg",
      content_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      preview_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop",
      metadata: { device_os: "iOS 17.2", app_version: "1.0.5", network: "5G" }
    },
    tsa: {
      provider: "Aruba PEC SpA",
      tsa_token: "MII...BASE64...TOKEN",
      tsa_timestamp: new Date(Date.now() - 86395000).toISOString()
    },
    storage: {
      worm_path: "s3://witness-chain-worm/evidence/2025/12/08/550e8400...",
      retention_until: "2035-12-08T00:00:00Z"
    },
    blockchain_anchor: {
      merkle_root: "0x7d5a99f603f231d53a4f39d1521f98d2e8bb279cf29bebfd0687dc98458e7f89",
      txid: "0xabc1237890def45678901234567890abcdef1234567890abcdef1234567890",
      chain: "Ethereum Mainnet",
      anchored_at: new Date(Date.now() - 82800000).toISOString()
    },
    integrity_checks: {
      deepfake_detected: false,
      gps_spoofing: false,
      score: 0.99
    },
    audit: {
      created_at: new Date(Date.now() - 86400000).toISOString(),
      log_chain: [
        { event: "captured", ts: new Date(Date.now() - 86400000).toISOString() },
        { event: "uploaded", ts: new Date(Date.now() - 86399000).toISOString() },
        { event: "tsa_applied", ts: new Date(Date.now() - 86395000).toISOString() },
        { event: "worm_written", ts: new Date(Date.now() - 86390000).toISOString() },
        { event: "anchored", ts: new Date(Date.now() - 82800000).toISOString() }
      ]
    }
  },
  {
    proof_id: "550e8400-e29b-41d4-a716-446655440001",
    protocol_version: "1.0.0",
    status: "processing",
    actor: {
      user_id: "TECH-002",
      role: "technician",
      device_id: "SAMSUNG-S24-ULTRA"
    },
    context: {
      intervention_id: "INT-2025-002",
      site: "Magazzino Roma Sud",
      client: "Logistica Italia",
      workflow_step: "Consegna Merce"
    },
    capture: {
      timestamp_local: new Date(Date.now() - 3600000).toISOString(),
      gps: { lat: 41.9028, lng: 12.4964, accuracy_m: 4.2 },
      file_name: "delivery_sig_042.pdf",
      file_type: "application/pdf",
      content_hash: "a43c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999",
      preview_url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop",
      metadata: { device_os: "Android 14", app_version: "1.0.5", network: "WiFi" }
    },
    audit: {
      created_at: new Date(Date.now() - 3600000).toISOString(),
      log_chain: [
        { event: "captured", ts: new Date(Date.now() - 3600000).toISOString() },
        { event: "uploaded", ts: new Date(Date.now() - 3590000).toISOString() }
      ]
    }
  }
];

export const getProofs = () => MOCK_PROOFS;
export const getProofById = (id: string) => MOCK_PROOFS.find(p => p.proof_id === id);
export const addProof = (proof: Manifest) => {
  MOCK_PROOFS.unshift(proof);
};
