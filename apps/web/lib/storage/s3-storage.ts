import { XmlStorageAdapter } from "./types";

export class S3XmlStorageAdapter implements XmlStorageAdapter {
  async saveXml(): Promise<{ path: string; filename: string }> {
    throw new Error("S3XmlStorageAdapter não implementado no MVP. Use STORAGE_DRIVER=local.");
  }
}

