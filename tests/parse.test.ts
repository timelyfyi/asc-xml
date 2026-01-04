import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AscXmlError, parseAscXml } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parseAscXml", () => {
  it("parses a minimal timetable", () => {
    const xml = readFixture("minimal.xml");
    const doc = parseAscXml(xml);

    expect(doc.meta).toEqual({
      source: "ASC",
      generatedAt: "2024-09-01T12:00:00Z",
      version: "1.0"
    });

    expect(doc).toMatchInlineSnapshot(`
      {
        "entities": {
          "classes": [
            {
              "id": "C1",
              "name": "Class 1",
            },
          ],
          "lessons": [
            {
              "classIds": [
                "C1",
              ],
              "day": 1,
              "end": "2024-09-02T08:45:00Z",
              "id": "L1",
              "period": 1,
              "roomIds": [
                "R1",
              ],
              "start": "2024-09-02T08:00:00Z",
              "subjectId": "S1",
              "teacherIds": [
                "T1",
              ],
            },
          ],
          "periods": [
            {
              "end": "08:45",
              "id": "P1",
              "index": 1,
              "start": "08:00",
            },
          ],
          "rooms": [
            {
              "id": "R1",
              "name": "Room 1",
            },
          ],
          "subjects": [
            {
              "id": "S1",
              "name": "Math",
              "short": "MA",
            },
          ],
          "teachers": [
            {
              "id": "T1",
              "name": "Alice Smith",
              "short": "AS",
            },
          ],
        },
        "meta": {
          "generatedAt": "2024-09-01T12:00:00Z",
          "source": "ASC",
          "version": "1.0",
        },
      }
    `);
  });

  it("handles messy input when strict=false", () => {
    const xml = readFixture("messy.xml");
    const doc = parseAscXml(xml, { strict: false });

    expect(doc.entities.lessons.length).toBe(2);
    expect(doc.entities.lessons[0]).toMatchInlineSnapshot(`
      {
        "day": 2,
        "id": "L2",
        "period": 3,
        "raw": {
          "extraTag": "keep-me",
        },
        "roomIds": [
          "R2",
        ],
        "subjectId": "S2",
        "teacherIds": [
          "T2",
        ],
      }
    `);
    expect(doc.entities.lessons[1].teacherIds).toEqual(["T2", "T3"]);
    expect(doc.entities.lessons[1].classIds).toEqual(["C2"]);
    expect(doc.entities.lessons[1].roomIds).toEqual(["R3"]);
  });

  it("parses a real asc xml export", () => {
    const xml = readFixture("real.xml");
    const doc = parseAscXml(xml);

    expect(doc.entities.lessons.length).toBeGreaterThan(50);
    expect(doc.entities.rooms.length).toBeGreaterThan(20);
    expect(doc.entities.teachers.length).toBeGreaterThan(20);

    const sample = doc.entities.lessons.find((l) => l.id === "68C781D6975C659A");
    expect(sample).toBeDefined();
    expect(sample?.subjectId).toBe("569F527DCF5683A9");
    expect(sample?.teacherIds).toEqual(["1272C2CC371654BB"]);
    expect(sample?.roomIds).toEqual(["2EAF1C61428C74FC"]);
    expect(sample?.classIds).toEqual(["A6B942C9506790A0"]);
  });

  it("throws on invalid xml", () => {
    expect(() => parseAscXml("<broken")).toThrowError(AscXmlError);
    try {
      parseAscXml("<broken");
    } catch (err: unknown) {
      if (err instanceof AscXmlError) {
        expect(err.code).toBe("INVALID_XML");
      } else {
        throw err;
      }
    }
  });

  it("throws on unsupported format", () => {
    const xml = "<root><data /></root>";
    expect(() => parseAscXml(xml)).toThrowError(AscXmlError);
    try {
      parseAscXml(xml);
    } catch (err: unknown) {
      if (err instanceof AscXmlError) {
        expect(err.code).toBe("UNSUPPORTED_FORMAT");
      } else {
        throw err;
      }
    }
  });

  it("throws when required sections are missing in strict mode", () => {
    const xml = "<asc><timetable></timetable></asc>";
    expect(() => parseAscXml(xml)).toThrowError(AscXmlError);
    try {
      parseAscXml(xml);
    } catch (err: unknown) {
      if (err instanceof AscXmlError) {
        expect(err.code).toBe("MISSING_FIELD");
      } else {
        throw err;
      }
    }
  });
});
