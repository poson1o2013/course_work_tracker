const jwt = require("jsonwebtoken");
require("dotenv").config();

function jwtGenerator(user_id, user_name, role) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    const payload = {
        user: {
            id: user_id,
            name: user_name,
            role: role
        }
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
}

module.exports = jwtGenerator;