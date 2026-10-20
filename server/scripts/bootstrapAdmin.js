import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const name = String(process.env.ADMIN_NAME || "Shivasha Admin").trim();
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri || !email || !password) {
  console.error("Required environment variables: MONGODB_URI (or MONGO_URI), ADMIN_EMAIL, ADMIN_PASSWORD.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters. Use a unique, strong password.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.passwordHash = passwordHash;
    if (!existing.name && name) existing.name = name;
    await existing.save();
    console.log("Existing account promoted to admin and password reset.");
  } else {
    await User.create({ name: name || "Shivasha Admin", email, passwordHash, role: "admin" });
    console.log("Admin account created.");
  }
  console.log("Admin bootstrap complete. Remove ADMIN_PASSWORD from your shell/environment after use.");
} catch (error) {
  console.error("Admin bootstrap failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
