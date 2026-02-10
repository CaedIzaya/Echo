export interface DayRecord {
  id: string;
  date: string; // ISO string
  rawNote: string;
  aiReflection: string;
}

export interface StarProps {
  record: DayRecord;
  onClick: (record: DayRecord) => void;
  index: number;
}
