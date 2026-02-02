import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters long')
        .max(20, 'Username must be at most 20 characters long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    inviteCode: z.string().optional() // Optional because first user doesn't need it, handled in logic but good to allow string
});

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

export const roleUpdateSchema = z.object({
    role: z.enum(['admin', 'moderator', 'staff', 'joueur'], {
        errorMap: () => ({ message: 'Invalid role' })
    })
});
