import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  ACCESS_TOKEN_SECRET: required("ACCESS_TOKEN_SECRET"),

  PORT: Number(process.env.PORT ?? 3000),
  HOST: process.env.HOST ?? "0.0.0.0",

  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",

  NODE_ENV: process.env.NODE_ENV ?? "development",

  RESEND_API_KEY: required("RESEND_API_KEY"),
OTP_FROM_EMAIL: required("OTP_FROM_EMAIL"),
};