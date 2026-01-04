export class AscXmlError extends Error {
  code: "INVALID_XML" | "MISSING_FIELD" | "UNSUPPORTED_FORMAT";
  path?: string;

  constructor(
    code: "INVALID_XML" | "MISSING_FIELD" | "UNSUPPORTED_FORMAT",
    message: string,
    path?: string
  ) {
    super(message);
    this.code = code;
    this.path = path;
    this.name = "AscXmlError";
  }
}
