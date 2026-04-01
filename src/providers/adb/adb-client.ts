import { DeviceClient } from '@devicefarmer/adbkit';
import { LogProvider } from '../log-provider';
import { AndroidDevicesMonitor } from '../../monitor/android-devices-monitor';
import { LogEntry } from '../../common/types';
import Logcat from '@devicefarmer/adbkit-logcat/lib/logcat';
import Entry from '@devicefarmer/adbkit-logcat/lib/logcat/entry';
import Reader = require('@devicefarmer/adbkit-logcat/lib/logcat/reader');
import { Duplex } from 'stream';

type LogcatReader = Reader;
type LogcatEntry = Entry;

export class AdbLogProvider extends LogProvider {
    private static readonly MAX_BATCH_SIZE = 200;
    private static readonly MAX_BATCH_WAIT_MS = 100;
    private static readonly MAX_BUFFER_SIZE = 5000;
    private static readonly MAX_BATCH_BYTES = 512 * 1024;

    public readonly sourceType = 'adb';
    private readonly sourceId: string;
    private readonly deviceClient: DeviceClient;
    private processNameCache = new Map<number, string>();
    private logReader: LogcatReader | null = null;
    private processCacheTimer: NodeJS.Timeout | null = null;
    private logFlushTimer: NodeJS.Timeout | null = null;
    private isRefreshingProcessCache = false;
    private droppedLogCount = 0;

    constructor(sourceId: string) {
        super();
        this.sourceId = sourceId;
        this.deviceClient = AndroidDevicesMonitor.getInstance()
            .getClient()
            .getDevice(sourceId);
    }

    private async freshProcessNameCache(): Promise<void> {
        if (this.isRefreshingProcessCache) return;
        this.isRefreshingProcessCache = true;

        try {
            const output = await this.deviceClient.shell('ps -A -o pid,comm');
            const outputStr = await this.readShellOutput(output);
            const lines = outputStr.split('\n');
            const nextCache = new Map<number, string>();

            for (const line of lines) {
                const parts = line.trim().split(/\s+/, 2);
                if (parts.length === 2) {
                    const [pidStr, processName] = parts;
                    const pidNum = Number.parseInt(pidStr, 10);
                    if (!Number.isNaN(pidNum)) {
                        nextCache.set(pidNum, processName);
                    }
                }
            }

            console.log(
                `[ADB][${this.sourceId}] refreshed process name cache with ${nextCache.size} entries`,
            );

            this.processNameCache = nextCache;
        } catch (err) {
            console.error(
                `Failed to refresh process name cache: ${String(err)}`,
            );
        } finally {
            this.isRefreshingProcessCache = false;
        }
    }

