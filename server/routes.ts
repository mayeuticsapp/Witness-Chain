import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { insertProofSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // POST /api/proofs - Create new proof with file upload
  app.post('/api/proofs', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // Parse and validate the proof data
      const proofData = JSON.parse(req.body.data || '{}');
      
      // Generate UUID for the proof
      const proofId = randomUUID();
      
      // Prepare proof object
      const proof = {
        ...proofData,
        id: proofId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        // In production, upload to storage and get URL
        fileUrl: `/uploads/${proofId}_${req.file.originalname}`,
      };

      // Validate with Zod schema
      const validatedProof = insertProofSchema.parse(proof);
      
      // Create proof in database
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

  // GET /api/proofs/:id - Get proof by ID
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

  // GET /api/proofs - Search/list proofs with filters
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

  // PATCH /api/proofs/:id/status - Update proof status
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

  return httpServer;
}
