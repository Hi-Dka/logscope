// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AndroidDevicesMonitor } from './monitor/android-devices-monitor';
import { AdbLogProvider } from './providers/adb/adb-provider';
import { LogEntry } from './common/types';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('LogScope');
    context.subscriptions.push(output);

    const logger = {
        info: (message: string) => {
            output.appendLine(`[INFO] ${message}`);
            console.log(message);
        },
        error: (message: string) => {
            output.appendLine(`[ERROR] ${message}`);
            console.error(message);
        },
    };

    logger.info('Congratulations, your extension "hidka" is now active!');

    const androidMonitor = AndroidDevicesMonitor.getInstance();
    try {
        await androidMonitor.startMonitoring();
        const unsubscribe = androidMonitor.onDidDevicesChange(
            (devices): void => {
                if (devices.length === 0) {
                    logger.info('No Android device connected');
                    return;
                }

                devices.forEach((device) => {
                    console.log(
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
        console.error(
            `Failed to start Android device monitoring: ${String(err)}`,
        );
    }

    // AdbLogProvider()
    output.show(true);

    const disposable = vscode.commands.registerCommand(
        'hidka.helloWorld',
        () => {
            vscode.window.showInformationMessage('Hello World from logcat!');
            logger.info('Hello World command executed');
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
    // context.subscriptions.push(openLogcatPanelDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    AndroidDevicesMonitor.getInstance().dispose();
}
