const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const authorization = require('../middleware/authorization');

// Налаштування multer для збереження файлів
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // Перевіряємо наявність директорії
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        // Перевіряємо права доступу
        try {
            fs.accessSync(uploadDir, fs.constants.W_OK);
            console.log('Upload directory is writable');
        } catch (err) {
            console.error('Upload directory is not writable:', err);
            return cb(new Error('Upload directory is not writable'));
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        try {
            // Зберігаємо оригінальне ім'я файлу в UTF-8
            const originalName = Buffer.from(file.originalname, 'binary').toString('utf8');
            // Генеруємо унікальне ім'я файлу
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(originalName);
            const safeName = uniqueSuffix + ext;
            console.log('Generated filename:', safeName);
            cb(null, safeName);
        } catch (err) {
            console.error('Error generating filename:', err);
            cb(err);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    fileFilter: function (req, file, cb) {
        console.log('Received file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        // Дозволяємо всі типи файлів
        cb(null, true);
    }
});

// Обробка помилок multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Файл занадто великий. Максимальний розмір - 10MB' });
        }
        return res.status(400).json({ message: 'Помилка при завантаженні файлу' });
    }
    next(err);
};

// Отримання списку робіт
router.get('/', authorization, async (req, res) => {
    try {
        const user = req.user;
        console.log('User role:', user.role);
        console.log('User ID:', user.id);

        let query;
        if (user.role === 'student') {
            query = `
                SELECT cw.*, c.course_name, u.user_name as student_name
                FROM course_works cw
                LEFT JOIN courses c ON cw.course_id = c.course_id
                LEFT JOIN users u ON cw.student_id = u.user_id
                WHERE cw.student_id = $1
                ORDER BY cw.created_at DESC
            `;
            const result = await pool.query(query, [user.id]);
            console.log('Found works:', result.rows.length);
            return res.json(result.rows);
        } else {
            query = `
                SELECT cw.*, c.course_name, u.user_name as student_name
                FROM course_works cw
                LEFT JOIN courses c ON cw.course_id = c.course_id
                LEFT JOIN users u ON cw.student_id = u.user_id
                ORDER BY cw.created_at DESC
            `;
            const result = await pool.query(query);
            console.log('Found works:', result.rows.length);
            return res.json(result.rows);
        }
    } catch (err) {
        console.error('Error fetching works:', err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// Створення нової роботи
router.post('/', authorization, async (req, res) => {
    try {
        const { title, description, deadline } = req.body;
        const studentId = req.user.id;

        if (!title) {
            return res.status(400).json({ message: 'Назва роботи обов\'язкова' });
        }

        const result = await pool.query(
            'INSERT INTO course_works (student_id, title, description, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
            [studentId, title, description, deadline]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// Отримання деталей роботи
router.get('/:id', authorization, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Fetching work with ID:', id);
        console.log('User ID:', req.user.id);

        const workQuery = `
            SELECT cw.*, c.course_name, u.user_name as student_name
            FROM course_works cw
            LEFT JOIN courses c ON cw.course_id = c.course_id
            LEFT JOIN users u ON cw.student_id = u.user_id
            WHERE cw.work_id = $1
        `;
        const workResult = await pool.query(workQuery, [id]);

        if (workResult.rows.length === 0) {
            console.log('Work not found');
            return res.status(404).json({ message: "Робота не знайдена" });
        }

        const work = workResult.rows[0];

        // Отримання файлів
        const filesQuery = `
            SELECT * FROM work_files
            WHERE work_id = $1
            ORDER BY uploaded_at DESC
        `;
        const filesResult = await pool.query(filesQuery, [id]);
        work.files = filesResult.rows;

        // Отримання коментарів
        const commentsQuery = `
            SELECT c.*, u.user_name
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.work_id = $1
            ORDER BY c.created_at DESC
        `;
        const commentsResult = await pool.query(commentsQuery, [id]);
        work.comments = commentsResult.rows;

        // Отримання оцінки
        const gradeQuery = `
            SELECT g.*, u.user_name as teacher_name
            FROM grades g
            LEFT JOIN users u ON g.teacher_id = u.user_id
            WHERE g.work_id = $1
            ORDER BY g.created_at DESC
            LIMIT 1
        `;
        const gradeResult = await pool.query(gradeQuery, [id]);
        work.grade = gradeResult.rows[0] || null;

        console.log('Sending work data:', work);
        res.json(work);
    } catch (err) {
        console.error('Error fetching work details:', err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// Маршрут для завантаження файлу
router.post("/upload", authorization, upload.single("file"), async (req, res) => {
    try {
        console.log('File upload request received:', {
            file: req.file,
            body: req.body
        });

        if (!req.file) {
            return res.status(400).json({ message: "Файл не був завантажений" });
        }

        const { workId } = req.body;
        if (!workId) {
            return res.status(400).json({ message: "ID роботи не вказано" });
        }

        // Зберігаємо інформацію про файл в базі даних
        const result = await pool.query(
            "INSERT INTO work_files (work_id, file_name, file_path, file_type) VALUES ($1, $2, $3, $4) RETURNING *",
            [
                workId,
                Buffer.from(req.file.originalname, 'binary').toString('utf8'),
                req.file.filename,
                req.file.mimetype.substring(0, 50) // Обмежуємо довжину типу файлу
            ]
        );

        console.log('File saved to database:', result.rows[0]);

        res.json({
            message: "Файл успішно завантажено",
            file: result.rows[0]
        });
    } catch (err) {
        console.error("Помилка при завантаженні файлу:", err);
        res.status(500).json({ 
            message: "Помилка сервера при завантаженні файлу",
            error: err.message 
        });
    }
});

// Маршрут для отримання файлу
router.get("/file/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, "../uploads", filename);
        
        console.log("Attempting to send file:", filePath);
        
        if (!fs.existsSync(filePath)) {
            console.error("File not found:", filePath);
            return res.status(404).json({ message: "Файл не знайдено" });
        }

        // Встановлюємо заголовки для коректного відображення файлу
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Content-Type', 'application/octet-stream');
        
        res.sendFile(filePath);
    } catch (err) {
        console.error("Помилка при отриманні файлу:", err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// Маршрут для отримання файлів роботи
router.get('/:id/files', authorization, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM work_files WHERE work_id = $1',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// Оновлення прогресу роботи
router.put('/:id/progress', authorization, async (req, res) => {
    try {
        const { id } = req.params;
        const { progress } = req.body;

        if (progress === undefined || progress < 0 || progress > 100) {
            return res.status(400).json({ message: "Некоректне значення прогресу" });
        }

        const result = await pool.query(
            `UPDATE course_works 
             SET progress = $1, updated_at = CURRENT_TIMESTAMP
             WHERE work_id = $2
             RETURNING *`,
            [progress, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Робота не знайдена" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating progress:', err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// Додавання оцінки
router.post("/:id/grade", authorization, async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, feedback } = req.body;
        const teacher_id = req.user.id;

        // Перевірка ролі
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: "Тільки викладач може виставляти оцінки" });
        }

        // Перевірка валідності оцінки
        if (grade === undefined || grade < 0 || grade > 100) {
            return res.status(400).json({ message: "Некоректне значення оцінки" });
        }

        // Перевірка існування роботи
        const workCheck = await pool.query(
            "SELECT status FROM course_works WHERE work_id = $1",
            [id]
        );

        if (workCheck.rows.length === 0) {
            return res.status(404).json({ message: "Робота не знайдена" });
        }

        // Додавання оцінки
        const result = await pool.query(
            `INSERT INTO grades (work_id, teacher_id, grade, feedback)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, teacher_id, grade, feedback]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding grade:', err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// Маршрут для отримання коментарів роботи
router.get("/:id/comments", authorization, async (req, res) => {
    try {
        const { id } = req.params;

        const comments = await pool.query(
            `SELECT c.*, u.user_name 
             FROM comments c 
             JOIN users u ON c.user_id = u.user_id 
             WHERE c.work_id = $1 
             ORDER BY c.created_at DESC`,
            [id]
        );

        res.json(comments.rows);
    } catch (err) {
        console.error("Error getting comments:", err);
        res.status(500).json({ message: "Помилка при отриманні коментарів" });
    }
});

// Маршрут для додавання коментаря
router.post("/:id/comments", authorization, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment_text } = req.body;
        const user_id = req.user.id;

        const newComment = await pool.query(
            `INSERT INTO comments (work_id, user_id, comment_text) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [id, user_id, comment_text]
        );

        // Отримуємо ім'я користувача для відповіді
        const user = await pool.query(
            "SELECT user_name FROM users WHERE user_id = $1",
            [user_id]
        );

        const commentWithUser = {
            ...newComment.rows[0],
            user_name: user.rows[0].user_name
        };

        res.json(commentWithUser);
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Помилка при додаванні коментаря" });
    }
});

// Маршрут для отримання оцінок роботи
router.get("/:id/grades", authorization, async (req, res) => {
    try {
        const { id } = req.params;

        const grades = await pool.query(
            `SELECT g.*, u.user_name as teacher_name
             FROM grades g
             JOIN users u ON g.teacher_id = u.user_id
             WHERE g.work_id = $1
             ORDER BY g.created_at DESC`,
            [id]
        );

        res.json(grades.rows);
    } catch (err) {
        console.error("Error getting grades:", err);
        res.status(500).json({ message: "Помилка при отриманні оцінок" });
    }
});

module.exports = router; 