export interface JwtPayload {
  userId: string;
  role: string;
}

export interface UserSession {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}
