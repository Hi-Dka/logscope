import * as vscode from 'vscode';
import { SessionManager } from '../session/session-manger';

export class LogcatPanel {
    public static currentPanel: LogcatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private sessionManager: SessionManager,
    ) {
        this._panel = panel;

        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'start-session':
                        this.sessionManager.createSession(message.deviceId);
                        break;
                    case 'stop-session':
                        this.sessionManager.stopSession(message.deviceId);
                        break;
                }
            },
            null,
            this._disposables,
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static render(
        extensionUri: vscode.Uri,
        sessionManager: SessionManager,
    ) {
        if (LogcatPanel.currentPanel) {
            LogcatPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'logcatView',
                'Android Logcat',
                vscode.ViewColumn.One,
                { enableScripts: true },
            );
            LogcatPanel.currentPanel = new LogcatPanel(
                panel,
                extensionUri,
                sessionManager,
            );
        }
    }

    public dispose() {
        LogcatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }
}
