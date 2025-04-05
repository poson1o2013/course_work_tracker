const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
    try {
        res.json({
            message: "Welcome to the dashboard!",
            userId: req.user.id,
            role: req.user.role, // Додаємо роль до відповіді
        });
    } catch (err) {
        console.error("Dashboard error:", err.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;