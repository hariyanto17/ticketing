export interface UserResponse {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  branchId: string;
  isActive: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}
