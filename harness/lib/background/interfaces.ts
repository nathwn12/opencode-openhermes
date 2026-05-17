export interface BackgroundTask {
  id: string;
  command: string;
  args: string[];
  cwd: string;
  status: BackgroundTaskStatus;
  output: string;
  errorOutput: string;
  exitCode: number | null;
  startTime: number;
  endTime: number | null;
  timeout: number;       // ms, 0 = no timeout
  label?: string;
}

export type BackgroundTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled";

export interface BackgroundRunOptions {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;      // ms, default 30000
  label?: string;
  env?: Record<string, string>;
}
