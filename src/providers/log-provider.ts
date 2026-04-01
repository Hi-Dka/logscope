import { LogEntry } from '../common/types';
import Denque from 'denque';

type LogDataListener = (data: LogEntry[], sourceId: string) => void;

export abstract class LogProvider {
    // sourceId is android device id.
    public abstract readonly sourceType: 'adb' | 'file' | 'network';
    protected logEntries = new Denque<LogEntry>();
    private readonly listeners = new Set<LogDataListener>();

    public onDidData(callback: LogDataListener): () => void {
        this.listeners.add(callback);

        return () => {
            this.listeners.delete(callback);
        };
    }

    protected emitData(data: LogEntry[], sourceId: string): void {
        if (data.length === 0) return;

        this.listeners.forEach((listener) => {
            try {
                listener(data, sourceId);
            } catch (err) {
                console.error('Log data listener execution failed:', err);
            }
        });
    }

    public abstract start(): Promise<void>;
    public abstract stop(): Promise<void>;
}
