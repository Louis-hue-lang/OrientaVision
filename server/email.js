import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure transporter for OVH Pro
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'pro2.mail.ovh.net',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // false for 587 (STARTTLS), true for 465
    auth: {
        user: process.env.SMTP_EMAIL || process.env.SMTP_USER, // Prioritize SMTP_EMAIL
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS, // Prioritize SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: false, // Disable debug output
    logger: false  // Disable console logger
});

// Use authenticated user as sender
const FROM_EMAIL = {
    name: 'OrientaVision',
    address: process.env.SMTP_EMAIL || process.env.SMTP_USER || 'no-reply@orientavision.fr'
};

const generateHeaders = () => {
    const domain = (process.env.SMTP_EMAIL || process.env.SMTP_USER || 'orientavision.fr').split('@')[1] || 'orientavision.fr';
    const messageId = `<${crypto.randomBytes(16).toString('hex')}@${domain}>`;
    const refId = crypto.randomUUID();

    return {
        'Message-ID': messageId,
        'Date': new Date().toUTCString(),
        'Reply-To': FROM_EMAIL.address,
        'List-Unsubscribe': `<mailto:${FROM_EMAIL.address}?subject=unsubscribe>`,
        'X-Entity-Ref-ID': refId
    };
};

/**
 * Generates a responsive HTML email template
 * @param {string} title - The main heading
 * @param {string} message - The main body content (HTML allowed)
 * @param {string} buttonText - Text for the CTA button
 * @param {string} buttonLink - URL for the CTA button
 * @returns {string} - The complete HTML string
 */
const getHtmlTemplate = (title, message, buttonText, buttonLink) => {
    const appUrl = process.env.App_URL || 'https://orienta.rugby-hr.fr';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #1a1a2e; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .button-container { text-align: center; margin-top: 30px; margin-bottom: 20px; }
        .button { background-color: #6c5ce7; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; transition: background-color 0.3s; }
        .button:hover { background-color: #5b4cc4; }
        .footer { background-color: #f4f4f9; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; }
        .footer a { color: #6c5ce7; text-decoration: none; }
    </style>
</head>
<body>
    <div style="padding: 20px;">
        <div class="container">
            <div class="header">
                <h1>OrientaVision</h1>
            </div>
            <div class="content">
                <h2 style="color: #1a1a2e; margin-top: 0;">${title}</h2>
                <div style="font-size: 16px;">
                    ${message}
                </div>
                <div class="button-container">
                    <a href="${buttonLink}" class="button">${buttonText}</a>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                    <a href="${buttonLink}" style="color: #6c5ce7; word-break: break-all;">${buttonLink}</a>
                </p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} OrientaVision. Tous droits réservés.</p>
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};

export const sendInviteEmail = async (email, code) => {
    try {
        const headers = generateHeaders();
        const appUrl = process.env.App_URL || 'https://orienta.rugby-hr.fr';
        const buttonLink = `${appUrl}`;

        const textContent = `Bienvenue sur OrientaVision.\n\nVous avez été invité à rejoindre la plateforme.\nVotre code d'invitation est : ${code}\n\nRendez-vous sur ${buttonLink} pour créer votre compte.`;

        const htmlContent = getHtmlTemplate(
            'Bienvenue sur OrientaVision',
            `<p>Vous avez été invité à rejoindre la plateforme d'orientation.</p>
             <p>Pour créer votre compte, vous aurez besoin de ce code d'invitation unique :</p>
             <div style="background-color: #f0f0f5; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1a1a2e;">${code}</span>
             </div>
             <p>Cliquez sur le bouton ci-dessous pour accéder à la page d'inscription.</p>`,
            'Créer mon compte',
            buttonLink
        );

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Invitation à rejoindre OrientaVision',
            text: textContent,
            html: htmlContent,
            headers: headers
        });
        console.log(`Invite email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending invite email:', error);
        return false;
    }
};

export const sendResetPasswordEmail = async (email, token) => {
    try {
        const headers = generateHeaders();
        const appUrl = process.env.App_URL || 'https://orienta.rugby-hr.fr';
        const resetLink = `${appUrl}/reset-password?token=${token}`;

        const textContent = `Demande de réinitialisation.\n\nVous avez demandé à réinitialiser votre mot de passe.\nCliquez sur le lien suivant pour procéder : ${resetLink}\n\nCe lien est valide pour 1 heure.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;

        const htmlContent = getHtmlTemplate(
            'Réinitialisation de mot de passe',
            `<p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
             <p>Si vous êtes à l'origine de cette demande, vous pouvez définir un nouveau mot de passe en cliquant sur le bouton ci-dessous.</p>
             <p style="color: #e74c3c; font-size: 14px;">Attention : ce lien est valide pour 1 heure seulement.</p>`,
            'Réinitialiser mon mot de passe',
            resetLink
        );

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            text: textContent,
            html: htmlContent,
            headers: headers
        });
        console.log(`Reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        return false;
    }
};
