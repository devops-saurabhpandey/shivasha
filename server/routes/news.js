import { Router } from "express";

const router = Router();

const FEEDS = {
  science: [
    {name:"NASA",url:"https://www.nasa.gov/news-release/feed/",category:"Science"},
    {name:"ScienceDaily",url:"https://www.sciencedaily.com/rss/top/science.xml",category:"Science"}
  ],
  technology: [
    {name:"MIT Technology Review",url:"https://www.technologyreview.com/feed/",category:"Technology"},
    {name:"Google AI Blog",url:"https://blog.research.google/feeds/posts/default?alt=rss",category:"Technology"}
  ],
  "current-affairs": [
    {name:"PIB India",url:"https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",category:"India"},
    {name:"UN News",url:"https://news.un.org/feed/subscribe/en/news/all/rss.xml",category:"World"},
    {name:"RBI",url:"https://www.rbi.org.in/pressreleases_rss.xml",category:"Economy"}
  ]
};

function decodeXml(value="") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")
    .replace(/<[^>]+>/g," ")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/\s+/g," ").trim();
}

function tagValue(xml, tag) {
  const escaped=tag.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const match=xml.match(new RegExp("<"+escaped+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+escaped+">","i"));
  return match ? decodeXml(match[1]) : "";
}

function parseItems(xml, source) {
  const items=[...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(match=>{
    const block=match[2];
    let link=tagValue(block,"link");
    if(!link){
      const href=block.match(/<link[^>]+href=["']([^"']+)["']/i);
      link=href?.[1]||"";
    }
    const title=tagValue(block,"title");
    const description=tagValue(block,"description")||tagValue(block,"summary")||tagValue(block,"content:encoded")||tagValue(block,"content");
    const date=tagValue(block,"pubDate")||tagValue(block,"published")||tagValue(block,"updated")||tagValue(block,"dc:date");
    if(!title||!link||!/^https?:\/\//i.test(link)) return null;
    return {title,description:description.slice(0,420),url:link,date,source:source.name,category:source.category};
  });
  return items.filter(Boolean);
}

router.get("/youtube-search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
  if (query.length < 2) return res.status(400).json({ message: "Enter at least 2 characters to search YouTube.", items: [] });
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ message: "YouTube search is not connected yet. Add YOUTUBE_API_KEY to the private backend environment.", setupRequired: true, items: [] });
  }
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({ part: "snippet", type: "video", maxResults: "8", safeSearch: "moderate", q: query, key: process.env.YOUTUBE_API_KEY }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    if (!response.ok) {
      const status = response.status === 403 ? 502 : response.status;
      console.warn("YouTube API request failed:", response.status, data?.error?.errors?.[0]?.reason || "unknown");
      return res.status(status).json({ message: response.status === 403 ? "YouTube API access or quota is unavailable. Check the Google Cloud project and quota." : "YouTube search is temporarily unavailable.", items: [] });
    }
    const items = (data.items || []).map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title || "YouTube video",
      description: String(item.snippet?.description || "").slice(0, 300),
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      url: item.id?.videoId ? "https://www.youtube.com/watch?v=" + encodeURIComponent(item.id.videoId) : ""
    })).filter(item => item.videoId && item.url);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    return res.json({ query, items, count: items.length, source: "YouTube Data API v3" });
  } catch (error) {
    console.warn("YouTube search unavailable:", error.message);
    return res.status(502).json({ message: "Could not reach YouTube right now. Please try again.", items: [] });
  }
});

router.get("/",async(req,res)=>{
  const section=String(req.query.section||"current-affairs");
  const feeds=FEEDS[section];
  if(!feeds) return res.status(400).json({message:"Unknown news section",items:[]});
  const results=await Promise.all(feeds.map(async source=>{
    try{
      const response=await fetch(source.url,{headers:{"User-Agent":"SHIVASHA-NewsReader/1.0","Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"},signal:AbortSignal.timeout(7000)});
      if(!response.ok) throw new Error("Feed returned "+response.status);
      const xml=await response.text();
      if(!xml.includes("<")||xml.length>4_000_000) throw new Error("Invalid feed response");
      return parseItems(xml,source);
    }catch(error){
      console.warn("SHIVASHA feed unavailable:",source.name,error.message);
      return [];
    }
  }));
  const items=results.flat().sort((a,b)=>{
    const da=Date.parse(a.date)||0,db=Date.parse(b.date)||0;
    return db-da;
  }).slice(0,20);
  res.set("Cache-Control","public, max-age=300, stale-while-revalidate=600");
  res.json({section,items,updatedAt:new Date().toISOString(),live:items.length>0});
});

export default router;
