const express = require('express');
const cors = require("cors");
const app = express();
const PORT = 8000;

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cors());

// Sample in-memory data with additional fields
let users = [
    { 
        id: 1, 
        name: 'Alice', 
        age: 21, 
        address: '123 Main St, Springfield', 
        email: 'alice@example.com', 
        phone: '123-456-7890', 
        occupation: 'Engineer' 
    },
    { 
        id: 2, 
        name: 'Bob', 
        age: 25, 
        address: '456 Elm St, Springfield', 
        email: 'bob@example.com', 
        phone: '987-654-3210', 
        occupation: 'Designer' 
    },
];

// 1. GET /users - Retrieve all users
app.get('/users', (req, res) => {
    console.log("Fetching all users...");
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
    const { name, age, address, email, phone, occupation } = req.body;
    const newUser = { 
        id: users.length + 1, 
        name, 
        age, 
        address, 
        email, 
        phone, 
        occupation 
    };
    users.push(newUser);
    res.status(201).json({ success: true, data: newUser });
});

// 4. PUT /users/:id - Update a user by ID
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const { name, age, address, email, phone, occupation } = req.body;
    const user = users.find(u => u.id === userId);
    if (user) {
        if (name) user.name = name;
        if (age) user.age = age;
        if (address) user.address = address;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (occupation) user.occupation = occupation;
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// 5. DELETE /users/:id - Delete a user by ID
app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        res.json({ success: true, message: 'User deleted successfully' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
