"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/auth.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({ message: 'auth route' });
});
exports.default = router;
