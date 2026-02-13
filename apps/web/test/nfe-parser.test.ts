import { describe, expect, it } from "vitest";
import { NfeValidationError, parseNfeXml } from "../lib/xml/nfe-parser";

const validNfeXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35123456789012345678901234567890123456789012" versao="4.00">
      <ide>
        <dhEmi>2026-02-12T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <enderEmit>
          <UF>SP</UF>
        </enderEmit>
      </emit>
      <dest>
        <enderDest>
          <UF>PR</UF>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>10000000</NCM>
          <CFOP>6102</CFOP>
          <qCom>1.0000</qCom>
          <vUnCom>1000.0000</vUnCom>
          <vProd>1000.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>1000.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <chNFe>35123456789012345678901234567890123456789012</chNFe>
    </infProt>
  </protNFe>
</nfeProc>`;

describe("parseNfeXml", () => {
  it("parses a valid NFe xml and normalizes core fields", async () => {
    const parsed = await parseNfeXml(validNfeXml);
    expect(parsed.key).toBe("35123456789012345678901234567890123456789012");
    expect(parsed.emitterUf).toBe("SP");
    expect(parsed.recipientUf).toBe("PR");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.totalValue).toBe(1000);
  });

  it("throws friendly error on malformed xml", async () => {
    await expect(parseNfeXml("<nfeProc><NFe>")).rejects.toBeInstanceOf(NfeValidationError);
    await expect(parseNfeXml("<nfeProc><NFe>")).rejects.toMatchObject({
      userMessage: "Não foi possível ler o XML enviado."
    });
  });

  it("throws friendly error when infNFe is missing", async () => {
    const xml = `<?xml version="1.0"?><nfeProc><NFe></NFe></nfeProc>`;
    await expect(parseNfeXml(xml)).rejects.toMatchObject({
      userMessage: "XML NF-e inválido: bloco infNFe não encontrado."
    });
  });

  it("throws friendly error when issue date is invalid", async () => {
    const xml = validNfeXml.replace("2026-02-12T10:00:00-03:00", "invalid-date");
    await expect(parseNfeXml(xml)).rejects.toMatchObject({
      userMessage: "Não foi possível identificar a data de emissão da NF-e."
    });
  });
});
