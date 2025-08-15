export type TaskID = string;

export type Frequency =
  | { kind: 'once'; at: Date }
  | { kind: 'interval'; everyMs: number; nextAt: Date }
  | { kind: 'daily'; hour: number; minute: number; nextAt: Date }
  | { kind: 'weekly'; dow: number; hour: number; minute: number; nextAt: Date }; // 0=Dom

export interface Task {
  id: TaskID;
  label: string;
  frequency: Frequency;
  payload?: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  lastRunAt?: Date;
}

export interface PersistAdapter {
  load(): Promise<Task[]>;
  save(tasks: Task[]): Promise<void>;
}
