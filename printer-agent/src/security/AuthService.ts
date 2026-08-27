export class AuthService {
  constructor(private readonly deviceId: string) {}

  validateDeviceId(deviceId?: string): boolean {
    return !!deviceId && deviceId === this.deviceId;
  }
}
