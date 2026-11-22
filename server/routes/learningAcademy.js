import { Router } from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import User from "../models/User.js";
import LearningCourse from "../models/LearningCourse.js";
import LearningEnrollment from "../models/LearningEnrollment.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const categories = new Set(["technology", "business", "marketing", "finance", "education", "spirituality", "wellness", "other"]);
const levels = new Set(["beginner", "intermediate", "advanced"]);
const safeUrl = value => { try { const u = new URL(String(value || "")); return ["https:", "http:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; } };
const isAdmin = async id => (await User.findById(id).select("role"))?.role === "admin";
const publicCourse = (course, { includeLessonUrls = false } = {}) => ({ _id: course._id, title: course.title, description: course.description, category: course.category, language: course.language, level: course.level, price: course.price, currency: course.currency, thumbnailUrl: course.thumbnailUrl, lessons: course.lessons.map(({_id,title,description,videoUrl,durationMinutes,order}) => ({_id,title,description,...(includeLessonUrls ? {videoUrl} : {}),durationMinutes,order})), instructor: course.instructor, createdAt: course.createdAt });

router.get("/courses", requireAuth, async (req,res,next) => {
  try {
    const filter = { status: "published" };
    if (categories.has(String(req.query.category || ""))) filter.category = String(req.query.category);
    if (req.query.q) filter.title = { $regex: String(req.query.q).trim().slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), $options:"i" };
    const courses = await LearningCourse.find(filter).populate("instructor","name avatarUrl").sort({createdAt:-1}).limit(100).lean();
    res.json({courses:courses.map(publicCourse)});
  } catch(e){next(e);}
});

router.get("/my-courses", requireAuth, async (req,res,next) => {
  try {
    const courses = await LearningCourse.find({instructor:req.user.id}).sort({createdAt:-1}).lean();
    const enrollments = await LearningEnrollment.find({student:req.user.id}).populate({path:"course",populate:{path:"instructor",select:"name avatarUrl"}}).sort({updatedAt:-1}).lean();
    res.json({created:courses.map(c=>({...publicCourse(c),status:c.status,reviewNote:c.reviewNote})),enrolled:enrollments.filter(e=>e.course).map(e=>({enrollmentId:e._id,course:publicCourse(e.course),paymentStatus:e.paymentStatus,amountPaid:e.amountPaid,progress:e.progress.length,completedAt:e.completedAt,certificateId:e.certificateId}))});
  } catch(e){next(e);}
});

router.post("/courses", requireAuth, async (req,res,next) => {
  try {
    const b=req.body||{}, title=String(b.title||"").trim(), description=String(b.description||"").trim();
    const price=Number(b.price), lessons=Array.isArray(b.lessons)?b.lessons:[];
    if(!title||title.length>160||!description||description.length>5000||!categories.has(b.category)||!levels.has(b.level)||!Number.isFinite(price)||price<0||price>1000000||lessons.length<1||lessons.length>100) return res.status(400).json({message:"Enter valid course details, price and 1–100 lessons."});
    const normalized=lessons.map((l,i)=>({title:String(l.title||"").trim().slice(0,160),description:String(l.description||"").trim().slice(0,1200),videoUrl:safeUrl(l.videoUrl),durationMinutes:Number(l.durationMinutes||0),order:i}));
    if(normalized.some(l=>!l.title||!Number.isFinite(l.durationMinutes)||l.durationMinutes<0||l.durationMinutes>1000)) return res.status(400).json({message:"Every lesson needs a title and a valid duration."});
    const thumbnailUrl=safeUrl(b.thumbnailUrl);
    const course=await LearningCourse.create({instructor:req.user.id,title,description,category:b.category,language:String(b.language||"Hindi").trim().slice(0,40),level:b.level,price,currency:b.currency==="USD"?"USD":"INR",thumbnailUrl,lessons:normalized,status:"pending_review"});
    res.status(201).json({course:publicCourse(course),message:"Course submitted for admin review. It is not visible in the public catalogue yet."});
  }catch(e){next(e);}
});

router.patch("/courses/:id/review", requireAuth, async (req,res,next) => {
  try {
    if(!await isAdmin(req.user.id)) return res.status(403).json({message:"Admin access required."});
    if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid course ID."});
    const status=req.body?.status;
    if(!["published","rejected","pending_review"].includes(status)) return res.status(400).json({message:"Invalid review status."});
    const course=await LearningCourse.findByIdAndUpdate(req.params.id,{$set:{status,reviewNote:String(req.body?.reviewNote||"").trim().slice(0,500),reviewedBy:req.user.id,reviewedAt:new Date()}},{new:true,runValidators:true});
    if(!course)return res.status(404).json({message:"Course not found."});
    res.json({course:publicCourse(course),status:course.status});
  }catch(e){next(e);}
});

router.get("/courses/:id", requireAuth, async (req,res,next) => {
  try {
    if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid course ID."});
    const course=await LearningCourse.findOne({_id:req.params.id,status:"published"}).populate("instructor","name avatarUrl").lean();
    if(!course)return res.status(404).json({message:"Published course not found."});
    const enrollment=await LearningEnrollment.findOne({student:req.user.id,course:course._id}).lean();
    const enrolled=Boolean(enrollment);
    res.json({course:publicCourse(course,{includeLessonUrls:Boolean(enrollment)||course.price===0}),enrollment:enrollment?{_id:enrollment._id,paymentStatus:enrollment.paymentStatus,progress:enrollment.progress,completedAt:enrollment.completedAt,certificateId:enrollment.certificateId}:null,canAccessLessons:enrolled||course.price===0});
  }catch(e){next(e);}
});

router.post("/courses/:id/enroll", requireAuth, async (req,res,next) => {
  try {
    if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid course ID."});
    const course=await LearningCourse.findOne({_id:req.params.id,status:"published"});
    if(!course)return res.status(404).json({message:"Published course not found."});
    if(course.price>0)return res.status(402).json({message:"This course is paid. Secure checkout is not enabled yet; enrollment requires verified payment."});
    const enrollment=await LearningEnrollment.findOneAndUpdate({student:req.user.id,course:course._id},{$setOnInsert:{paymentStatus:"free",amountPaid:0}},{new:true,upsert:true,runValidators:true});
    res.status(200).json({enrollment,message:"Free course enrollment successful."});
  }catch(e){if(e?.code===11000)return res.status(409).json({message:"Already enrolled."});next(e);}
});

router.post("/admin/enrollments/verify-payment", requireAuth, async (req,res,next) => {
  try {
    if(!await isAdmin(req.user.id))return res.status(403).json({message:"Admin access required."});
    const {courseId,studentId}=req.body||{},reference=String(req.body?.transactionReference||"").trim().slice(0,120);
    if(!mongoose.isValidObjectId(courseId)||!mongoose.isValidObjectId(studentId)||!reference)return res.status(400).json({message:"Valid course, student and transaction reference are required."});
    const [course,student,referenceUse,existing]=await Promise.all([
      LearningCourse.findOne({_id:courseId,status:"published"}),
      User.findById(studentId).select("_id"),
      LearningEnrollment.findOne({transactionReference:reference}),
      LearningEnrollment.findOne({student:studentId,course:courseId})
    ]);
    if(!course||course.price<=0)return res.status(400).json({message:"Select a published paid course."});
    if(!student)return res.status(404).json({message:"Student account not found."});
    if(referenceUse)return referenceUse.student.toString()===studentId&&referenceUse.course.toString()===courseId
      ? res.status(200).json({enrollment:referenceUse,message:"This payment reference was already recorded for this enrollment."})
      : res.status(409).json({message:"This transaction reference is already used by another enrollment."});
    if(existing)return res.status(409).json({message:"Student already has an enrollment for this course."});
    const enrollment=await LearningEnrollment.create({student:studentId,course:courseId,paymentStatus:"verified",transactionReference:reference,amountPaid:course.price});
    res.status(201).json({enrollment,message:"Admin-recorded payment verification complete. No payment gateway is connected in this phase."});
  }catch(e){if(e?.code===11000)return res.status(409).json({message:"This student is already enrolled or transaction was already recorded."});next(e);}
});

router.post("/enrollments/:id/progress", requireAuth, async (req,res,next) => {
  try {
    if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid enrollment ID."});
    const enrollment=await LearningEnrollment.findOne({_id:req.params.id,student:req.user.id});
    if(!enrollment)return res.status(404).json({message:"Enrollment not found."});
    const course=await LearningCourse.findOne({_id:enrollment.course,status:"published"});
    if(!course)return res.status(404).json({message:"Course is unavailable."});
    const lessonId=String(req.body?.lessonId||"");
    if(!course.lessons.some(l=>String(l._id)===lessonId))return res.status(400).json({message:"Lesson does not belong to this course."});
    if(!enrollment.progress.some(p=>String(p.lesson)===lessonId))enrollment.progress.push({lesson:lessonId,completedAt:new Date()});
    if(enrollment.progress.length>=course.lessons.length&&!enrollment.completedAt){enrollment.completedAt=new Date();enrollment.certificateId="SHV-"+crypto.randomBytes(6).toString("hex").toUpperCase();}
    await enrollment.save();
    res.json({progress:enrollment.progress.length,total:course.lessons.length,completedAt:enrollment.completedAt,certificateId:enrollment.certificateId});
  }catch(e){next(e);}
});

router.get("/certificates/:id", requireAuth, async (req,res,next) => {
  try {
    const enrollment=await LearningEnrollment.findOne({certificateId:String(req.params.id),student:req.user.id}).populate("course","title category").lean();
    if(!enrollment||!enrollment.completedAt)return res.status(404).json({message:"Certificate not found."});
    res.json({certificate:{id:enrollment.certificateId,student:req.user.id,course:enrollment.course?.title,completedAt:enrollment.completedAt,issuer:"SHIVASHA Learning Academy"}});
  }catch(e){next(e);}
});

export default router;
