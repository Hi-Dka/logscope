import { LogSesion } from './log-session';

export class SessionManager {
    private activeSessions = new Map<string, LogSesion>();

    public createSession(deviceId: string): void {
        if (this.activeSessions.has(deviceId)) {
        }

        const newSession = new LogSesion(deviceId);
        this.activeSessions.set(deviceId, newSession);
    }

    public stopSession(deviceId: string): void {
        this.activeSessions.delete(deviceId);
    }
}
