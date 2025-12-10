export async function calculateSHA256(data: Blob | ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;
  
  if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data).buffer;
  } else {
    buffer = data;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export async function calculateSHA256FromFile(file: File): Promise<string> {
  return calculateSHA256(file);
}

export function verifyHash(originalHash: string, newHash: string): boolean {
  return originalHash.toLowerCase() === newHash.toLowerCase();
}
