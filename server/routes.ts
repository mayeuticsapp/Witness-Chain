import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { insertProofSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { requestTimestamp, verifyTimestamp, upgradeTimestamp, getTimestampInfo } from "./tsa";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const proofId = randomUUID();
    (req as any).generatedProofId = proofId;
    cb(null, `${proofId}_${file.originalname}`);
  }
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/webm',
      'video/mp4',
      'video/quicktime',
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post('/api/proofs', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const proofData = JSON.parse(req.body.data || '{}');
      
      const proofId = (req as any).generatedProofId || randomUUID();
      
      let tsaTimestamp: string | null = null;
      let tsaToken: string | null = null;
      let tsaProvider: string | null = null;
      
      if (proofData.requestTSA && proofData.contentHash) {
        console.log('Requesting TSA timestamp for hash:', proofData.contentHash.substring(0, 16) + '...');
        
        const tsaResult = await requestTimestamp(proofData.contentHash);
        
        if (tsaResult.success) {
          tsaTimestamp = tsaResult.timestamp || null;
          tsaToken = tsaResult.token || null;
          tsaProvider = tsaResult.provider || null;
          console.log('TSA timestamp received:', tsaTimestamp);
        } else {
          console.warn('TSA request failed:', tsaResult.error);
        }
      }
      
      const proof = {
        ...proofData,
        id: proofId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileUrl: `/uploads/${proofId}_${req.file.originalname}`,
        tsaTimestamp: tsaTimestamp ? new Date(tsaTimestamp) : null,
        tsaToken,
        tsaProvider,
        status: tsaTimestamp ? 'certified' : 'captured',
      };

      delete proof.requestTSA;

      const validatedProof = insertProofSchema.parse(proof);
      
      const createdProof = await storage.createProof(validatedProof);
      
      res.status(201).json(createdProof);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error('Error creating proof:', error);
      res.status(500).json({ error: 'Failed to create proof' });
    }
  });

  app.get('/api/proofs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const proof = await storage.getProofById(id);
      
      if (!proof) {
        return res.status(404).json({ error: 'Proof not found' });
      }
      
      res.json(proof);
    } catch (error) {
      console.error('Error fetching proof:', error);
      res.status(500).json({ error: 'Failed to fetch proof' });
    }
  });

  app.get('/api/proofs', async (req, res) => {
    try {
      const { userId, site, client, status, limit, offset } = req.query;
      
      const filters = {
        userId: userId as string | undefined,
        site: site as string | undefined,
        client: client as string | undefined,
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };
      
      const proofs = await storage.searchProofs(filters);
      
      res.json(proofs);
    } catch (error) {
      console.error('Error searching proofs:', error);
      res.status(500).json({ error: 'Failed to search proofs' });
    }
  });

  app.patch('/api/proofs/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const updatedProof = await storage.updateProofStatus(id, status);
      
      if (!updatedProof) {
        return res.status(404).json({ error: 'Proof not found' });
      }
      
      res.json(updatedProof);
    } catch (error) {
      console.error('Error updating proof status:', error);
      res.status(500).json({ error: 'Failed to update proof status' });
    }
  });

  app.post('/api/tsa/verify', async (req, res) => {
    try {
      const { proofId } = req.body;
      
      if (!proofId) {
        return res.status(400).json({ error: 'Proof ID is required' });
      }
      
      const proof = await storage.getProofById(proofId);
      
      if (!proof) {
        return res.status(404).json({ error: 'Proof not found' });
      }
      
      if (!proof.tsaToken || !proof.contentHash) {
        return res.json({
          valid: false,
          verified: false,
          proofId: proof.id,
          message: 'No OpenTimestamps proof found for this document'
        });
      }
      
      const verifyResult = await verifyTimestamp(proof.tsaToken, proof.contentHash);
      
      res.json({
        valid: verifyResult.valid,
        verified: verifyResult.verified,
        proofId: proof.id,
        contentHash: proof.contentHash,
        tsaTimestamp: proof.tsaTimestamp,
        tsaProvider: proof.tsaProvider,
        info: verifyResult.info,
        message: verifyResult.verified 
          ? 'Timestamp verified on Bitcoin blockchain' 
          : verifyResult.valid 
            ? 'Timestamp pending Bitcoin confirmation'
            : verifyResult.error || 'Verification failed'
      });
    } catch (error) {
      console.error('Error verifying TSA:', error);
      res.status(500).json({ error: 'Failed to verify timestamp' });
    }
  });

  app.post('/api/tsa/upgrade', async (req, res) => {
    try {
      const { proofId } = req.body;
      
      if (!proofId) {
        return res.status(400).json({ error: 'Proof ID is required' });
      }
      
      const proof = await storage.getProofById(proofId);
      
      if (!proof) {
        return res.status(404).json({ error: 'Proof not found' });
      }
      
      if (!proof.tsaToken) {
        return res.status(400).json({ error: 'No timestamp token to upgrade' });
      }
      
      const upgradeResult = await upgradeTimestamp(proof.tsaToken);
      
      if (upgradeResult.success && upgradeResult.token !== proof.tsaToken) {
        await storage.updateProofTsaToken(proofId, upgradeResult.token!);
      }
      
      res.json({
        success: upgradeResult.success,
        pending: upgradeResult.pending,
        proofId: proof.id,
        message: upgradeResult.pending 
          ? 'Timestamp still pending Bitcoin confirmation (usually takes 1-2 hours)'
          : 'Timestamp upgraded with Bitcoin attestation'
      });
    } catch (error) {
      console.error('Error upgrading TSA:', error);
      res.status(500).json({ error: 'Failed to upgrade timestamp' });
    }
  });

  app.get('/api/tsa/info/:proofId', async (req, res) => {
    try {
      const { proofId } = req.params;
      
      const proof = await storage.getProofById(proofId);
      
      if (!proof) {
        return res.status(404).json({ error: 'Proof not found' });
      }
      
      if (!proof.tsaToken) {
        return res.status(400).json({ error: 'No timestamp token found' });
      }
      
      const info = getTimestampInfo(proof.tsaToken);
      
      res.json({
        proofId: proof.id,
        info: info,
        provider: proof.tsaProvider,
        timestamp: proof.tsaTimestamp
      });
    } catch (error) {
      console.error('Error getting TSA info:', error);
      res.status(500).json({ error: 'Failed to get timestamp info' });
    }
  });

  return httpServer;
}
