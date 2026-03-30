import * as vscode from 'vscode';
import { Client, Device as AdbKitDevice } from '@devicefarmer/adbkit';
import { DataSource, Device } from '../interface/datasource';
import { client } from './adb-client';

export class AdbDataSource implements DataSource {
    private _client: Client;
    private _tracker: any;
    private _devices: Device[] = [];
    
    private _onDevicesChanged = new vscode.EventEmitter<Device[]>();
    public readonly onDevicesChanged = this._onDevicesChanged.event;

    constructor() {
        this._client = client;
    }

    public async start(): Promise<void> {
        try {
            // Initial fetch
            await this.refreshDevices();

            // Start tracking
            this._tracker = await this._client.trackDevices();
            this._tracker.on('add', (device: AdbKitDevice) => this.handleDeviceChange());
            this._tracker.on('remove', (device: AdbKitDevice) => this.handleDeviceChange());
            this._tracker.on('change', (device: AdbKitDevice) => this.handleDeviceChange());
            this._tracker.on('end', () => { 
                console.log('ADB Tracking ended');
            });
            
            console.log('ADB DataSource started tracking');
        } catch (err) {
            console.error('Failed to start ADB tracking:', err);
            vscode.window.showErrorMessage(`ADB Error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    public getDevices(): Device[] {
        return this._devices;
    }

    public async connectDevice(deviceId: string): Promise<void> {
        // Placeholder for the next step (Log Streaming)
        console.log(`Connecting to device ${deviceId}...`);
    }

    public dispose() {
        if (this._tracker) {
            this._tracker.end();
        }
        this._onDevicesChanged.dispose();
    }

    private async handleDeviceChange() {
        await this.refreshDevices();
        this._onDevicesChanged.fire(this._devices);
    }

    private async refreshDevices() {
        try {
            const adbDevices = await this._client.listDevices();
            this._devices = await Promise.all(adbDevices.map(async d => {
                let name = `Device ${d.id}`;
                if (d.type === 'device') {
                    try {
                        // Attempt to get model name
                        const deviceClient = this._client.getDevice(d.id);
                        const model = await deviceClient.getProperties();
                        if(model && model['ro.product.model']) {
                            name = model['ro.product.model'];
                        }
                    } catch (e) {
                        // ignore error fetching props
                    }
                }
                
                return {
                    id: d.id,
                    type: d.type as 'offline' | 'device' | 'emulator' | 'authorizing' | 'unauthorized',
                    name: name
                };
            }));
        } catch (e) {
            console.error('Failed to refresh devices', e);
        }
    }
}
