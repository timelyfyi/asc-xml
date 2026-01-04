# @timelyfyi/asc-xml

Parse ASC timetable XML exports into a small, typed JSON model. Built for Node 20+, ESM-first, zero runtime dependencies beyond the XML parser.

- Parses ASC-style timetable XML into `AscDoc` with rooms, teachers, classes, subjects, periods, and lessons.
- Normalizes IDs to strings and trims text.
- Stable output ordering (sorted by id or index).
- Throws typed errors instead of guessing.

## Install

```sh
npm install @timelyfyi/asc-xml
# or pnpm add @timelyfyi/asc-xml
```

## Usage

```ts
import { parseAscXml } from "@timelyfyi/asc-xml";

const xml = await fs.promises.readFile("timetable.xml", "utf8");
const doc = parseAscXml(xml, { strict: true, coerceNumbers: true });
console.log(doc.entities.lessons[0]);
```

## API

```ts
export type ParseOptions = {
  strict?: boolean; // default true; if false, unknown tags under lessons are surfaced in `raw` and missing required fields are skipped instead of thrown.
  coerceNumbers?: boolean; // default true; when false, optional numeric fields like day/period are omitted if only string values are present.
};

export class AscXmlError extends Error {
  code: "INVALID_XML" | "MISSING_FIELD" | "UNSUPPORTED_FORMAT";
  path?: string; // e.g., "timetable.periods[2].start"
}

export function parseAscXml(xml: string, opts?: ParseOptions): AscDoc;
```

### Output model

```ts
export type AscDoc = {
  meta: {
    source?: string;
    generatedAt?: string; // ISO-ish string from XML if present
    version?: string;
  };
  entities: {
    rooms: Room[];
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    lessons: Lesson[];
    periods?: Period[];
  };
};
```

See `src/types.ts` for the exact shapes.

## Error handling

```ts
try {
  const doc = parseAscXml(xml);
} catch (err) {
  if (err instanceof AscXmlError) {
    console.error(err.code, err.path ?? "");
  }
  throw err;
}
```

- `INVALID_XML`: the XML could not be parsed.
- `UNSUPPORTED_FORMAT`: no timetable-like sections were found.
- `MISSING_FIELD`: a required field is absent while `strict` is true.

## Compatibility & stability
- Target: Node 20+.
- ESM-only package.
- Deterministic: same XML yields the same ordered JSON output.
- No hidden global state; pure functions only.

## Development

```sh
npm run build
npm run test
npm run lint
```

MIT License. See `LICENSE`.
