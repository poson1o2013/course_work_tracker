const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../utiles/jwtGenerator");

router.post("/", async (req, res) => {
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

        res.json({ token, role: user.rows[0].role });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

module.exports = router;
