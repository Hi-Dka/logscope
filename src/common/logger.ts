import * as vscode from 'vscode';

class Logger {
    private _channel: vscode.OutputChannel | undefined;

    private get channel(): vscode.OutputChannel {
        if (!this._channel) {
            this._channel = vscode.window.createOutputChannel('Hidka Logcat');
        }
        return this._channel;
    }

    public info(message: string, tag?: string) {
        const tagStr = tag ? `[${tag}]` : '';
        this.channel.appendLine(`[INFO]${tagStr} ${message}`);
    }
}

export const logger = new Logger();
