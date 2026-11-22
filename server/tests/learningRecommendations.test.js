import test from "node:test";
import assert from "node:assert/strict";
import { rankLearningRecommendations } from "../utils/learningRecommendations.js";

const courses = [
  {_id:"1",title:"React Advanced",category:"technology",level:"advanced",language:"English",price:500,instructor:"teacher-1",createdAt:"2026-01-01"},
  {_id:"2",title:"Hindi Beginner Tech",category:"technology",level:"beginner",language:"Hindi",price:0,instructor:"teacher-2",createdAt:"2026-01-02"},
  {_id:"3",title:"Finance Basics",category:"finance",level:"beginner",language:"Hindi",price:0,instructor:"teacher-3",createdAt:"2026-01-03"},
  {_id:"4",title:"My own course",category:"technology",level:"beginner",language:"Hindi",price:0,instructor:"student-1"},
  {_id:"5",title:"Already enrolled",category:"technology",level:"beginner",language:"Hindi",price:0,instructor:"teacher-4"}
];

test("recommendations prioritize explicit category, level and language preferences", () => {
  const result = rankLearningRecommendations({courses,preferences:{category:"technology",level:"beginner",language:"Hindi"},userId:"student-1",enrolledCourseIds:["5"]});
  assert.equal(result[0].course._id,"2");
  assert.ok(result[0].recommendationReason.includes("Matches your selected category"));
  assert.equal(result.some(x=>x.course._id==="4"||x.course._id==="5"),false);
});

test("learning history provides a related-category signal when no category is selected", () => {
  const result = rankLearningRecommendations({courses,preferences:{level:"beginner"},historyCategories:["finance"],userId:"student-1"});
  assert.equal(result[0].course._id,"3");
  assert.ok(result[0].recommendationReason.includes("Matches your experience level"));
});

test("invalid preferences are ignored and results remain bounded to 20", () => {
  const many = Array.from({length:30},(_,i)=>({_id:String(i),category:"other",level:"beginner",price:0,instructor:"teacher"}));
  const result = rankLearningRecommendations({courses:many,preferences:{category:"not-real",level:"bad"},userId:"student-1"});
  assert.equal(result.length,20);
});
