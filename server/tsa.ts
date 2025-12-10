import OpenTimestamps from 'opentimestamps';

interface TSAResponse {
  success: boolean;
  timestamp?: string;
  token?: string;
  provider?: string;
  error?: string;
  pending?: boolean;
}

export async function requestTimestamp(contentHash: string): Promise<TSAResponse> {
  try {
    const hashBuffer = Buffer.from(contentHash, 'hex');
    
    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
      new OpenTimestamps.Ops.OpSHA256(),
      hashBuffer
    );
    
    await OpenTimestamps.stamp(detached);
    
    const otsProof = detached.serializeToBytes();
    const otsToken = Buffer.from(otsProof).toString('base64');
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      token: otsToken,
      provider: 'OpenTimestamps.org (Bitcoin)',
      pending: true,
    };
    
  } catch (error) {
    console.error('OpenTimestamps Error:', error);
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      provider: 'OpenTimestamps.org',
      error: error instanceof Error ? error.message : 'Unknown OpenTimestamps error',
    };
  }
}

export async function upgradeTimestamp(otsToken: string): Promise<TSAResponse> {
  try {
    const otsBytes = Buffer.from(otsToken, 'base64');
    const detached = OpenTimestamps.DetachedTimestampFile.deserialize(otsBytes);
    
    const changed = await OpenTimestamps.upgrade(detached);
    
    if (changed) {
      const upgradedOts = detached.serializeToBytes();
      const upgradedToken = Buffer.from(upgradedOts).toString('base64');
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        token: upgradedToken,
        provider: 'OpenTimestamps.org (Bitcoin)',
        pending: false,
      };
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      token: otsToken,
      provider: 'OpenTimestamps.org (Bitcoin)',
      pending: true,
    };
    
  } catch (error) {
    console.error('OpenTimestamps Upgrade Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upgrade error',
    };
  }
}

export async function verifyTimestamp(otsToken: string, contentHash: string): Promise<{
  valid: boolean;
  verified: boolean;
  bitcoinBlockHeight?: number;
  bitcoinBlockTime?: string;
  info?: string;
  error?: string;
}> {
  try {
    const otsBytes = Buffer.from(otsToken, 'base64');
    const detached = OpenTimestamps.DetachedTimestampFile.deserialize(otsBytes);
    
    const info = OpenTimestamps.info(detached);
    
    const storedHash = detached.fileDigest().toString('hex');
    const hashMatch = storedHash === contentHash;
    
    if (!hashMatch) {
      return {
        valid: false,
        verified: false,
        error: 'Hash mismatch: content has been modified',
      };
    }
    
    const hasBitcoinAttestation = info.includes('verify BitcoinBlockHeaderAttestation') || 
                                   info.includes('Bitcoin block');
    
    return {
      valid: true,
      verified: hasBitcoinAttestation,
      info: info,
    };
    
  } catch (error) {
    console.error('OpenTimestamps Verify Error:', error);
    
    return {
      valid: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown verify error',
    };
  }
}

export function getTimestampInfo(otsToken: string): string {
  try {
    const otsBytes = Buffer.from(otsToken, 'base64');
    const detached = OpenTimestamps.DetachedTimestampFile.deserialize(otsBytes);
    return OpenTimestamps.info(detached);
  } catch (error) {
    return 'Unable to parse timestamp info';
  }
}
