// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AndroidDevicesMonitor } from './monitor/android-devices-monitor';
import { AdbLogProvider } from './providers/adb/adb-log-provider';
import { LogEntry } from './common/types';
import { Log } from './common/logger';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    Log.init(context);

    Log.info('Congratulations, your extension "hidka" is now active!');

    const androidMonitor = AndroidDevicesMonitor.getInstance();
    try {
        await androidMonitor.startMonitoring();
        const unsubscribe = androidMonitor.onDidDevicesChange(
            (devices): void => {
                if (devices.length === 0) {
                    Log.info('No Android device connected');
                    return;
                }

                devices.forEach((device) => {
                    Log.info(
                        `Connected device: ${device.id} (${device.type})`,
                    );
                    //     const logProvider = new AdbLogProvider(device.id);

                    //     logProvider.onDidData((data: LogEntry[], sourceId: string) => {
                    //         for (const entry of data) {
                    //             const logLine = `[${entry.date} ${entry.time}] [${entry.level}] [${entry.processName ?? 'unknown'}:${entry.pid}] ${entry.tag}: ${entry.message}`;
                    //             logger.info(`[${sourceId}] ${logLine}`);
                    //         }
                    //     });

                    //     logProvider.start().catch((err) => {
                    //         logger.error(
                    //             `Failed to start log provider for device ${device.id}: ${String(
                    //                 err,
                    //             )}`,
                    //         );
                    //     });
                });
            },
        );

        context.subscriptions.push(new vscode.Disposable(unsubscribe));
    } catch (err) {
        Log.error(
            `Failed to start Android device monitoring: ${String(err)}`,
        );
    }

    // AdbLogProvider()
    Log.show();

    const disposable = vscode.commands.registerCommand(
        'hidka.helloWorld',
        () => {
            vscode.window.showInformationMessage('Hello World from logcat!');
            Log.info('Hello World command executed');
        },
    );

    const disposable2 = vscode.commands.registerCommand(
        'hidka.showOutput',
        () => {
            Log.show();
            Log.info('Show Output command executed');
            const androidMonitor = AndroidDevicesMonitor.getInstance();
            const devices = androidMonitor.getDevices();
            devices.forEach((device) => {
                // logger.info(`Device: ${device.id} (${device.type})`);
                const logProvider = new AdbLogProvider(device.id);

                logProvider.onDidData((data: LogEntry[], sourceId: string) => {
                    for (const entry of data) {
                        const logLine = `[${entry.date} ${entry.time}] [${entry.level}] [${entry.processName ?? 'unknown'}:${entry.pid}] ${entry.tag}: ${entry.message}`;
                        // logger.info(`[${sourceId}] ${logLine}`);
                    }
                });

                logProvider.start().catch((err) => {
                    Log.error(
                        `Failed to start log provider for device ${device.id}: ${String(
                            err,
                        )}`,
                    );
                });
            });
        },
    );
    // const openLogcatPanelDisposable = vscode.commands.registerCommand(
    //     'hidka.openLogcatPanel',
    //     () => {
    //         LogcatPanel.render(context.extensionUri, sessionManager);
    //         logger.info('Open Logcat Panel command executed');
    //     },
    // );

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
    // context.subscriptions.push(openLogcatPanelDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    AndroidDevicesMonitor.getInstance().dispose();
}
