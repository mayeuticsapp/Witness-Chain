declare module 'opentimestamps' {
  namespace Ops {
    class OpSHA256 {}
    class OpSHA1 {}
    class OpRIPEMD160 {}
  }

  class DetachedTimestampFile {
    static fromBytes(op: Ops.OpSHA256 | Ops.OpSHA1 | Ops.OpRIPEMD160, file: Buffer): DetachedTimestampFile;
    static fromHash(op: Ops.OpSHA256 | Ops.OpSHA1 | Ops.OpRIPEMD160, hash: Buffer): DetachedTimestampFile;
    static deserialize(bytes: Buffer): DetachedTimestampFile;
    serializeToBytes(): Uint8Array;
    fileDigest(): Buffer;
  }

  function stamp(detached: DetachedTimestampFile | DetachedTimestampFile[]): Promise<void>;
  function upgrade(detached: DetachedTimestampFile): Promise<boolean>;
  function verify(detached: DetachedTimestampFile, original: DetachedTimestampFile): Promise<any>;
  function info(detached: DetachedTimestampFile | Buffer): string;

  export default {
    Ops,
    DetachedTimestampFile,
    stamp,
    upgrade,
    verify,
    info,
  };
}
