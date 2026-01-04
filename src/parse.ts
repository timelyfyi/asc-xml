import { AscXmlError } from "./error.js";
import { asNumber, asString, pickString, stableSortBy, toArray } from "./utils.js";
import type {
  AscDoc,
  Lesson,
  Meta,
  ParseOptions,
  Period,
  Room,
  SchoolClass,
  Subject,
  Teacher
} from "./types.js";
import { parseXml } from "./xml.js";

type LooseNode = Record<string, unknown>;

const asRecord = (value: unknown): LooseNode | undefined => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as LooseNode;
  }
  return undefined;
};

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  strict: true,
  coerceNumbers: true
};

const KNOWN_SECTIONS = [
  "lessons",
  "lesson",
  "teachers",
  "teacher",
  "rooms",
  "room",
  "classes",
  "class",
  "subjects",
  "subject",
  "periods",
  "period"
];

export const parseAscXml = (xml: string, opts?: ParseOptions): AscDoc => {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const parsed = parseXml(xml);

  const root = selectRoot(parsed);
  const hasTimetableTag = root.timetable !== undefined;
  const rawTimetable = hasTimetableTag ? root.timetable : root;
  const timetable: LooseNode = (asRecord(rawTimetable) ?? {}) as LooseNode;

  if (!looksLikeAsc(timetable, hasTimetableTag)) {
    throw new AscXmlError("UNSUPPORTED_FORMAT", "Input XML is not an ASC timetable");
  }

  const meta = extractMeta(root);
  const rooms = parseRooms(
    asRecord(timetable["rooms"])?.room ?? timetable["rooms"] ?? timetable["room"] ?? asRecord(timetable["classrooms"])?.classroom ?? timetable["classrooms"],
    options
  );
  const teachers = parseTeachers(asRecord(timetable["teachers"])?.teacher ?? timetable["teachers"] ?? timetable["teacher"], options);
  const classes = parseClasses(asRecord(timetable["classes"])?.class ?? timetable["classes"] ?? timetable["class"], options);
  const subjects = parseSubjects(asRecord(timetable["subjects"])?.subject ?? timetable["subjects"] ?? timetable["subject"], options);
  const periods = parsePeriods(asRecord(timetable["periods"])?.period ?? timetable["periods"] ?? timetable["period"], options);
  const lessons = parseLessons(asRecord(timetable["lessons"])?.lesson ?? timetable["lessons"] ?? timetable["lesson"], options);

  if (options.strict && lessons.length === 0) {
    throw new AscXmlError("MISSING_FIELD", "No lessons found", "timetable.lessons");
  }

  return {
    meta,
    entities: {
      rooms: stableSortBy(rooms, (r) => r.id),
      teachers: stableSortBy(teachers, (t) => t.id),
      classes: stableSortBy(classes, (c) => c.id),
      subjects: stableSortBy(subjects, (s) => s.id),
      lessons: stableSortBy(lessons, (l) => l.id),
      periods: periods ? stableSortBy(periods, (p) => p.index) : undefined
    }
  };
};

const selectRoot = (node: unknown): LooseNode => {
  const root = asRecord(node);
  if (!root) {
    throw new AscXmlError("INVALID_XML", "XML parsed to empty result");
  }
  if (root.timetable && asRecord(root.timetable)) return root as LooseNode;
  if (root.asc && asRecord(root.asc)) return root.asc as LooseNode;
  if (root.ascTimetable && asRecord(root.ascTimetable)) return root.ascTimetable as LooseNode;
  const keys = Object.keys(root);
  if (keys.length === 1) {
    const only = root[keys[0]];
    const record = asRecord(only);
    return record ?? root;
  }
  return root;
};

const looksLikeAsc = (node: LooseNode | undefined, hasTimetableTag: boolean): boolean => {
  if (!node || typeof node !== "object") return hasTimetableTag;
  if (hasTimetableTag) return true;
  return KNOWN_SECTIONS.some((key) => node[key] !== undefined);
};

const extractMeta = (node: LooseNode): Meta => {
  const meta = node.meta ?? node.header ?? {};
  return {
    source: pickString(meta, ["source", "exporter", "generator"]),
    generatedAt: pickString(meta, ["generatedAt", "generated", "created"]),
    version: pickString(meta, ["version", "ver"])
  };
};

const parseRooms = (section: unknown, options: Required<ParseOptions>): Room[] => {
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: Room[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const id = pickString(obj, ["id", "roomid", "_id"]);
    const name = pickString(obj, ["name", "roomname", "title", "short"]);
    if (!id || !name) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Room missing id or name", `timetable.rooms[${idx}]`);
      }
      return;
    }
    result.push({ id, name });
  });
  return result;
};

const parseTeachers = (section: unknown, options: Required<ParseOptions>): Teacher[] => {
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: Teacher[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const id = pickString(obj, ["id", "teacherid", "_id"]);
    const name = pickString(obj, ["name", "fullname", "teachername", "title"]);
    if (!id || !name) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Teacher missing id or name", `timetable.teachers[${idx}]`);
      }
      return;
    }
    const short = pickString(obj, ["short", "code", "abbr"]);
    result.push({ id, name, short });
  });
  return result;
};

