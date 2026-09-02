import { randomInt } from "node:crypto";
import * as argon2 from "argon2";

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return argon2.hash(otp, {
    type: argon2.argon2id,
  });
}

export async function verifyOtp(
  otpHash: string,
  otp: string,
): Promise<boolean> {
  return argon2.verify(otpHash, otp);
}