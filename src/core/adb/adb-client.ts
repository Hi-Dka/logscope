// 封装ADB Socket通信（track-devices、shell等）
import { Adb, Client } from '@devicefarmer/adbkit';
import type { Device as AdbDevice } from '@devicefarmer/adbkit';
import  ShellOptions  from '@devicefarmer/adbkit';

const client: Client = Adb.createClient();

export class AdbClientWrapper {
  private client: AdbClient;

  constructor() {
    this.client = new AdbClient();
  }

  async listDevices(): Promise<AdbDevice[]> {
    return await this.client.listDevices();
  }

  async shell(deviceId: string, command: string, options?: AdbShellOptions): Promise<string> {
    const output = await this.client.shell(deviceId, command, options);
    return output.toString();
  }

  // 其他ADB相关方法可以在这里添加，例如安装应用、推送文件等
}   