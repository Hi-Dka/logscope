import { AdbLogProvider } from '../providers/adb/adb-provider';
import { LogEntry } from '../common/types';

export class LogSesion {
    private readonly provider: AdbLogProvider;

    private unsubscribe: (() => void) | null = null;

    constructor(private readonly deviceId: string) {
        this.provider = new AdbLogProvider(this.deviceId);
    }

    private subscribeToLogs(): void {
        this.unsubscribe = this.provider.onDidData(
            (data: LogEntry[], sourceId: string) => {
                for (const entry of data) {
                    const logLine = `[${entry.date} ${entry.time}] [${entry.level}] [${entry.processName ?? 'unknown'}:${entry.pid}] ${entry.tag}: ${entry.message}`;
                    console.log(`[${sourceId}] ${logLine}`);
                }
            },
        );
    }

    public async start(): Promise<void> {
        this.subscribeToLogs();
        await this.provider.start();
    }

    public async stop(): Promise<void> {
        await this.provider.stop();
        this.unsubscribe?.();
    }
}
