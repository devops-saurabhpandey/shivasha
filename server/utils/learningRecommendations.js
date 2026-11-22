const allowedLevels = new Set(["beginner", "intermediate", "advanced"]);
const allowedCategories = new Set(["technology", "business", "marketing", "finance", "education", "spirituality", "wellness", "other"]);

export function rankLearningRecommendations({ courses, preferences = {}, historyCategories = [], enrolledCourseIds = [], userId }) {
  const preferredCategory = allowedCategories.has(preferences.category) ? preferences.category : "";
  const preferredLevel = allowedLevels.has(preferences.level) ? preferences.level : "";
  const preferredLanguage = String(preferences.language || "").trim().toLowerCase().slice(0, 40);
  const history = new Set(historyCategories.filter(Boolean));
  const enrolled = new Set(enrolledCourseIds.map(String));
  return courses
    .filter(course => !enrolled.has(String(course._id)) && String(course.instructor?._id || course.instructor) !== String(userId))
    .map(course => {
      let score = 0;
      const reasons = [];
      if (preferredCategory && course.category === preferredCategory) { score += 6; reasons.push("Matches your selected category"); }
      if (preferredLevel && course.level === preferredLevel) { score += 3; reasons.push("Matches your experience level"); }
      if (preferredLanguage && String(course.language || "").toLowerCase() === preferredLanguage) { score += 2; reasons.push("Available in your preferred language"); }
      if (!preferredCategory && history.has(course.category)) { score += 2; reasons.push("Related to courses you have enrolled in"); }
      if (Number(course.price) === 0) { score += 1; reasons.push("Free course"); }
      return { course, score, recommendationReason: reasons[0] || "Recently published course" };
    })
    .sort((a, b) => b.score - a.score || new Date(b.course.createdAt || 0) - new Date(a.course.createdAt || 0))
    .slice(0, 20);
}
