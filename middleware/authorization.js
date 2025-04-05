const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        console.log('Authorization header:', authHeader);

        if (!authHeader) {
            console.log('No authorization header found');
            return res.status(401).json({ message: "Відсутній токен авторизації" });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Extracted token:', token);
        
        if (!token) {
            console.log('No token found after removing Bearer prefix');
            return res.status(401).json({ message: "Відсутній токен авторизації" });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            return res.status(500).json({ message: "Помилка конфігурації сервера" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded payload:', payload);
        
        req.user = payload.user;
        
        next();
    } catch (err) {
        console.error('Authorization error:', err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Недійсний токен" });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Токен протерміновано" });
        }
        return res.status(401).json({ message: "Помилка авторизації" });
    }
};