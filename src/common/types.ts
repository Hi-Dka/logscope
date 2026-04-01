export interface LogEntry {
    date: string;
    time: string;
    timestamp: number;
    pid: number;
    tid: number;
    tag: string;
    processName?: string;
    // packageName?: string;
    level: string;
    message: string;
}
