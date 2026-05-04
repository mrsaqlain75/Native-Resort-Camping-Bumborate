// contracts/constants.ts
export const Session = {
  cookieName: "auth_token",
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
  invalidCredentials: "Invalid email or password",
} as const;

export const Paths = {
  login: "/login",
  dashboard: "/dashboard",
} as const;