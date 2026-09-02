import { FastifyInstance } from "fastify";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { generateOtp, hashOtp, verifyOtp } from "../lib/otp.js";
import { createAccessToken } from "../lib/tokens.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/refresh-token.js";
import { authenticate } from "../hooks/authenticate.js";
import { sendOtpEmail } from "../lib/email.js";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/signup",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              minLength: 8,
              maxLength: 128,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await app.db.orm.public.User.first({
        email: normalizedEmail,
      });

      if (existingUser) {
        return reply.code(409).send({
          error: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await hashPassword(password);
      const pendingSignup = await app.db.orm.public.PendingSignup.first({
        email: normalizedEmail,
      });

      if (pendingSignup) {
        await app.db.orm.public.PendingSignup.where({
          id: pendingSignup.id,
        }).update({
          passwordHash,
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        });
      } else {
        await app.db.orm.public.PendingSignup.create({
          email: normalizedEmail,
          passwordHash,
        });
      }

      return reply.code(201).send({
        message: "Account registration started successfully",
        user: {
          email: normalizedEmail,
        },
      });
    },
  );
  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              minLength: 1,
              maxLength: 128,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      const normalizedEmail = email.trim().toLowerCase();

      const user = await app.db.orm.public.User.first({
        email: normalizedEmail,
      });

      if (!user || !user.passwordHash) {
        return reply.code(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        });
      }

      const passwordValid = await verifyPassword(user.passwordHash, password);

      if (!passwordValid) {
        return reply.code(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        });
      }

      const accessToken = await createAccessToken(user.id);

      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);

      const refreshTokenExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      await app.db.transaction(async (tx) => {
        const session = await tx.orm.public.Session.create({
          userId: user.id,
          expiresAt: refreshTokenExpiresAt,
        });

        await tx.orm.public.RefreshToken.create({
          sessionId: session.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        });
      });

      return reply.code(200).send({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    },
  );
  app.post(
    "/auth/otp/request",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["email"],
          additionalProperties: false,
          properties: {
            email: {
              type: "string",
              format: "email",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body as {
        email: string;
      };

      const normalizedEmail = email.trim().toLowerCase();

      const user = await app.db.orm.public.User.first({
        email: normalizedEmail,
      });

      if (!user) {
        const pendingSignup = await app.db.orm.public.PendingSignup.first({
          email: normalizedEmail,
        });

        if (!pendingSignup) {
          return reply.code(401).send({
            error: "INVALID_REQUEST",
            message: "Unable to process OTP request",
          });
        }

        const otp = generateOtp();
        const otpHash = await hashOtp(otp);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await app.db.orm.public.PendingSignup.where({
          id: pendingSignup.id,
        }).update({
          otpHash,
          otpExpiresAt: expiresAt,
          otpAttempts: 0,
        });

        await sendOtpEmail(normalizedEmail, otp);

        return reply.code(200).send({
          message: "OTP sent successfully",
        });
      }

      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await app.db.transaction(async (tx) => {
        await tx.orm.public.OtpVerification.where((otpRecord) =>
          otpRecord.userId.eq(user.id),
        )
          .where((otpRecord) => otpRecord.consumedAt.isNull())
          .update({
            consumedAt: new Date().toISOString(),
          });

        await tx.orm.public.OtpVerification.create({
          userId: user.id,
          otpHash,
          expiresAt,
        });
      });

      await sendOtpEmail(normalizedEmail, otp);

      return reply.code(200).send({
        message: "OTP sent successfully",
        });
    },
  );
  app.post(
    "/auth/otp/verify",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: {
          type: "object",
          required: ["email", "otp"],
          additionalProperties: false,
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            otp: {
              type: "string",
              pattern: "^[0-9]{6}$",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, otp } = request.body as {
        email: string;
        otp: string;
      };

      const normalizedEmail = email.trim().toLowerCase();

      const user = await app.db.orm.public.User.first({
        email: normalizedEmail,
      });

      if (!user) {
        const pendingSignup = await app.db.orm.public.PendingSignup.first({
          email: normalizedEmail,
        });

        if (!pendingSignup || !pendingSignup.otpHash || !pendingSignup.otpExpiresAt) {
          return reply.code(401).send({
            error: "INVALID_OTP",
            message: "Invalid or expired OTP",
          });
        }

        if (new Date(pendingSignup.otpExpiresAt).getTime() <= Date.now()) {
          return reply.code(401).send({
            error: "INVALID_OTP",
            message: "Invalid or expired OTP",
          });
        }

        if (pendingSignup.otpAttempts >= 5) {
          return reply.code(429).send({
            error: "OTP_ATTEMPTS_EXCEEDED",
            message: "Too many OTP attempts",
          });
        }

        const valid = await verifyOtp(pendingSignup.otpHash, otp);

        if (!valid) {
          await app.db.orm.public.PendingSignup.where({
            id: pendingSignup.id,
          }).update({
            otpAttempts: pendingSignup.otpAttempts + 1,
          });

          return reply.code(401).send({
            error: "INVALID_OTP",
            message: "Invalid or expired OTP",
          });
        }

        const createdUser = await app.db.transaction(async (tx) => {
          const claimedSignup = await tx.orm.public.PendingSignup.where({
            id: pendingSignup.id,
          })
            .where((signup) => signup.otpHash.eq(pendingSignup.otpHash!))
            .update({
              otpHash: null,
              otpExpiresAt: null,
            });

          if (!claimedSignup) {
            return null;
          }

          const user = await tx.orm.public.User.create({
            email: pendingSignup.email,
            passwordHash: pendingSignup.passwordHash,
            emailVerifiedAt: new Date().toISOString(),
          });

          await tx.orm.public.PendingSignup.where({
            id: pendingSignup.id,
          }).delete();

          return user;
        });

        if (!createdUser) {
          return reply.code(401).send({
            error: "INVALID_OTP",
            message: "Invalid or expired OTP",
          });
        }

        return reply.code(200).send({
          message: "OTP verified successfully",
          user: {
            id: createdUser.id,
            email: createdUser.email,
          },
        });
      }

      const otpRecord = await app.db.orm.public.OtpVerification.where((otp) =>
        otp.userId.eq(user.id),
      )
        .where((otp) => otp.consumedAt.isNull())
        .orderBy((otp) => otp.createdAt.desc())
        .first();

      if (!otpRecord) {
        return reply.code(401).send({
          error: "INVALID_OTP",
          message: "Invalid or expired OTP",
        });
      }

      if (new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
        return reply.code(401).send({
          error: "INVALID_OTP",
          message: "Invalid or expired OTP",
        });
      }

      if (otpRecord.attempts >= 5) {
        return reply.code(429).send({
          error: "OTP_ATTEMPTS_EXCEEDED",
          message: "Too many OTP attempts",
        });
      }

      const valid = await verifyOtp(otpRecord.otpHash, otp);

      if (!valid) {
        await app.db.orm.public.OtpVerification.where({
          id: otpRecord.id,
        }).update({
          attempts: otpRecord.attempts + 1,
        });

        return reply.code(401).send({
          error: "INVALID_OTP",
          message: "Invalid or expired OTP",
        });
      }

      const consumedOtp = await app.db.transaction(async (tx) => {
        return tx.orm.public.OtpVerification.where({
          id: otpRecord.id,
        })
          .where((otpRecord) => otpRecord.consumedAt.isNull())
          .update({
          consumedAt: new Date().toISOString(),
          });
      });

      if (!consumedOtp) {
        return reply.code(401).send({
          error: "INVALID_OTP",
          message: "Invalid or expired OTP",
        });
      }

      return reply.code(200).send({
        message: "OTP verified successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      });
    },
  );
  app.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: {
              type: "string",
              minLength: 1,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as {
        refreshToken: string;
      };

      const refreshTokenHash = hashRefreshToken(refreshToken);

      const tokenRecord = await app.db.orm.public.RefreshToken.first({
        tokenHash: refreshTokenHash,
      });

      if (!tokenRecord) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      // A token that has already been rotated is being reused.
      if (tokenRecord.rotatedAt) {
        await app.db.orm.public.Session.where({
          id: tokenRecord.sessionId,
        }).update({
          revokedAt: new Date().toISOString(),
        });

        return reply.code(401).send({
          error: "REFRESH_TOKEN_REUSE",
          message: "Refresh token reuse detected",
        });
      }

      if (tokenRecord.revokedAt) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      const session = await app.db.orm.public.Session.first({
        id: tokenRecord.sessionId,
      });

      if (!session || session.revokedAt) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      const newRefreshToken = generateRefreshToken();
      const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

      const accessToken = await createAccessToken(session.userId);

      const rotationSucceeded = await app.db.transaction(async (tx) => {
        const rotatedToken = await tx.orm.public.RefreshToken.where({
          id: tokenRecord.id,
        })
          .where((token) => token.rotatedAt.isNull())
          .where((token) => token.revokedAt.isNull())
          .update({
            rotatedAt: new Date().toISOString(),
          });

        if (!rotatedToken) {
          await tx.orm.public.Session.where({
            id: session.id,
          })
            .where((session) => session.revokedAt.isNull())
            .update({
              revokedAt: new Date().toISOString(),
            });

          return false;
        }

        await tx.orm.public.RefreshToken.create({
          sessionId: session.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: tokenRecord.expiresAt,
        });

        return true;
      });

      if (!rotationSucceeded) {
        return reply.code(401).send({
            error: "REFRESH_TOKEN_REUSE",
            message: "Refresh token reuse detected",
        });
        }

      return reply.code(200).send({
        accessToken,
        refreshToken: newRefreshToken,
      });
    },
  );
  app.post(
    "/auth/logout",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          additionalProperties: false,
          properties: {
            refreshToken: {
              type: "string",
              minLength: 1,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as {
        refreshToken: string;
      };

      const refreshTokenHash = hashRefreshToken(refreshToken);

      const tokenRecord = await app.db.orm.public.RefreshToken.first({
        tokenHash: refreshTokenHash,
      });

      if (!tokenRecord) {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token",
        });
      }

      await app.db.transaction(async (tx) => {
        await tx.orm.public.Session.where({
          id: tokenRecord.sessionId,
        })
          .where((session) => session.revokedAt.isNull())
          .update({
            revokedAt: new Date().toISOString(),
          });

        await tx.orm.public.RefreshToken.where({
          id: tokenRecord.id,
        })
          .where((token) => token.revokedAt.isNull())
          .update({
            revokedAt: new Date().toISOString(),
          });
      });

      return reply.code(200).send({
        message: "Logout successful",
      });
    },
  );
  app.delete(
    "/auth/account",
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: "object",
          maxProperties: 0,
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      if (request.body !== undefined) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          message: "Invalid request",
        });
      }

      const userId = request.user.id;

      await app.db.transaction(async (tx) => {
        const sessions = await tx.orm.public.Session.where({ userId }).all();
        const otpRecords = await tx.orm.public.OtpVerification.where({
          userId,
        }).all();

        for (const session of sessions) {
          const refreshTokens = await tx.orm.public.RefreshToken.where({
            sessionId: session.id,
          }).all();

          for (const refreshToken of refreshTokens) {
            await tx.orm.public.RefreshToken.where({
              id: refreshToken.id,
            }).delete();
          }

          await tx.orm.public.Session.where({ id: session.id }).delete();
        }

        for (const otpRecord of otpRecords) {
          await tx.orm.public.OtpVerification.where({
            id: otpRecord.id,
          }).delete();
        }

        await tx.orm.public.User.where({ id: userId }).delete();
      });

      return reply.code(200).send({
        message: "Account deleted successfully",
      });
    },
  );
  app.get(
    "/auth/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = await app.db.orm.public.User.first({
        id: request.user.id,
      });

      if (!user) {
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      return reply.code(200).send({
        user: {
          id: user.id,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      });
    },
  );
}
