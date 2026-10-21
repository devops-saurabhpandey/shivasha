import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) throw new Error("MONGODB_URI or MONGO_URI is required");

await mongoose.connect(uri);
try {
  const collection = mongoose.connection.collection("educationguardianlinks");
  const indexes = await collection.indexes();

  // Preflight before dropping the legacy index: the new partial unique index
  // can fail if duplicate approved pairs already exist in the collection.
  const duplicates = await collection.aggregate([
    { $match: { guardian: { $type: "objectId" }, status: "approved" } },
    { $group: { _id: { student: "$student", guardian: "$guardian" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ]).toArray();

  if (duplicates.length) {
    const details = duplicates.map(item => ({
      student: String(item._id.student),
      guardian: String(item._id.guardian),
      count: item.count,
      linkIds: item.ids.map(String)
    }));
    throw new Error(
      "Migration stopped before changing indexes: duplicate approved student/guardian pairs exist. " +
      "Review these records, resolve duplicates, back up the database, and rerun. Examples: " +
      JSON.stringify(details)
    );
  }

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
