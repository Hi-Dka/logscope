import { Adb, Client } from '@devicefarmer/adbkit';

export const client: Client = Adb.createClient();

export async function initializeDevices() {
  const devices = await client.listDevices();
  return devices;
}

