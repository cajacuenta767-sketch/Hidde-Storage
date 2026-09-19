import { z } from 'zod';

export type AuthActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Partial<
    Record<
      | 'fullName'
      | 'email'
      | 'phone'
      | 'marketCode'
      | 'password'
      | 'passwordConfirmation'
      | 'currentPassword'
      | 'newPassword'
      | 'newPasswordConfirmation'
      | 'terms'
      | 'identifier'
      | 'token',
      string[]
    >
  >;
};

export const initialAuthState: AuthActionState = { status: 'idle' };

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña es demasiado larga.');

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Escribe tu nombre completo.').max(100),
    email: z.email('Escribe un correo válido.').trim().max(254),
    phone: z.string().trim().min(8, 'Escribe un número de WhatsApp válido.').max(24),
    marketCode: z.enum(['PE', 'BO'], { message: 'Selecciona tu país.' }),
    password: passwordSchema,
    passwordConfirmation: z.string(),
    terms: z.literal('on', { message: 'Debes aceptar los términos y la privacidad.' }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Escribe tu correo o WhatsApp.').max(254),
  password: z.string().min(1, 'Escribe tu contraseña.').max(128),
  next: z.string().optional(),
});

export const recoverySchema = z.object({
  identifier: z.string().trim().min(3, 'Escribe tu correo o WhatsApp.').max(254),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'El enlace de recuperación no es válido.'),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe tu nombre completo.').max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    path: ['newPasswordConfirmation'],
    message: 'Las contraseñas nuevas no coinciden.',
  });

export function zodFieldErrors(error: z.ZodError) {
  const fields: NonNullable<AuthActionState['fieldErrors']> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof typeof fields | undefined;
    if (!key) continue;
    fields[key] = [...(fields[key] ?? []), issue.message];
  }
  return fields;
}

export function safeNextPath(value: string | undefined, fallback = '/mi-cuenta') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
