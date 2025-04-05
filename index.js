const express = require("express");
const app = express();
const cors = require("cors");
const path = require('path');
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify environment variables
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables");
    process.exit(1);
}

app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

// Обслуговування статичних файлів
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        // Встановлюємо заголовки для всіх типів файлів
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Встановлюємо правильний Content-Type на основі розширення файлу
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        };
        
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    }
}));

// Додаємо middleware для обробки multipart/form-data
app.use(express.urlencoded({ extended: true }));

// Додаємо middleware для логування запитів
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Додаємо middleware для обробки помилок
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
        message: 'Помилка сервера',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ROUTES //

// auth routes (login and register)
app.use("/auth", require("./routes/jwtAuth"));

// dashboard route
app.use("/dashboard", require("./routes/dashboard"));

// dashboard for user route
app.use("/user", require("./routes/user"));

// course works route
app.use("/course-works", require("./routes/courseWorks"));

// courses route
app.use("/courses", require("./routes/courses"));

const PORT = process.env.PORT || 5000; // Додано значення за замовчуванням

app.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`); // Виправлено: використовуємо PORT
    console.log('Environment variables loaded:', {
        port: process.env.PORT,
        jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
    });
});