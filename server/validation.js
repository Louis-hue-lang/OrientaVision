import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
        .max(20, 'Le nom d\'utilisateur doit contenir au plus 20 caractères')
        .regex(/^[a-zA-Z0-9_]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
    email: z.string().email('Adresse email invalide'),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    inviteCode: z.string().optional()
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Adresse email invalide')
});

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
        .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
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
