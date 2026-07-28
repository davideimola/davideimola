#!/usr/bin/env node
// Regenerates the "Latest writing" block in README.md from the blog RSS feed.
// Safe to run locally: node .github/scripts/update-posts.mjs
import { readFile, writeFile } from "node:fs/promises";

const FEED = "https://davideimola.dev/rss.xml";
const README = "README.md";
const START = "<!-- BLOG-POSTS:START -->";
const END = "<!-- BLOG-POSTS:END -->";
const COUNT = 3;

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decodeEntities(match[1].trim()) : null;
}

const response = await fetch(FEED);
if (!response.ok) {
  throw new Error(`${FEED} returned ${response.status}`);
}
const xml = await response.text();

const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, item]) => ({ title: tag(item, "title"), link: tag(item, "link") }))
  .filter((post) => post.title && post.link)
  .slice(0, COUNT);

// Never blank the section out: an empty or broken feed leaves the README alone.
if (posts.length === 0) {
  throw new Error("no usable items in the feed, leaving the README untouched");
}

const readme = await readFile(README, "utf8");
const startAt = readme.indexOf(START);
const endAt = readme.indexOf(END);
if (startAt === -1 || endAt === -1) {
  throw new Error(`markers ${START} / ${END} not found in ${README}`);
}

const block = posts.map((post) => `- [${post.title}](${post.link})`).join("\n");
const updated = `${readme.slice(0, startAt + START.length)}\n${block}\n${readme.slice(endAt)}`;

if (updated === readme) {
  console.log("Latest writing is already up to date.");
} else {
  await writeFile(README, updated);
  console.log(`Updated ${posts.length} posts:\n${block}`);
}
