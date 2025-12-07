export const tempUsers = new Map<string, {
  fullName: string;
  email: string; // original casing
  password: string;
  verificationCode: string;
  verified: boolean;
  expiresAt: number;
}>();
