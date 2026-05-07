export type UserRole = 'requester' | 'approver' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  avatar?: string;
  permissions?: string[];
}
