import * as vscode from 'vscode';

export interface Device {
    id: string; // Serial number or file path
    type: 'offline' | 'device' | 'emulator' | 'authorizing' | 'unauthorized';
    name?: string; // Model name if available
}

export interface LogEntry {
    timestamp: Date;
    level: string;
    tag: string;
    pid: number;
    tid: number;
    message: string;
}

/**
 * Interface that all log sources must implement.
 * Examples: AdbDataSource, FileDataSource
 */
export interface DataSource extends vscode.Disposable {
    /**
     * Start monitoring for available devices/sources.
     */
    start(): Promise<void>;

    /**
     * Event fired when the list of available devices changes.
     */
    readonly onDevicesChanged: vscode.Event<Device[]>;

    /**
     * Get the current list of devices.
     */
    getDevices(): Device[];

    /**
     * Select a specific device to start streaming logs from.
     * (We will implement the streaming part later)
     */
    connectDevice(deviceId: string): Promise<void>;
}
