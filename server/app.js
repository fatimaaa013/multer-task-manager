const express = require("express");
const multer = require("multer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const SECRET = "mysecretkey";

// multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// auth middleware
function verifyToken(req, res, next) {
    const token = req.headers.authorization;

    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid token" });
    }
}

// upload route
app.post("/upload", verifyToken, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const newTask = {
        id: Date.now(),
        name: req.body.name,
        image: req.file.filename
    };

    const data = JSON.parse(fs.readFileSync(__dirname + "/data.json"));
    data.push(newTask);
    fs.writeFileSync(__dirname + "/data.json", JSON.stringify(data, null, 2));

    res.json(newTask);
});

// get tasks
app.get("/tasks", (req, res) => {
    const data = JSON.parse(fs.readFileSync(__dirname + "/data.json"));
    res.json(data);
});

// delete task
app.delete("/delete/:id", (req, res) => {
    const id = parseInt(req.params.id);

    let data = JSON.parse(fs.readFileSync(__dirname + "/data.json"));

    data = data.filter(task => task.id !== id);

    fs.writeFileSync(__dirname + "/data.json", JSON.stringify(data, null, 2));

    res.json({ message: "Deleted successfully" });
});

// signup
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    const users = JSON.parse(fs.readFileSync(__dirname + "/users.json"));

    const userExists = users.find(user => user.email === email);

    if (userExists) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        name,
        email,
        password: hashedPassword
    };

    users.push(newUser);

    fs.writeFileSync(__dirname + "/users.json", JSON.stringify(users, null, 2));

    res.json({ message: "Signup successful" });
});

// login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const users = JSON.parse(fs.readFileSync(__dirname + "/users.json"));

    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { email: user.email, name: user.name },
        SECRET
    );

    res.json({
        message: "Login successful",
        token
    });
});

app.listen(3000, () => console.log("Server running"));