import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const proofs = pgTable("proofs", {
  id: text("id").primaryKey(),
  protocolVersion: text("protocol_version").notNull().default("1.0.0"),
  status: text("status").notNull().default("captured"),
  
  // Actor
  actorUserId: text("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  actorDeviceId: text("actor_device_id").notNull(),
  
  // Context
  interventionId: text("intervention_id").notNull(),
  site: text("site").notNull(),
  client: text("client").notNull(),
  workflowStep: text("workflow_step"),
  
  // Capture
  timestampLocal: timestamp("timestamp_local").notNull(),
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),
  gpsAccuracy: decimal("gps_accuracy", { precision: 6, scale: 2 }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  contentHash: text("content_hash").notNull(),
  signatureLocal: text("signature_local"),
  fileUrl: text("file_url"),
  captureMetadata: jsonb("capture_metadata"),
  
  // TSA
  tsaProvider: text("tsa_provider"),
  tsaToken: text("tsa_token"),
  tsaTimestamp: timestamp("tsa_timestamp"),
  
  // Storage
  wormPath: text("worm_path"),
  retentionUntil: timestamp("retention_until"),
  
  // Blockchain
  merkleRoot: text("merkle_root"),
  txid: text("txid"),
  chain: text("chain"),
  anchoredAt: timestamp("anchored_at"),
  
  // Integrity
  deepfakeDetected: boolean("deepfake_detected"),
  gpsSpoofing: boolean("gps_spoofing"),
  integrityScore: decimal("integrity_score", { precision: 3, scale: 2 }),
  
  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  serverSignature: text("server_signature"),
  auditLog: jsonb("audit_log").$type<Array<{ event: string; ts: string }>>().notNull().default(sql`'[]'::jsonb`),
});

const dateOrString = z.union([z.date(), z.string().transform((val) => new Date(val))]);

export const insertProofSchema = createInsertSchema(proofs, {
  timestampLocal: dateOrString,
  tsaTimestamp: dateOrString.optional().nullable(),
  retentionUntil: dateOrString.optional().nullable(),
  anchoredAt: dateOrString.optional().nullable(),
}).omit({
  createdAt: true,
});

export type InsertProof = z.infer<typeof insertProofSchema>;
export type Proof = typeof proofs.$inferSelect;
