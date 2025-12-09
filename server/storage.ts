import { type User, type InsertUser, type Proof, type InsertProof, users, proofs } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Proof methods
  createProof(proof: InsertProof): Promise<Proof>;
  getProofById(id: string): Promise<Proof | undefined>;
  searchProofs(filters?: {
    userId?: string;
    site?: string;
    client?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Proof[]>;
  updateProofStatus(id: string, status: string): Promise<Proof | undefined>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Proof methods
  async createProof(insertProof: InsertProof): Promise<Proof> {
    const result = await db.insert(proofs).values(insertProof).returning();
    return result[0];
  }

  async getProofById(id: string): Promise<Proof | undefined> {
    const result = await db.select().from(proofs).where(eq(proofs.id, id)).limit(1);
    return result[0];
  }

  async searchProofs(filters?: {
    userId?: string;
    site?: string;
    client?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Proof[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(proofs.actorUserId, filters.userId));
    }
    if (filters?.site) {
      conditions.push(like(proofs.site, `%${filters.site}%`));
    }
    if (filters?.client) {
      conditions.push(like(proofs.client, `%${filters.client}%`));
    }
    if (filters?.status) {
      conditions.push(eq(proofs.status, filters.status));
    }

    let query = db.select().from(proofs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(proofs.createdAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async updateProofStatus(id: string, status: string): Promise<Proof | undefined> {
    const result = await db
      .update(proofs)
      .set({ status })
      .where(eq(proofs.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
