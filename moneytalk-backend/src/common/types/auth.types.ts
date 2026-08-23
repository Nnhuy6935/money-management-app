import { UserRole } from '../constants/roles';

export type JwtPayload = {
  sub: number;
  email: string;
  role: UserRole;
};

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};
