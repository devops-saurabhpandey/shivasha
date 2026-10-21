export function normalizeQuestionOptions(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) return null;
  const options = value.map(option => String(option).trim()).filter(Boolean);
  return options.length >= 2 && options.length <= 6 ? options : null;
}

export function isValidSelectedIndex(value, optionCount) {
  return Number.isInteger(value) && value >= 0 && value < optionCount;
}
