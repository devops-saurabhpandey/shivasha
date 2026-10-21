import { Router } from "express";
import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import EducationQuestion from "../models/EducationQuestion.js";
import EducationAttempt from "../models/EducationAttempt.js";
import EducationStudyPlan from "../models/EducationStudyPlan.js";
import EducationStudentProfile from "../models/EducationStudentProfile.js";
import EducationGuardianLink from "../models/EducationGuardianLink.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const boards = ["CBSE", "ICSE", "ISC"];
const subjects = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"];
function isValidDateString(value) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
async function admin(req) {
  const user = await User.findById(req.user.id).select("role");
  return user?.role === "admin";
}
router.get("/questions", requireAuth, async (req, res, next) => {
  try {
    const board=String(req.query.board||""), grade=Number(req.query.grade), subject=String(req.query.subject||"");
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)) return res.status(400).json({message:"Select a valid board, class and subject."});
    const questions=await EducationQuestion.find({board,grade,subject,published:true}).select("board grade subject chapter question options explanation").sort({chapter:1}).limit(50).lean();
    res.json({questions,total:questions.length});
  } catch(e){next(e);}
});
router.get("/admin/questions", requireAuth, async (req,res,next) => {
  try {
    if(!await admin(req)) return res.status(403).json({message:"Admin access required."});
    const board=String(req.query.board||"");
    const filter={};
    if(boards.includes(board)) filter.board=board;
    if(req.query.published==="true") filter.published=true;
    if(req.query.published==="false") filter.published=false;
    const questions=await EducationQuestion.find(filter).select("board grade subject chapter question options answerIndex explanation sourceUrl published createdAt").sort({createdAt:-1}).limit(100).lean();
    res.json({questions,total:questions.length});
  } catch(e){next(e);}
});
router.post("/questions", requireAuth, async (req,res,next) => {
  try {
    if(!await admin(req)) return res.status(403).json({message:"Admin access required."});
    const b=req.body||{}, board=String(b.board||""), grade=Number(b.grade), subject=String(b.subject||""), chapter=String(b.chapter||"").trim(), question=String(b.question||"").trim();
    const options=Array.isArray(b.options)?b.options.map(x=>String(x).trim()).filter(Boolean).slice(0,6):[], answerIndex=Number(b.answerIndex);
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||!chapter||!question||options.length<2||!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>=options.length) return res.status(400).json({message:"Check board, class, subject, chapter, question, options and answer."});
    const item=await EducationQuestion.create({board,grade,subject,chapter:chapter.slice(0,160),question:question.slice(0,2000),options,answerIndex,explanation:String(b.explanation||"").trim().slice(0,2000),sourceUrl:String(b.sourceUrl||"").slice(0,1000),published:false,createdBy:req.user.id});
    res.status(201).json({question:{_id:item._id,board,grade,subject,chapter,question,options,explanation:item.explanation,published:false},message:"Saved as draft; review before publishing."});
  } catch(e){next(e);}
});
router.patch("/questions/:id",requireAuth,async(req,res,next)=>{
  try{
    if(!await admin(req))return res.status(403).json({message:"Admin access required."});
    if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid question ID."});
    const b=req.body||{},board=String(b.board||""),grade=Number(b.grade),subject=String(b.subject||""),chapter=String(b.chapter||"").trim(),question=String(b.question||"").trim();
    const options=Array.isArray(b.options)?b.options.map(x=>String(x).trim()).filter(Boolean):[],answerIndex=Number(b.answerIndex);
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||!chapter||!question||options.length<2||options.length>6||!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>=options.length)return res.status(400).json({message:"Check board, class, subject, chapter, question, options and answer."});
    const item=await EducationQuestion.findOneAndUpdate({_id:req.params.id,published:false},{$set:{board,grade,subject,chapter:chapter.slice(0,160),question:question.slice(0,2000),options,answerIndex,explanation:String(b.explanation||"").trim().slice(0,2000),sourceUrl:String(b.sourceUrl||"").slice(0,1000)}},{new:true,runValidators:true});
    if(!item)return res.status(404).json({message:"Draft not found. Published questions cannot be edited; unpublish it first."});
    res.json({question:{_id:item._id,board:item.board,grade:item.grade,subject:item.subject,chapter:item.chapter,question:item.question,options:item.options,published:item.published},message:"Draft updated."});
  }catch(e){next(e);}
});
router.patch("/questions/:id/publish", requireAuth, async(req,res,next)=>{
  try {
    if(!await admin(req)) return res.status(403).json({message:"Admin access required."});
    if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid question ID."});
    const item=await EducationQuestion.findByIdAndUpdate(req.params.id,{published:req.body?.published===true},{new:true,runValidators:true}).select("-answerIndex");
    if(!item) return res.status(404).json({message:"Question not found."});
    res.json({question:item});
  }catch(e){next(e);}
});
router.post("/attempts", requireAuth, async(req,res,next)=>{
  try{
    const b=req.body||{},board=String(b.board||""),grade=Number(b.grade),subject=String(b.subject||""),answers=Array.isArray(b.answers)?b.answers:[];
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||!answers.length||answers.length>50) return res.status(400).json({message:"Submit a valid test."});
    const ids=answers.map(a=>String(a.questionId||""));
    if(ids.some(id=>!mongoose.isValidObjectId(id))||new Set(ids).size!==ids.length) return res.status(400).json({message:"Invalid or repeated question IDs."});
    const qs=await EducationQuestion.find({_id:{$in:ids},board,grade,subject,published:true}).select("answerIndex options chapter");
    if(qs.length!==ids.length) return res.status(400).json({message:"One or more questions are unavailable."});
    const map=new Map(qs.map(q=>[String(q._id),q]));
    const checked=answers.map(a=>{const q=map.get(String(a.questionId)),n=Number(a.selectedIndex);return Number.isInteger(n)&&n>=0&&n<q.options.length?{question:q._id,chapter:q.chapter||"Uncategorized",selectedIndex:n,correct:n===q.answerIndex}:null;});
    if(checked.some(a=>!a)) return res.status(400).json({message:"Choose a valid option for every answer."});
    const correctCount=checked.filter(a=>a.correct).length,scorePercent=Math.round(correctCount/checked.length*100);
    const attempt=await EducationAttempt.create({student:req.user.id,board,grade,subject,answers:checked,totalQuestions:checked.length,correctCount,scorePercent});
    res.status(201).json({attempt:{_id:attempt._id,board,grade,subject,totalQuestions:checked.length,correctCount,scorePercent,createdAt:attempt.createdAt,answers:checked.map(a=>({questionId:String(a.question),chapter:a.chapter,correct:a.correct,selectedIndex:a.selectedIndex}))}});
  }catch(e){next(e);}
});
router.get("/attempts/me",requireAuth,async(req,res,next)=>{
  try{const attempts=await EducationAttempt.find({student:req.user.id}).select("board grade subject answers totalQuestions correctCount scorePercent createdAt").sort({createdAt:-1}).limit(50).lean();res.json({attempts});}catch(e){next(e);}
});
router.delete("/questions/:id",requireAuth,async(req,res,next)=>{
  try{if(!await admin(req))return res.status(403).json({message:"Admin access required."});if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid question ID."});const q=await EducationQuestion.findByIdAndDelete(req.params.id);if(!q)return res.status(404).json({message:"Question not found."});res.json({success:true,id:req.params.id});}catch(e){next(e);}
});


router.get("/profile/me", requireAuth, async (req,res,next) => {
  try {
    const profile=await EducationStudentProfile.findOne({student:req.user.id}).lean();
    res.json({profile:profile?{board:profile.board,grade:profile.grade,subject:profile.subject,dailyQuestionGoal:profile.dailyQuestionGoal,updatedAt:profile.updatedAt}:null});
  } catch(e) { next(e); }
});
router.put("/profile/me", requireAuth, async (req,res,next) => {
  try {
    const b=req.body||{}, board=String(b.board||""), grade=Number(b.grade), subject=String(b.subject||""), goal=Number(b.dailyQuestionGoal||10);
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||![5,10,15,20].includes(goal)) return res.status(400).json({message:"Select a valid board, class, subject and daily goal."});
    const profile=await EducationStudentProfile.findOneAndUpdate(
      {student:req.user.id},
      {$set:{board,grade,subject,dailyQuestionGoal:goal}},
      {new:true,upsert:true,runValidators:true,setDefaultsOnInsert:true}
    ).lean();
    res.json({profile:{board:profile.board,grade:profile.grade,subject:profile.subject,dailyQuestionGoal:profile.dailyQuestionGoal,updatedAt:profile.updatedAt},message:"Student profile saved to your account."});
  } catch(e) { next(e); }
});

