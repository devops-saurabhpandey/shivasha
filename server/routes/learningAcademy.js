import { Router } from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import User from "../models/User.js";
import LearningCourse from "../models/LearningCourse.js";
import LearningEnrollment from "../models/LearningEnrollment.js";
import LearningSale from "../models/LearningSale.js";
import AffiliatePartner from "../models/AffiliatePartner.js";
import AffiliateCommission from "../models/AffiliateCommission.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const categories = new Set(["technology", "business", "marketing", "finance", "education", "spirituality", "wellness", "other"]);
const levels = new Set(["beginner", "intermediate", "advanced"]);
const safeUrl = value => { try { const u = new URL(String(value || "")); return ["https:", "http:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; } };
const isAdmin = async id => (await User.findById(id).select("role"))?.role === "admin";
const publicCourse = (course, { includeLessonUrls = false } = {}) => ({ _id: course._id, title: course.title, description: course.description, category: course.category, language: course.language, level: course.level, price: course.price, currency: course.currency, thumbnailUrl: course.thumbnailUrl, lessons: course.lessons.map(({_id,title,description,videoUrl,durationMinutes,order}) => ({_id,title,description,...(includeLessonUrls ? {videoUrl} : {}),durationMinutes,order})), instructor: course.instructor, createdAt: course.createdAt });

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

router.get("/instructor/earnings", requireAuth, async (req,res,next) => {
  try {
    const [totals,sales]=await Promise.all([
      LearningSale.aggregate([
        {$match:{instructor:new mongoose.Types.ObjectId(req.user.id),status:"verified"}},
        {$group:{_id:"$currency",gross:{$sum:"$grossAmount"},earned:{$sum:"$instructorAmount"},sales:{$sum:1}}}
      ]),
      LearningSale.find({instructor:req.user.id}).populate("course","title").sort({createdAt:-1}).limit(100).lean()
    ]);
    res.json({totals:totals.map(x=>({currency:x._id,gross:roundMoney(x.gross),earned:roundMoney(x.earned),sales:x.sales})),sales});
  } catch(e){next(e);}
});

router.post("/admin/sales/verify", requireAuth, async (req,res,next) => {
  try {
    if(!await isAdmin(req.user.id))return res.status(403).json({message:"Admin access required."});
    const enrollmentId=String(req.body?.enrollmentId||"");
    const instructorRate=Number(req.body?.instructorRatePercent);
    const affiliateRate=Number(req.body?.affiliateRatePercent||0);
    const affiliateCode=String(req.body?.affiliateCode||"").trim().toUpperCase();
    if(!mongoose.isValidObjectId(enrollmentId))return res.status(400).json({message:"Valid paid enrollment ID is required."});
    if(String(req.body?.instructorRatePercent??"").trim()===""||!Number.isFinite(instructorRate)||instructorRate<0||instructorRate>100||!Number.isFinite(affiliateRate)||affiliateRate<0||affiliateRate>50||instructorRate+affiliateRate>100)return res.status(400).json({message:"Instructor and affiliate rates must be valid and total no more than 100%."});
    const enrollment=await LearningEnrollment.findById(enrollmentId);
    if(!enrollment||enrollment.paymentStatus!=="verified"||!enrollment.transactionReference)return res.status(404).json({message:"A payment-verified enrollment is required before recording course earnings."});
    const course=await LearningCourse.findOne({_id:enrollment.course,status:"published"});
    if(!course||course.price<=0||Math.abs(Number(enrollment.amountPaid)-Number(course.price))>0.01)return res.status(400).json({message:"Enrollment amount does not match a published paid course."});
    if(String(course.instructor)===String(enrollment.student))return res.status(400).json({message:"An instructor cannot earn commission on their own enrollment."});
    if(await LearningSale.exists({$or:[{enrollment:enrollment._id},{transactionReference:enrollment.transactionReference}]}))return res.status(409).json({message:"This course transaction already has a sales record."});
    let partner=null;
    if(affiliateCode){
      if(course.currency!=="INR")return res.status(400).json({message:"Affiliate course commissions currently support INR courses only."});
      partner=await AffiliatePartner.findOne({code:affiliateCode,status:"active"}).select("_id user");
      if(!partner)return res.status(404).json({message:"Active affiliate partner not found."});
      if(String(partner.user)===String(enrollment.student)||String(partner.user)===String(course.instructor))return res.status(400).json({message:"Instructor or buyer cannot receive affiliate commission for this sale."});
      if(affiliateRate<=0)return res.status(400).json({message:"Enter an affiliate rate greater than zero when a referral code is supplied."});
    }else if(affiliateRate!==0)return res.status(400).json({message:"Affiliate rate must be zero when no referral code is supplied."});
    const gross=roundMoney(enrollment.amountPaid),instructorAmount=roundMoney(gross*instructorRate/100),affiliateAmount=roundMoney(gross*affiliateRate/100),platformAmount=roundMoney(gross-instructorAmount-affiliateAmount);
    let sale;
    try{
      sale=await LearningSale.create({enrollment:enrollment._id,course:course._id,instructor:course.instructor,buyer:enrollment.student,transactionReference:enrollment.transactionReference,currency:course.currency,grossAmount:gross,instructorRatePercent:instructorRate,instructorAmount,affiliatePartner:partner?._id||null,affiliateRatePercent:affiliateRate,affiliateAmount,platformAmount,verifiedBy:req.user.id});
      if(partner){
        try{
          await AffiliateCommission.create({partner:partner._id,user:enrollment.student,transactionReference:"SHVCOURSE-"+enrollment.transactionReference,grossAmount:gross,ratePercent:affiliateRate,commissionAmount:affiliateAmount,status:"pending_review",productDescription:"SHIVASHA course: "+course.title.slice(0,150),verifiedAt:new Date()});
        }catch(error){
          await LearningSale.deleteOne({_id:sale._id});
          if(error?.code===11000)return res.status(409).json({message:"This transaction already has an affiliate commission record."});
          throw error;
        }
      }
    }catch(error){if(error?.code===11000)return res.status(409).json({message:"A sales record already exists for this payment."});throw error;}
    res.status(201).json({sale,message:"Verified course sale recorded. Instructor and affiliate amounts are ledger entries, not payouts."});
  }catch(e){next(e);}
});

router.get("/admin/pending-paid-enrollments", requireAuth, async (req,res,next) => {
  try{
    if(!await isAdmin(req.user.id))return res.status(403).json({message:"Admin access required."});
    const enrollments=await LearningEnrollment.find({paymentStatus:"verified",transactionReference:{$exists:true,$ne:""}}).populate("course","title price currency instructor").populate("student","name email").sort({createdAt:-1}).limit(200).lean();
    const sales=await LearningSale.find({}).select("enrollment").lean();
    const recorded=new Set(sales.map(x=>String(x.enrollment)));
    res.json({enrollments:enrollments.filter(x=>x.course&&!recorded.has(String(x._id)))});
  }catch(e){next(e);}
});

router.get("/admin/sales", requireAuth, async (req,res,next) => {
  try{
    if(!await isAdmin(req.user.id))return res.status(403).json({message:"Admin access required."});
    const sales=await LearningSale.find().populate("course","title").populate("instructor","name email").populate("buyer","name email").populate("affiliatePartner","code").sort({createdAt:-1}).limit(200).lean();
    res.json({sales});
  }catch(e){next(e);}
});

router.patch("/admin/sales/:id/reverse", requireAuth, async (req,res,next) => {
  try{
    if(!await isAdmin(req.user.id))return res.status(403).json({message:"Admin access required."});
    if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid sale ID."});
    const sale=await LearningSale.findOneAndUpdate({_id:req.params.id,status:"verified"},{$set:{status:"reversed",reviewNote:String(req.body?.reason||"Refund or chargeback").trim().slice(0,300)}},{new:true});
    if(!sale)return res.status(404).json({message:"Verified sale not found or already reversed."});
    await LearningEnrollment.updateOne({_id:sale.enrollment},{$set:{accessRevoked:true,completedAt:null},$unset:{certificateId:1}});
    if(sale.affiliatePartner)await AffiliateCommission.findOneAndUpdate({transactionReference:"SHVCOURSE-"+sale.transactionReference,status:{$in:["pending_review","approved"]}},{$set:{status:"reversed",reviewedBy:req.user.id,reviewedAt:new Date(),reviewNote:"Related course sale reversed."}});
    res.json({sale,message:"Sale ledger reversed. Any instructor payout must be reconciled separately."});
  }catch(e){next(e);}
});

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

router.get("/admin/courses", requireAuth, async (req,res,next) => {
  try {
    if(!await isAdmin(req.user.id)) return res.status(403).json({message:"Admin access required."});
    const courses=await LearningCourse.find({status:"pending_review"}).populate("instructor","name email").sort({createdAt:1}).limit(100).lean();
    res.json({courses:courses.map(course=>({...publicCourse(course),status:course.status,instructor:course.instructor}))});
  } catch(e){next(e);}
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
    const enrolled=Boolean(enrollment)&&!enrollment.accessRevoked;
    res.json({course:publicCourse(course,{includeLessonUrls:Boolean(enrollment)||course.price===0}),enrollment:enrolled?{_id:enrollment._id,paymentStatus:enrollment.paymentStatus,progress:enrollment.progress,completedAt:enrollment.completedAt,certificateId:enrollment.certificateId}:null,canAccessLessons:enrolled||course.price===0});
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
    const enrollment=await LearningEnrollment.findOne({_id:req.params.id,student:req.user.id,accessRevoked:false});
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
