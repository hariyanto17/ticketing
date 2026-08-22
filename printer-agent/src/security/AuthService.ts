export class AuthService {
  constructor(private readonly token: string) {}

  validate(token?: string): boolean {
    return !!token && token === this.token;
  }
}
