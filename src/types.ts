export type ParseOptions = {
  strict?: boolean; // default true
  coerceNumbers?: boolean; // default true
};

export type AscDoc = {
  meta: Meta;
  entities: Entities;
};

export type Meta = {
  source?: string;
  generatedAt?: string;
  version?: string;
};

export type Entities = {
  rooms: Room[];
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  lessons: Lesson[];
  periods?: Period[];
};

export type Room = { id: string; name: string };
export type Teacher = { id: string; name: string; short?: string };
export type SchoolClass = { id: string; name: string };
export type Subject = { id: string; name: string; short?: string };

export type Period = { id?: string; index: number; start?: string; end?: string };

export type Lesson = {
  id: string;
  day?: number;
  period?: number;
  start?: string;
  end?: string;
  subjectId?: string;
  teacherIds?: string[];
  classIds?: string[];
  roomIds?: string[];
  raw?: Record<string, string>;
};
