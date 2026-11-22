export function canAccessCourseLessons({ price, enrollment }) {
  if (Number(price) === 0) return true;
  return Boolean(enrollment && enrollment.accessRevoked !== true);
}
