export function formatDuplicatePairs(duplicates) {
  return duplicates.map((item) => ({
    student: String(item._id.student),
    guardian: String(item._id.guardian),
    status: item._id.status,
    count: item.count,
    linkIds: item.ids.map(String)
  }));
}

export function hasLegacyUniqueGuardianIndex(indexes) {
  return indexes.some((index) => index.name === "student_1_guardian_1" && index.unique === true);
}

export function getGuardianIndexMigrationPlan(indexes) {
  return {
    ensureIndexes: ["approved_guardian_pair_unique", "pending_guardian_pair_unique"],
    dropLegacyUniqueIndex: hasLegacyUniqueGuardianIndex(indexes)
  };
}
