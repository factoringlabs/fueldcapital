import { UserRole } from '@fueled-capital/shared';

export interface AuthenticatedUser {
  id: string;
  cognitoSub: string;
  email: string;
  role: UserRole;
  brokerId: string | null;
  machineryCompanyId: string | null;
}
