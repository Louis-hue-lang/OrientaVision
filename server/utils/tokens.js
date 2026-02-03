import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev';
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'superrefreshsecretkey_dev';

export const generateTokens = (user) => {
    const accessToken = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ username: user.username }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
