import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'ssl0.ovh.net',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    debug: true, // Show debug output
    logger: true  // Log to console
});

const FROM_EMAIL = process.env.EMAIL_FROM || '"OrientaVision" <no-reply@orientavision.fr>';

export const sendInviteEmail = async (email, code) => {
    try {
        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Invitation à rejoindre OrientaVision',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Bienvenue sur OrientaVision</h2>
                    <p>Vous avez été invité à rejoindre la plateforme.</p>
                    <p>Votre code d'invitation est : <strong>${code}</strong></p>
                    <p>Rendez-vous sur <a href="${process.env.App_URL || 'https://orientavision.up.railway.app'}">OrientaVision</a> pour créer votre compte.</p>
                </div>
            `,
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
        // Construct reset link (adjust URL as needed)
        // Frontend route should differ or be handled by query param
        // Let's assume /reset-password?token=XYZ
        const resetLink = `${process.env.App_URL || 'https://orientavision.up.railway.app'}/reset-password?token=${token}`;

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
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
        });
        console.log(`Reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        return false;
    }
};
