import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ProductMembership from "../models/ProductMembership.js";
import { requireAuth } from "../middleware/auth.js";
import { buildSharedSession } from "../platform/sharedSession.js";

const router = Router();

// One authenticated identity endpoint shared by all four application frontends.
// This reports membership state; product APIs must still enforce access server-side.
router.get("/session", requireAuth, async (req, res) => {
  try {
    const [user, memberships] = await Promise.all([
      User.findById(req.user.id).select("_id name email role avatarUrl moderationBlocked").lean(),
      ProductMembership.find({ userId: req.user.id })
        .select("productId role permissions status expiresAt")
        .lean()
    ]);

    if (!user) return res.status(401).json({ message: "Account not found" });
    if (user.moderationBlocked) return res.status(403).json({ message: "This account is temporarily restricted" });

    return res.json({
      identity: { id: String(user._id), name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" },
      applications: buildSharedSession(memberships),
      sharedCore: { identity: true, api: true, database: true }
    });
  } catch {
    return res.status(503).json({ message: "Shared session could not be loaded" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "employee" });

    res.status(201).json({
      message: "User registered",
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

export default router;
