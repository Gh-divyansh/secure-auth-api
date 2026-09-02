import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendOtpEmail(
  email: string,
  otp: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.OTP_FROM_EMAIL,
    to: [email],
    subject: "Your Secure Auth verification code",
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
    html: `
      <div>
        <h2>Secure Auth</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't request this code, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error("Failed to send OTP email");
  }
}