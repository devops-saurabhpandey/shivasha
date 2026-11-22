import test from "node:test";
import assert from "node:assert/strict";
import { buildAffiliateCampaignKit } from "../utils/affiliateCampaignKit.js";

const course = {title:"Hindi Digital Marketing",description:"Learn content planning and campaign basics.",level:"beginner",language:"Hindi",price:0,currency:"INR"};

test("generates channel-specific Hindi content with referral URL and disclosure",()=>{
 const kit=buildAffiliateCampaignKit({course,referralUrl:"https://example.test/course?ref=SHV123",language:"Hindi"});
 assert.deepEqual(kit.map(x=>x.channel),["whatsapp","facebook","youtube"]);
 for(const item of kit){assert.ok(item.content.includes("https://example.test/course?ref=SHV123"));assert.ok(item.content.includes("affiliate link"));assert.ok(item.content.includes(course.title));}
});

test("supports English and paid course price labels",()=>{
 const kit=buildAffiliateCampaignKit({course:{...course,price:499},referralUrl:"https://example.test/?ref=X",language:"English",channels:["whatsapp"]});
 assert.equal(kit.length,1);
 assert.ok(kit[0].content.includes("₹499"));
 assert.ok(kit[0].content.includes("Disclosure: This is an affiliate link."));
});

test("rejects unsupported channels by returning no campaign assets",()=>{
 assert.deepEqual(buildAffiliateCampaignKit({course,referralUrl:"https://example.test",channels:["email","sms"]}),[]);
});

test("normalizes untrusted course text and always includes affiliate disclosure",()=>{
 const kit=buildAffiliateCampaignKit({course:{...course,title:"Course Guaranteed income!!!"},referralUrl:"https://example.test",channels:["facebook"]});
 assert.ok(!kit[0].content.toLowerCase().includes("guaranteed income"));
 assert.ok(kit[0].content.includes("Disclosure:")===false);
 assert.ok(kit[0].content.includes("प्रकटीकरण:"));
});
