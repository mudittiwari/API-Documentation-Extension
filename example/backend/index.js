const express = require('express');
const cors = require("cors");
const app = express();
const PORT = 8000;


// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cors());

// Sample in-memory data
let users = [
    { id: 1, name: 'Alice', age:21 },
    { id: 2, name: 'Bob', age:21 },
];

// 1. GET /users - Retrieve all users
app.get('/users', (req, res) => {
    console.log("hello world")
    res.json({ success: true, data: users });
});

// 2. GET /users/:id - Retrieve a user by ID
app.get('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// 3. POST /users - Add a new user
app.post('/users', (req, res) => {
    const { name, age } = req.body;
    const newUser = { id: users.length + 1, name, age };
    users.push(newUser);
    res.status(201).json({ success: true, data: newUser });
});

// 4. PUT /users/:id - Update a user by ID
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const { name } = req.body;
    const user = users.find(u => u.id === userId);
    if (user) {
        user.name = name;
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// 5. DELETE /users - Delete a user by ID
app.delete('/users', (req, res) => {
    const userId = parseInt(req.params.id);
    users = users.filter(u => u.id !== userId);
    res.json({ success: true, message: 'User deleted successfully' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
