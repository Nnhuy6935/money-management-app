import { UserRole } from '../constants/roles';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  jti: string;
};
