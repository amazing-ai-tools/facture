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
}).superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') return;

  const requiredInProduction = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SESSION_SECRET',
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
