import { createHash } from 'crypto';

interface TSAResponse {
  success: boolean;
  timestamp?: string;
  token?: string;
  provider?: string;
  error?: string;
}

export async function requestTimestamp(contentHash: string): Promise<TSAResponse> {
  try {
    const hashBuffer = Buffer.from(contentHash, 'hex');
    
    const tsRequest = createTSRequest(hashBuffer);
    
    const response = await fetch('https://freetsa.org/tsr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
      },
      body: tsRequest,
    });
    
    if (!response.ok) {
      throw new Error(`TSA request failed: ${response.status}`);
    }
    
    const tsResponse = await response.arrayBuffer();
    const tsToken = Buffer.from(tsResponse).toString('base64');
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      token: tsToken,
      provider: 'FreeTSA.org',
    };
    
  } catch (error) {
    console.error('TSA Error:', error);
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      provider: 'FreeTSA.org',
      error: error instanceof Error ? error.message : 'Unknown TSA error',
    };
  }
}

function createTSRequest(hashBuffer: Buffer): Buffer {
  const version = Buffer.from([0x02, 0x01, 0x01]);
  
  const sha256OID = Buffer.from([
    0x30, 0x0d,
    0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
    0x05, 0x00
  ]);
  
  const hashOctetString = Buffer.concat([
    Buffer.from([0x04, hashBuffer.length]),
    hashBuffer
  ]);
  
  const messageImprint = Buffer.concat([
    Buffer.from([0x30, sha256OID.length + hashOctetString.length]),
    sha256OID,
    hashOctetString
  ]);
  
  const certReq = Buffer.from([0x01, 0x01, 0xff]);
  
  const innerContent = Buffer.concat([version, messageImprint, certReq]);
  
  const tsRequest = Buffer.concat([
    Buffer.from([0x30, innerContent.length]),
    innerContent
  ]);
  
  return tsRequest;
}

export async function requestTimestampSimulated(contentHash: string): Promise<TSAResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockToken = Buffer.from(JSON.stringify({
    version: 1,
    policy: "1.2.3.4.1",
    messageImprint: {
      hashAlgorithm: "SHA-256",
      hashedMessage: contentHash
    },
    serialNumber: Date.now().toString(),
    genTime: new Date().toISOString(),
    accuracy: {
      seconds: 1,
      millis: 0,
      micros: 0
    },
    ordering: false,
    nonce: Math.random().toString(36).substring(7),
    tsa: {
      directoryName: "CN=FreeTSA, O=FreeTSA.org, C=WW"
    }
  })).toString('base64');
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    token: mockToken,
    provider: 'FreeTSA.org (Simulated)',
  };
}
