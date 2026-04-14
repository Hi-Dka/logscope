import { LogSesion } from './log-session';

export class SessionManager {
    private activeSessions = new Map<string, LogSesion>();

    public createSession(deviceId: string): void {
        if (this.activeSessions.has(deviceId)) {
            // TODO(yangxinxin): Handle this case, maybe throw an error or log a warning
            return;
        }

        const newSession = new LogSesion(deviceId);
        this.activeSessions.set(deviceId, newSession);
    }

    public stopSession(deviceId: string): void {
        this.activeSessions.delete(deviceId);
    }
}
