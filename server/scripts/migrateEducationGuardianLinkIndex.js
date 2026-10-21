import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");

await mongoose.connect(uri);
try {
  const collection = mongoose.connection.collection("educationguardianlinks");
  const indexes = await collection.indexes();
  if (indexes.some(index => index.name === "student_1_guardian_1" && index.unique)) {
    await collection.dropIndex("student_1_guardian_1");
  }
  await collection.createIndex(
    { student: 1, guardian: 1 },
    { name: "approved_guardian_pair_unique", unique: true, partialFilterExpression: { guardian: { $type: "objectId" }, status: "approved" } }
  );
  console.log("Guardian link indexes migrated.");
} finally {
  await mongoose.disconnect();
}
