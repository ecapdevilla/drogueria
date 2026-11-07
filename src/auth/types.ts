export type AppRole = 'admin' | 'cashier' | 'inventory';

export interface UserProfile {
  id: string;
  organization_id: string | null;
  store_id: string | null;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}
