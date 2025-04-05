const express = require("express");
const router = express.Router();
const authorization = require("../middleware/authorization");
const pool = require("../db");

router.get("/", authorization, async (req, res) => {
    try {
        const user = await pool.query("SELECT user_name, role FROM users WHERE user_id = $1", [req.user.id]);

        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;