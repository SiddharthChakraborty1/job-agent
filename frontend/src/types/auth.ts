export interface User {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
  isAdmin?: boolean;
}
