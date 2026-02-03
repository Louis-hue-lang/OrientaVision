import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Le nom doit contenir au moins 3 caractères')
        .max(50, 'Le nom doit contenir au plus 50 caractères')
        // Allow letters (including accents), digits, spaces, hyphens, apostrophes (for d'...)
        .regex(/^[a-zA-Z0-9\s\-_'À-ÿ]+$/, 'Caractères autorisés : lettres, chiffres, espaces, tirets'),
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(1, 'Le mot de passe ne peut pas être vide'),
    inviteCode: z.string().optional()
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Adresse email invalide')
});

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(1, 'Le mot de passe ne peut pas être vide'),
});

export const loginSchema = z.object({
    username: z.string().min(1, 'Identifiant requis'),
    password: z.string().min(1, 'Mot de passe requis')
});

export const roleUpdateSchema = z.object({
    role: z.enum(['admin', 'moderator', 'staff', 'joueur'], {
        errorMap: () => ({ message: 'Invalid role' })
    })
});
