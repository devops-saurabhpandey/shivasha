import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");

await mongoose.connect(uri);
try {
  const collection = mongoose.connection.collection("educationguardianlinks");
  const indexes = await collection.indexes();

  // Preflight both active statuses before dropping any legacy index.
  const duplicates = await collection.aggregate([
    { $match: { guardian: { $type: "objectId" }, status: { $in: ["pending", "approved"] } } },
    { $group: { _id: { student: "$student", guardian: "$guardian", status: "$status" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ]).toArray();

  if (duplicates.length) {
    const details = duplicates.map(item => ({
      student: String(item._id.student),
      guardian: String(item._id.guardian),
      status: item._id.status,
      count: item.count,
      linkIds: item.ids.map(String)
    }));
    throw new Error(
      "Migration stopped before changing indexes: duplicate pending or approved student/guardian pairs exist. " +
      "Review these records, resolve duplicates, back up the database, and rerun. Examples: " +
      JSON.stringify(details)
    );
  }

  const dryRun = process.argv.includes("--dry-run");
  const legacyUniqueIndexExists = indexes.some(index => index.name === "student_1_guardian_1" && index.unique);

  if (dryRun) {
    console.log("Dry run only: no indexes were changed.");
    console.log("Would ensure indexes: approved_guardian_pair_unique, pending_guardian_pair_unique.");
    console.log(`Would drop legacy student_1_guardian_1 unique index: ${legacyUniqueIndexExists ? "yes" : "no"}.`);
    console.log("Duplicate preflight passed for pending and approved student/guardian pairs.");
  } else {
    // Create replacement constraints before removing the legacy unique index.
    // If either creation fails, the old index still protects existing data.
    await collection.createIndex(
      { student: 1, guardian: 1 },
      { name: "approved_guardian_pair_unique", unique: true, partialFilterExpression: { guardian: { $type: "objectId" }, status: "approved" } }
    );
    await collection.createIndex(
      { student: 1, guardian: 1 },
      { name: "pending_guardian_pair_unique", unique: true, partialFilterExpression: { guardian: { $type: "objectId" }, status: "pending" } }
    );
    if (legacyUniqueIndexExists) {
      await collection.dropIndex("student_1_guardian_1");
    }
    console.log("Guardian link indexes migrated.");
  }
} finally {
  await mongoose.disconnect();
}
