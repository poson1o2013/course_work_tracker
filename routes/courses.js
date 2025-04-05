const express = require("express");
const router = express.Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

// Отримання списку всіх курсів
router.get("/", authorization, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM courses ORDER BY course_name"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

module.exports = router; 