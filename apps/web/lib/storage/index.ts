import { LocalXmlStorageAdapter } from "./local-storage";
import { S3XmlStorageAdapter } from "./s3-storage";
import { XmlStorageAdapter } from "./types";

export function getXmlStorageAdapter(): XmlStorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") return new S3XmlStorageAdapter();
  return new LocalXmlStorageAdapter();
}