    private async readShellOutput(stream: Duplex): Promise<string> {
        return await new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            stream.on('data', (chunk: Buffer | string) => {
                if (typeof chunk === 'string') {
                    chunks.push(Buffer.from(chunk));
                    return;
                }

                chunks.push(chunk);
            });

            stream.on('error', reject);
            stream.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });
        });
    }

    private startProcessNameCacheRefresh(): void {
        if (this.processCacheTimer) return;

        void this.freshProcessNameCache();
        this.processCacheTimer = setInterval(() => {
            void this.freshProcessNameCache();
        }, 60_000);
    }

    private stopProcessNameCacheRefresh(): void {
        if (!this.processCacheTimer) return;

        clearInterval(this.processCacheTimer);
        this.processCacheTimer = null;
    }

    private flushLogs(force = false): void {
        if (this.logEntries.length === 0) return;
        if (!force && this.logEntries.length < AdbLogProvider.MAX_BATCH_SIZE) {
            return;
        }

        if (this.droppedLogCount > 0) {
            console.warn(
                `[ADB][${this.sourceId}] dropped ${this.droppedLogCount} logs because buffer exceeded ${AdbLogProvider.MAX_BUFFER_SIZE}`,
            );
            this.droppedLogCount = 0;
        }

        while (this.logEntries.length > 0) {
            const batch = this.pickBatchForFlush();
            if (batch.length === 0) {
                this.logEntries.shift();
                continue;
            }

            this.emitData(batch, this.sourceId);
        }
    }

    private pickBatchForFlush() {
        const batch: LogEntry[] = [];
        let totalBytes = 0;

        while (this.logEntries.length > 0) {
            const nextEntry = this.logEntries[0];
            const nextEntryBytes = this.estimateLogEntryBytes(nextEntry);

            const reachesCountLimit =
                batch.length >= AdbLogProvider.MAX_BATCH_SIZE;
            const reachesBytesLimit =
                batch.length > 0 &&
                totalBytes + nextEntryBytes > AdbLogProvider.MAX_BATCH_BYTES;

            if (reachesCountLimit || reachesBytesLimit) {
                break;
            }

            const shifted = this.logEntries.shift();
            if (!shifted) break;

            batch.push(shifted);
            totalBytes += nextEntryBytes;
        }

        return batch;
    }

    private estimateLogEntryBytes(
        entry: (typeof this.logEntries)[number],
    ): number {
        const numberFieldsBytes = 8 * 3;
        const structuralOverheadBytes = 40;
        const textChars =
            entry.date.length +
            entry.time.length +
            entry.level.length +
            (entry.tag?.length ?? 0) +
            (entry.message?.length ?? 0) +
            (entry.processName?.length ?? 0);

        return numberFieldsBytes + structuralOverheadBytes + textChars * 2;
    }

    private scheduleFlushLogs(): void {
        if (this.logFlushTimer) return;

        this.logFlushTimer = setTimeout(() => {
            this.logFlushTimer = null;
            this.flushLogs(true);
        }, AdbLogProvider.MAX_BATCH_WAIT_MS);
    }

    private clearFlushTimer(): void {
        if (!this.logFlushTimer) return;

        clearTimeout(this.logFlushTimer);
        this.logFlushTimer = null;
    }

    private hydrateLogEntry(entry: LogcatEntry) {
        const level = Logcat.Priority.toLetter(entry.priority);
        const processName =
            this.processNameCache.get(entry.pid) ?? 'unknown_process';
        const d = entry.date;

        const year = d.getFullYear();
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        const hours = `${d.getHours()}`.padStart(2, '0');
        const minutes = `${d.getMinutes()}`.padStart(2, '0');
        const seconds = `${d.getSeconds()}`.padStart(2, '0');
        const millis = `${d.getMilliseconds()}`.padStart(3, '0');

        const dateStr = `${year}-${month}-${day}`;
        const timeStr = `${hours}:${minutes}:${seconds}.${millis}`;

        this.logEntries.push({
            date: dateStr,
            time: timeStr,
            timestamp: d.getTime(),
            pid: entry.pid,
            tid: entry.tid,
            tag: entry.tag,
            processName,
            level: level,
            message: entry.message,
        });

        if (this.logEntries.length > AdbLogProvider.MAX_BUFFER_SIZE) {
            this.logEntries.shift();
            this.droppedLogCount += 1;
        }

        if (this.logEntries.length >= AdbLogProvider.MAX_BATCH_SIZE) {
            this.clearFlushTimer();
            this.flushLogs(true);
            return;
        }

        this.scheduleFlushLogs();
    }

    private async getLogs(): Promise<void> {
        this.logReader = (await this.deviceClient.openLogcat({
            clear: true,
        })) as unknown as LogcatReader;

        this.logReader.on('entry', (entry: LogcatEntry) => {
            this.hydrateLogEntry(entry);
        });

        this.logReader.on('error', (err: unknown) => {
            console.error(`[ADB][${this.sourceId}] log reader error:`, err);
        });

        this.logReader.on('end', () => {
            console.log(`[ADB][${this.sourceId}] log stream ended`);
            this.clearFlushTimer();
            this.flushLogs(true);
            this.logReader = null;
        });
    }

    public async start(): Promise<void> {
        if (this.logReader) return;
        this.startProcessNameCacheRefresh();
        await this.getLogs();
    }

    public async stop(): Promise<void> {
        this.stopProcessNameCacheRefresh();
        this.clearFlushTimer();
        this.flushLogs(true);
        this.logReader?.end();
        this.logReader = null;
    }
}
