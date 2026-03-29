"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/config.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({ message: 'config route' });
});
exports.default = router;
