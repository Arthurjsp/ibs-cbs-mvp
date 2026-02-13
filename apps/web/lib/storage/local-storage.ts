import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { XmlStorageAdapter } from "./types";

function resolveDefaultBaseDir() {
  const configured = process.env.STORAGE_LOCAL_DIR?.trim();
  if (configured) return configured;

  // Em ambiente serverless (ex.: Vercel), apenas /tmp e gravável.
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "uploads");
  }

  return path.join(process.cwd(), "uploads");
}

export class LocalXmlStorageAdapter implements XmlStorageAdapter {
  constructor(private readonly baseDir = resolveDefaultBaseDir()) {}

  async saveXml({ tenantId, docKey, xmlContent }: { tenantId: string; docKey: string; xmlContent: string }) {
    const tenantDir = path.join(this.baseDir, tenantId);
    await mkdir(tenantDir, { recursive: true });
    const filename = `${docKey}.xml`;
    const fullPath = path.join(tenantDir, filename);
    await writeFile(fullPath, xmlContent, "utf-8");
    return { path: fullPath, filename };
  }
}
