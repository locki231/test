"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/discord.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
// GET base route
router.get('/', (req, res) => {
    res.json({ message: 'discord route' });
});
// POST /sync: synchronize Discord members and roles (dummy implementation)
router.post('/sync', async (req, res) => {
    // TODO: Replace with real Discord fetch using bot instance
    // For now, return dummy data
    const members = [
        { id: '1', username: 'john_doe', nomRp: 'John Doe', grade: 'recrue', status: 'actif', rapports: 2, sanctions: 0 },
        { id: '2', username: 'jane_smith', nomRp: 'Jane Smith', grade: 'sergent', status: 'actif', rapports: 5, sanctions: 1 }
    ];
    const roles = [
        { id: '1001', name: 'Recrue', color: '#c9a84c', memberCount: 1 },
        { id: '1002', name: 'Sergent', color: '#7a9fd4', memberCount: 1 }
    ];
    res.json({ success: true, members, roles });
});
exports.default = router;
