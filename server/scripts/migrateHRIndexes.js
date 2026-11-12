import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const COLLECTIONS = [
  { name: "hremployees", legacyUnique: "employeeCode_1", scopedKeys: { companyId: 1, employeeCode: 1 } },
  { name: "hrpayrollruns", legacyUnique: "month_1", scopedKeys: { companyId: 1, month: 1 } }
];

function sameKeys(left, right) {
  return JSON.stringify(Object.entries(left)) === JSON.stringify(Object.entries(right));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const hrCollections = ["hremployees", "hrattendance", "hrleaves", "hrchallans", "hrpayrollruns"];
  const missing = {};
  for (const name of hrCollections) {
    const collection = db.collection(name);
    missing[name] = await collection.countDocuments({
      $or: [{ companyId: { $exists: false } }, { companyId: null }]
    });
  }
  const hasUnassigned = Object.values(missing).some(count => count > 0);
  console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", unassignedLegacyRecords: missing }, null, 2));
  if (hasUnassigned) {
    throw new Error("Refusing index migration: assign every legacy HR record to a verified company first. This script never guesses tenant ownership.");
  }

  for (const item of COLLECTIONS) {
    const collection = db.collection(item.name);
    const duplicates = await collection.aggregate([
      { $group: { _id: { companyId: "$companyId", value: item.name === "hremployees" ? "$employeeCode" : "$month" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 }
    ]).toArray();
    if (duplicates.length) {
      throw new Error("Duplicate company-scoped key in " + item.name + ": " + JSON.stringify(duplicates));
    }
    const indexes = await collection.indexes();
    const oldIndex = indexes.find(index => index.name === item.legacyUnique);
    const scopedIndex = indexes.find(index => sameKeys(index.key, item.scopedKeys));
    if (!APPLY) {
      console.log(JSON.stringify({
        collection: item.name,
        legacyUniqueIndex: oldIndex?.name || null,
        existingScopedIndex: scopedIndex ? { name: scopedIndex.name, unique: Boolean(scopedIndex.unique) } : null,
        plannedAction: "drop old global unique index if present; create unique company-scoped index"
      }));
      continue;
    }
    if (oldIndex) await collection.dropIndex(oldIndex.name);
    if (scopedIndex && !scopedIndex.unique) await collection.dropIndex(scopedIndex.name);
    await collection.createIndex(item.scopedKeys, { unique: true, name: Object.keys(item.scopedKeys).join("_") + "_unique" });
    console.log("Created company-scoped unique index for " + item.name);
  }
}

main().catch(error => {
  console.error("HR index migration stopped:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
