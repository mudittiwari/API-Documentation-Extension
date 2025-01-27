const express = require('express');
const cors = require("cors");
const authRouter = require("./routes/authRoute");
const websiteRouter = require("./routes/websiteRoute");
const connectDB = require('./config/db');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());


connectDB();

app.get("/", (req, res) => {
    res.send("Welcome to the web application");
}
);
app.use("/api/auth", authRouter);
app.use("/api/website", websiteRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