const parseClasses = (section: unknown, options: Required<ParseOptions>): SchoolClass[] => {
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: SchoolClass[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const id = pickString(obj, ["id", "classid", "_id"]);
    const name = pickString(obj, ["name", "classname", "title", "short"]);
    if (!id || !name) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Class missing id or name", `timetable.classes[${idx}]`);
      }
      return;
    }
    result.push({ id, name });
  });
  return result;
};

const parseSubjects = (section: unknown, options: Required<ParseOptions>): Subject[] => {
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: Subject[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const id = pickString(obj, ["id", "subjectid", "_id"]);
    const name = pickString(obj, ["name", "subjectname", "title"]);
    if (!id || !name) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Subject missing id or name", `timetable.subjects[${idx}]`);
      }
      return;
    }
    const short = pickString(obj, ["short", "code", "abbr"]);
    result.push({ id, name, short });
  });
  return result;
};

const parsePeriods = (section: unknown, options: Required<ParseOptions>): Period[] | undefined => {
  if (section === undefined || section === null) return undefined;
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: Period[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const indexRaw = pickString(obj, ["index", "number", "position", "period"]);
    const index = asNumber(indexRaw);
    if (index === undefined) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Period missing index", `timetable.periods[${idx}].index`);
      }
      return;
    }
    const id = pickString(obj, ["id", "periodid", "_id"]);
    const start = pickString(obj, ["start", "starttime"]);
    const end = pickString(obj, ["end", "endtime"]);
    result.push({ id, index, start, end });
  });
  return result;
};

const parseLessons = (section: unknown, options: Required<ParseOptions>): Lesson[] => {
  const list = toArray(section as LooseNode | LooseNode[]);
  const result: Lesson[] = [];
  list.forEach((node, idx) => {
    const obj = asRecord(node) ?? {};
    const id = pickString(obj, ["id", "lessonid", "_id"]);
    if (!id) {
      if (options.strict) {
        throw new AscXmlError("MISSING_FIELD", "Lesson missing id", `timetable.lessons[${idx}]`);
      }
      return;
    }

    const day = options.coerceNumbers ? asNumber(obj.day ?? obj.dow) : undefined;
    const period = options.coerceNumbers ? asNumber(obj.period ?? obj.slot) : undefined;
    const start = pickString(obj, ["start", "starttime"]);
    const end = pickString(obj, ["end", "endtime"]);
    const subjectId = pickString(obj, ["subjectId", "subject", "subjectid"]);

    const teacherIds = collectIds(obj, ["teacherIds", "teachers", "teacher", "teacherids"]);
    const classIds = collectIds(obj, ["classIds", "classes", "class", "classids", "groupids"]);
    const roomIds = collectIds(obj, ["roomIds", "rooms", "room", "roomids", "classroomids"]);

    const lesson: Lesson = { id };
    if (day !== undefined) lesson.day = day;
    if (period !== undefined) lesson.period = period;
    if (start !== undefined) lesson.start = start;
    if (end !== undefined) lesson.end = end;
    if (subjectId !== undefined) lesson.subjectId = subjectId;
    if (teacherIds.length) lesson.teacherIds = teacherIds;
    if (classIds.length) lesson.classIds = classIds;
    if (roomIds.length) lesson.roomIds = roomIds;

    if (!options.strict) {
      const raw = collectUnknown(obj, [
        "id",
        "lessonid",
        "_id",
        "day",
        "dow",
        "period",
        "slot",
        "start",
        "starttime",
        "end",
        "endtime",
        "subjectId",
        "subject",
        "subjectid",
        "teacherIds",
        "teachers",
        "teacher",
        "teacherids",
        "classIds",
        "classes",
        "class",
        "classids",
        "groupids",
        "roomIds",
        "rooms",
        "room",
        "roomids",
        "classroomids"
      ]);
      if (raw && Object.keys(raw).length) lesson.raw = raw;
    }

    result.push(lesson);
  });
  return result;
};

const collectIds = (node: LooseNode, keys: string[]): string[] => {
  for (const key of keys) {
    const value = node[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      return value
        .split(/[,\s]+/)
        .map((v) => v.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      const ids = toArray(value)
        .map((item) => pickString(item as LooseNode, ["id", "value", "_id"]) ?? asString(item))
        .filter((v): v is string => Boolean(v));
      return ids;
    }
    const record = asRecord(value);
    const fromId = record?.id ?? value;
    const ids = toArray(fromId as LooseNode | string)
      .map((item) => pickString(item as LooseNode, ["id", "value", "_id"]) ?? asString(item))
      .filter((v): v is string => Boolean(v));
    return ids;
  }
  return [];
};

const collectUnknown = (node: LooseNode, knownKeys: string[]): Record<string, string> => {
  const raw: Record<string, string> = {};
  Object.entries(node).forEach(([key, value]) => {
    if (knownKeys.includes(key)) return;
    const str = asString(value);
    if (str !== undefined) raw[key] = str;
  });
  return raw;
};
