import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../interfaces/schemas.ts";
import { catchAsync } from "../middlewares/error_handler.ts";
import { authService } from "../services/auth_service.ts";

export const authController = {
  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, cpf } = req.body as { email?: string; cpf?: string };
      const result = await authService.forgotPassword(email, cpf);
      res.json(result);
    } catch {
      res.status(500).json({ error: "Erro ao processar recuperação" });
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    const { resetToken, newPassword } = req.body as {
      resetToken?: string;
      newPassword?: string;
    };
    const result = await authService.resetPassword(resetToken, newPassword);
    res.json(result);
  },

  login: catchAsync(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  }),

  register: catchAsync(async (req, res) => {
    const validatedData = registerSchema.parse(req.body);
    const { nickname, birthDate, referrerId, referralCode, firebaseUid } = req.body as {
      nickname?: string;
      birthDate?: string;
      referrerId?: string;
      referralCode?: string;
      firebaseUid?: string;
    };

    const result = await authService.register({
      ...validatedData,
      referrerId: referrerId ?? validatedData.referrer_id ?? undefined,
      nickname,
      birthDate,
      referralCode,
      firebaseUid,
    });

    res.json(result);
  }),
};
