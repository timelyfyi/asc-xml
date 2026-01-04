import { XMLParser } from "fast-xml-parser";
import { AscXmlError } from "./error.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
  allowBooleanAttributes: true
});

export const parseXml = (xml: string): unknown => {
  try {
    const parsed = parser.parse(xml);
    if (!parsed || typeof parsed !== "object") {
      throw new AscXmlError("INVALID_XML", "XML parsed to empty result");
    }
    return parsed;
  } catch (err) {
    if (err instanceof AscXmlError) throw err;
    const message = err instanceof Error ? err.message : "Invalid XML input";
    throw new AscXmlError("INVALID_XML", message);
  }
};
