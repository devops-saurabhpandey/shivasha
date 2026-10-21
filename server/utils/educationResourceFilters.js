export const BOARDS = new Set(["CBSE", "ICSE", "ISC"]);
export const TYPES = new Set(["Textbooks", "Workbooks", "Reference Books", "Exam Preparation", "Digital Learning"]);
export const SUBJECTS = new Set(["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"]);

export function buildEducationResourceFilter(query = {}) {
  const filter = {};
  if (query.board) {
    const board = String(query.board);
    if (!BOARDS.has(board)) return { error: "Select CBSE, ICSE or ISC." };
    filter.board = board;
  }
  if (query.grade) {
    const grade = Number(query.grade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) return { error: "Class must be from 1 to 12." };
    filter.grade = grade;
  }
  if (query.subject) {
    const subject = String(query.subject);
    if (!SUBJECTS.has(subject)) return { error: "Select a supported subject." };
    filter.subject = subject;
  }
  if (query.type) {
    const type = String(query.type);
    if (!TYPES.has(type)) return { error: "Select a supported resource type." };
    filter.resourceType = type;
  }
  return { filter };
}
