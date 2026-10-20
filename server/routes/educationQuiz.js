import { Router } from "express";
import mongoose from "mongoose";
import EducationQuestion from "../models/EducationQuestion.js";
import EducationAttempt from "../models/EducationAttempt.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const boards = ["CBSE", "ICSE", "ISC"];
const subjects = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science", "History", "Geography", "Computer Science"];
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
    const questions=await EducationQuestion.find(filter).select("board grade subject chapter question options explanation sourceUrl published createdAt").sort({createdAt:-1}).limit(100).lean();
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
    const qs=await EducationQuestion.find({_id:{$in:ids},board,grade,subject,published:true}).select("answerIndex options");
    if(qs.length!==ids.length) return res.status(400).json({message:"One or more questions are unavailable."});
    const map=new Map(qs.map(q=>[String(q._id),q]));
    const checked=answers.map(a=>{const q=map.get(String(a.questionId)),n=Number(a.selectedIndex);return Number.isInteger(n)&&n>=0&&n<q.options.length?{question:q._id,selectedIndex:n,correct:n===q.answerIndex}:null;});
    if(checked.some(a=>!a)) return res.status(400).json({message:"Choose a valid option for every answer."});
    const correctCount=checked.filter(a=>a.correct).length,scorePercent=Math.round(correctCount/checked.length*100);
    const attempt=await EducationAttempt.create({student:req.user.id,board,grade,subject,answers:checked,totalQuestions:checked.length,correctCount,scorePercent});
    res.status(201).json({attempt:{_id:attempt._id,board,grade,subject,totalQuestions:checked.length,correctCount,scorePercent,createdAt:attempt.createdAt}});
  }catch(e){next(e);}
});
router.get("/attempts/me",requireAuth,async(req,res,next)=>{
  try{const attempts=await EducationAttempt.find({student:req.user.id}).select("board grade subject totalQuestions correctCount scorePercent createdAt").sort({createdAt:-1}).limit(50).lean();res.json({attempts});}catch(e){next(e);}
});
router.delete("/questions/:id",requireAuth,async(req,res,next)=>{
  try{if(!await admin(req))return res.status(403).json({message:"Admin access required."});if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid question ID."});const q=await EducationQuestion.findByIdAndDelete(req.params.id);if(!q)return res.status(404).json({message:"Question not found."});res.json({success:true,id:req.params.id});}catch(e){next(e);}
});
router.use((e,_req,res,_next)=>res.status(500).json({message:e.message||"Quiz request failed."}));
export default router;