router.get("/study-plan/me", requireAuth, async (req, res, next) => {
  try {
    const board=String(req.query.board||""), grade=Number(req.query.grade), subject=String(req.query.subject||""), date=String(req.query.date||"");
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||!isValidDateString(date)) return res.status(400).json({message:"Select a valid board, class, subject and date."});
    const plan=await EducationStudyPlan.findOne({student:req.user.id,board,grade,subject,planDate:date}).lean();
    res.json({plan:plan?{board:plan.board,grade:plan.grade,subject:plan.subject,planDate:plan.planDate,tasks:plan.tasks}:null});
  } catch(e) { next(e); }
});
router.put("/study-plan/me", requireAuth, async (req, res, next) => {
  try {
    const b=req.body||{}, board=String(b.board||""), grade=Number(b.grade), subject=String(b.subject||""), date=String(b.date||"");
    if(!boards.includes(board)||!Number.isInteger(grade)||grade<1||grade>12||!subjects.includes(subject)||!isValidDateString(date)) return res.status(400).json({message:"Select a valid board, class, subject and date."});
    if(!Array.isArray(b.tasks)||b.tasks.length>3) return res.status(400).json({message:"Submit a valid study checklist."});
    const allowed=["revise","practice","review"], seen=new Set(), tasks=[];
    for(const task of b.tasks){
      if(!task||!allowed.includes(task.id)||seen.has(task.id)||typeof task.completed!=="boolean") return res.status(400).json({message:"Invalid or repeated study task."});
      seen.add(task.id); tasks.push({id:task.id,completed:task.completed});
    }
    const plan=await EducationStudyPlan.findOneAndUpdate(
      {student:req.user.id,board,grade,subject,planDate:date},
      {$set:{tasks}},
      {new:true,upsert:true,runValidators:true,setDefaultsOnInsert:true}
    ).lean();
    res.json({plan:{board:plan.board,grade:plan.grade,subject:plan.subject,planDate:plan.planDate,tasks:plan.tasks},message:"Study plan saved to your account."});
  } catch(e) { next(e); }
});


