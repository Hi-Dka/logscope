import { Client, Adb, Device } from '@devicefarmer/adbkit';
import { Log } from '../common/logger';

type AdbTacker = Awaited<ReturnType<Client['trackDevices']>>;
type DevicesListener = (devices: Device[]) => void;

export class AndroidDevicesMonitor {
    private static readonly instance: AndroidDevicesMonitor =
        new AndroidDevicesMonitor();

    public static getInstance(): AndroidDevicesMonitor {
        return AndroidDevicesMonitor.instance;
    }

    private client: Client = Adb.createClient();
    private devices: Device[] = [];
    private tracker: AdbTacker | null = null;
    private listeners = new Set<DevicesListener>();

    private constructor() {}

    public getClient(): Client {
        return this.client;
    }
    public getDevices(): Device[] {
        return [...this.devices];
    }

    public async startMonitoring() {
        if (this.tracker) {
            return;
        }

        try {
            this.devices = await this.client.listDevices();
            Log.info(`Find ${this.devices.length} devices:`);
            this.notifyDevicesChanged();

            this.tracker = await this.client.trackDevices();

            this.tracker.on('add', (device) => {
                if (!this.devices.some((d) => d.id === device.id)) {
                    this.devices.push(device);
                    Log.info(`Device ${device.id} was plugged in`);
                    this.notifyDevicesChanged();
                }
            });

            this.tracker.on('remove', (device) => {
                this.devices = this.devices.filter((d) => d.id !== device.id);
                Log.info(`Device ${device.id} was unplugged`);
                this.notifyDevicesChanged();
            });

            this.tracker.on('change', (device) => {
                const index = this.devices.findIndex((d) => d.id === device.id);
                if (index !== -1) {
                    this.devices[index] = device;
                    Log.info(
                        `Device ${device.id} status changed to ${device.type}`,
                    );
                    this.notifyDevicesChanged();
                }
            });

            this.tracker.on('end', () => Log.warn('Tracking stopped'));
        } catch (err) {
            Log.error('Failed to initialize ADB devices:', err);
            throw err;
        }
    }

    public onDidDevicesChange(listener: DevicesListener): () => void {
        this.listeners.add(listener);
        listener([...this.devices]);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyDevicesChanged() {
        const snapshot = [...this.devices];
        this.listeners.forEach((listener) => {
            try {
                listener(snapshot);
            } catch (err) {
                Log.error('Device listener execution failed:', err);
            }
        });
    }

    public dispose() {
        this.tracker?.end();
        this.tracker = null;
        this.devices = [];
        this.listeners.clear();

        Log.info('AndroidDevicesMonitor disposed');
    }
}
