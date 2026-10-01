import { z } from "zod";

// NIST SP 800-63B: at least 8 characters, allow long passphrases, no composition rules.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const loginSchema = z.object({
  email,
  // Only bound the length here; policy is enforced at registration.
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v ? v : undefined)),
    email,
    password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
