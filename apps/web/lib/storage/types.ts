export interface StoredXml {
  path: string;
  filename: string;
}

export interface XmlStorageAdapter {
  saveXml(params: { tenantId: string; docKey: string; xmlContent: string }): Promise<StoredXml>;
}

