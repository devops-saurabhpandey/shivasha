import dotenv from "dotenv";
import mongoose from "mongoose";
import PromptCategory from "../models/PromptCategory.js";

dotenv.config();

const categories = [
  ["Business & Entrepreneurship","business","💼","Business planning, entrepreneurship, operations and leadership."],
  ["Marketing, Advertising & Sales","marketing","📣","Campaigns, advertising, sales, customer acquisition and growth."],
  ["Social Media & Creator Growth","social-media","📱","Social platforms, creator strategy, community and audience development."],
  ["Content Writing & Storytelling","content-writing","✍️","Articles, copywriting, scripts, storytelling and editing."],
  ["SEO, Blogging & Website","seo-blogging","🔎","Search optimization, blogging, website content and analytics."],
  ["Software Development & Coding","software-development","💻","Programming, debugging, architecture, testing and software delivery."],
  ["IT, Cloud, DevOps & Cybersecurity","it-cloud-devops","☁️","Cloud infrastructure, DevOps, security, networking and IT operations."],
  ["AI, Automation & Agents","ai-automation","🤖","AI workflows, prompt engineering, agents and responsible automation."],
  ["Education, Teaching & Research","education","🎓","Teaching, lesson plans, research, study and assessment."],
  ["Career, Jobs & Productivity","career-productivity","🚀","Career planning, resumes, interviews, workplace and productivity."],
  ["Finance, Accounting & Money Management","finance","💰","Budgeting, accounting, financial literacy and business finance."],
  ["E-commerce & Customer Support","ecommerce","🛒","Online stores, product listings, customer service and operations."],
  ["Design, UI/UX & Branding","design-ui-ux","🎨","Visual design, user experience, branding and creative direction."],
  ["Health, Wellness & Ayurveda","health-wellness","🌿","General wellness education and Ayurveda information; not diagnosis or treatment."],
  ["Spirituality & Self-Knowledge","spirituality","🕉️","Spiritual learning, reflection, philosophy and self-knowledge."],
  ["General Purpose & Languages","general-languages","🌐","Translation, communication, brainstorming and everyday assistance."]
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  for (let index = 0; index < categories.length; index += 1) {
    const [name, slug, icon, description] = categories[index];
    await PromptCategory.updateOne(
      { slug },
      { $set: { name, icon, description, sortOrder: index + 1, active: true }, $setOnInsert: { slug } },
      { upsert: true }
    );
  }
  console.log(`Seeded or updated ${categories.length} SHIVASHA prompt categories.`);
}

main().catch(error => {
  console.error("Prompt category seed failed:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
});
