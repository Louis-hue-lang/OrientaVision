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
        ciphers: 'SSLv3'
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

export const sendInviteEmail = async (email, code) => {
    try {
        const headers = generateHeaders();
        const textContent = `Bienvenue sur OrientaVision.\n\nVous avez été invité à rejoindre la plateforme.\nVotre code d'invitation est : ${code}\n\nRendez-vous sur ${process.env.App_URL || 'https://orientavision.up.railway.app'} pour créer votre compte.`;

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Invitation à rejoindre OrientaVision',
            text: textContent,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Bienvenue sur OrientaVision</h2>
                    <p>Vous avez été invité à rejoindre la plateforme.</p>
                    <p>Votre code d'invitation est : <strong>${code}</strong></p>
                    <p>Rendez-vous sur <a href="${process.env.App_URL || 'https://orientavision.up.railway.app'}">OrientaVision</a> pour créer votre compte.</p>
                </div>
            `,
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
        // Construct reset link (adjust URL as needed)
        const resetLink = `${process.env.App_URL || 'https://orientavision.up.railway.app'}/reset-password?token=${token}`;

        const textContent = `Demande de réinitialisation.\n\nVous avez demandé à réinitialiser votre mot de passe.\nCliquez sur le lien suivant pour procéder : ${resetLink}\n\nCe lien est valide pour 1 heure.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            text: textContent,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Demande de réinitialisation</h2>
                    <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                    <p>Cliquez sur le lien ci-dessous pour procéder :</p>
                    <p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p>
                    <p>Ce lien est valide pour 1 heure.</p>
                    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                </div>
            `,
            headers: headers
        });
        console.log(`Reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        return false;
    }
};
