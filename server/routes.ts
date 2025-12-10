import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { insertProofSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { requestTimestamp } from "./tsa";

const upload = multer({
  storage: multer.memoryStorage(),
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
      
      const proofId = randomUUID();
      
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
      
      const isValid = proof.tsaToken && proof.tsaTimestamp;
      
      res.json({
        valid: !!isValid,
        proofId: proof.id,
        contentHash: proof.contentHash,
        tsaTimestamp: proof.tsaTimestamp,
        tsaProvider: proof.tsaProvider,
        message: isValid 
          ? 'Timestamp is valid and verified' 
          : 'No TSA timestamp found for this proof'
      });
    } catch (error) {
      console.error('Error verifying TSA:', error);
      res.status(500).json({ error: 'Failed to verify timestamp' });
    }
  });

  return httpServer;
}