// Guardian linking is student-controlled: the student creates a short-lived code,
// the guardian redeems it, and the student must explicitly approve the request.
router.post("/guardian/invite", requireAuth, async (req,res,next) => {
  try {
    const existing=await EducationGuardianLink.findOne({student:req.user.id,guardian:{$ne:null},status:"approved"}).lean();
    const code=randomBytes(18).toString("base64url");
    const inviteHash=createHash("sha256").update(code).digest("hex");
    const link=await EducationGuardianLink.create({student:req.user.id,status:"pending",inviteHash,inviteExpiresAt:new Date(Date.now()+24*60*60*1000)});
    res.status(201).json({code,expiresAt:link.inviteExpiresAt,message:"Share this code only with your intended guardian. It expires in 24 hours."});
  } catch(e) { next(e); }
});
router.post("/guardian/redeem", requireAuth, async (req,res,next) => {
  try {
    const code=String(req.body?.code||"").trim();
    if(code.length<16||code.length>100) return res.status(400).json({message:"Enter a valid invitation code."});
    const inviteHash=createHash("sha256").update(code).digest("hex");
    const preview=await EducationGuardianLink.findOne({inviteHash,guardian:null,inviteExpiresAt:{$gt:new Date()},status:"pending"}).select("student").lean();
    if(!preview) return res.status(400).json({message:"Invitation is invalid, expired or already used."});
    if(String(preview.student)===String(req.user.id)) return res.status(400).json({message:"Use a different account as guardian."});
    const duplicate=await EducationGuardianLink.findOne({student:preview.student,guardian:req.user.id,status:{$in:["pending","approved"]}});
    if(duplicate) return res.status(409).json({message:"A link request already exists for these accounts."});
    const link=await EducationGuardianLink.findOneAndUpdate(
      {inviteHash,student:preview.student,guardian:null,inviteExpiresAt:{$gt:new Date()},status:"pending"},
      {$set:{guardian:req.user.id,inviteHash:createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex"),inviteExpiresAt:new Date(0)}},
      {new:true}
    );
    if(!link) return res.status(409).json({message:"Invitation was already redeemed. Ask the student to generate a new code."});
    res.status(201).json({message:"Request sent. The student must approve it before any progress is shared."});
  } catch(e) { next(e); }
});
router.get("/guardian/requests/me", requireAuth, async (req,res,next) => {
  try {
    const links=await EducationGuardianLink.find({student:req.user.id,guardian:{$ne:null},status:"pending"}).populate("guardian","name email").select("guardian status createdAt").lean();
    res.json({requests:links});
  } catch(e) { next(e); }
});
router.patch("/guardian/links/:id", requireAuth, async (req,res,next) => {
  try {
    if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid link ID."});
    const action=String(req.body?.action||"");
    if(!["approve","revoke","reject"].includes(action)) return res.status(400).json({message:"Choose approve, reject or revoke."});
    const link=await EducationGuardianLink.findOne({_id:req.params.id,student:req.user.id,guardian:{$ne:null}});
    if(!link) return res.status(404).json({message:"Guardian request not found."});
    if(action==="approve") { if(link.status!=="pending") return res.status(409).json({message:"Only pending requests can be approved."}); link.status="approved"; link.approvedAt=new Date(); }
    else { link.status="revoked"; link.revokedAt=new Date(); }
    await link.save();
    res.json({link:{id:String(link._id),status:link.status},message:action==="approve"?"Guardian access approved.":"Guardian access removed."});
  } catch(e) { next(e); }
});
router.get("/guardian/children", requireAuth, async (req,res,next) => {
  try {
    const links=await EducationGuardianLink.find({guardian:req.user.id,status:"approved"}).populate("student","name").select("student approvedAt").lean();
    const children=await Promise.all(links.map(async link=>{
      const attempts=await EducationAttempt.find({student:link.student._id}).select("board grade subject totalQuestions correctCount scorePercent createdAt").sort({createdAt:-1}).limit(50).lean();
      const recent=attempts.filter(a=>Date.now()-new Date(a.createdAt).getTime()<=7*24*60*60*1000);
      return {student:{id:String(link.student._id),name:link.student.name},approvedAt:link.approvedAt,summary:{testsLast7Days:recent.length,questionsLast7Days:recent.reduce((n,a)=>n+Number(a.totalQuestions||0),0),averageScoreLast7Days:recent.length?Math.round(recent.reduce((n,a)=>n+Number(a.scorePercent||0),0)/recent.length):0},recentAttempts:attempts.slice(0,10).map(a=>({board:a.board,grade:a.grade,subject:a.subject,totalQuestions:a.totalQuestions,correctCount:a.correctCount,scorePercent:a.scorePercent,createdAt:a.createdAt}))};
    }));
    res.json({children});
  } catch(e) { next(e); }
});

router.use((e,_req,res,_next)=>{ console.error("Education quiz route error:", e); res.status(500).json({message:"Quiz request failed. Please try again."}); });
export default router;
