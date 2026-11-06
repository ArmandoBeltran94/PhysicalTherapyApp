import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email({ message: 'Formato de email inválido' })
    .max(255, { message: 'El email no puede exceder 255 caracteres' }),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refresh token es obligatorio' })
    .min(32, { message: 'Longitud de token inválida' })
});

export const LogoutRequestSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refresh token es obligatorio' })
    .min(32, { message: 'Longitud de token inválida' })
});

export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequestInput = z.infer<typeof RefreshTokenRequestSchema>;
export type LogoutRequestInput = z.infer<typeof LogoutRequestSchema>;

