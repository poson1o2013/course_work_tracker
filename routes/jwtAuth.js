const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");
const jwtGenerator = require("../utiles/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const authorization = require("../middleware/authorization");

router.post("/register", validInfo, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Відсутні обов'язкові поля" });
        }

        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);

        if (user.rows.length > 0) {
            return res.status(409).json({ message: "Користувач вже існує" });
        }

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (user_name, user_email, user_password, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, email, bcryptPassword, role]
        );

        const token = jwtGenerator(newUser.rows[0].user_id, newUser.rows[0].user_name, newUser.rows[0].role);

        if (!token) {
            return res.status(500).json({ message: "Помилка при генерації токена" });
        }

        return res.json({ token });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

router.post("/login", validInfo, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Невірний email або пароль" });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].user_password);

        if (!validPassword) {
            return res.status(401).json({ message: "Невірний email або пароль" });
        }

        const token = jwtGenerator(
            user.rows[0].user_id,
            user.rows[0].user_name,
            user.rows[0].role
        );

        if (!token) {
            return res.status(500).json({ message: "Помилка при генерації токена" });
        }

        return res.json({ token });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Помилка сервера" });
    }
});

router.get("/verify", authorization, async (req, res) => {
    try {
        res.json(true);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Помилка сервера" });
    }
});

module.exports = router;