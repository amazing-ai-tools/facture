import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().default('postgres://facture:facture@localhost:5432/facture'),
  GOOGLE_CLIENT_ID: z.string().min(1).default('local-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default('local-google-client-secret'),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .default('https://facture.api.amazing-ai.tools/auth/google/callback'),
  ALLOWED_GOOGLE_EMAILS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  SESSION_SECRET: z.string().min(32).default('local-development-session-secret-32-chars'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().email().default('factures@amazing-ai.tools'),
}).superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') return;

  const requiredInProduction = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
    'SMTP_HOST',
    'SMTP_FROM',
  ] as const;

  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }
});

export const config = EnvSchema.parse(process.env);
