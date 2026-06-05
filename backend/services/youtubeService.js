const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

function formatNumber(n) {
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parsePT(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return "0:00";
    const h = parseInt(match[1]) || 0;
    const m = parseInt(match[2]) || 0;
    const s = parseInt(match[3]) || 0;
    const totalM = h * 60 + m;
    return `${totalM}:${s.toString().padStart(2, "0")}`;
}

const catMap = {
    "1": "Entertainment", "2": "Auto", "10": "Music", "15": "Pets",
    "17": "Sports", "20": "Gaming", "22": "Vlogs", "23": "Comedy",
    "24": "Entertainment", "25": "News", "26": "How-to", "27": "Education", "28": "Tech"
};

async function fetchRealTrends(countryCode) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === "YOUR_KEY_HERE") throw new Error("No API Key");

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${countryCode}&maxResults=24&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("YouTube API failed: " + response.statusText);
    const data = await response.json();

    // Fetch channel details
    const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))].join(",");
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${apiKey}`;
    const channelsResponse = await fetch(channelsUrl);
    const channelsData = channelsResponse.ok ? await channelsResponse.json() : { items: [] };

    const channelMap = {};
    channelsData.items.forEach(ch => {
        channelMap[ch.id] = {
            avatar: ch.snippet.thumbnails?.default?.url || "",
            subs: formatNumber(parseInt(ch.statistics.subscriberCount) || 0)
        };
    });

    return data.items.map((item, i) => {
        const chInfo = channelMap[item.snippet.channelId] || { avatar: "", subs: "0" };
        const views = parseInt(item.statistics.viewCount) || 0;
        const likes = parseInt(item.statistics.likeCount) || 0;
        const comments = parseInt(item.statistics.commentCount) || 0;
        const realGrowthRate = views > 0 ? Math.min(100, Math.floor(((likes + comments) / views) * 500)) : 0;

        return {
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelAvatar: chInfo.avatar,
            channelSubs: chInfo.subs,
            thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            views,
            likes,
            comments,
            publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
            category: catMap[item.snippet.categoryId] || "Entertainment",
            duration: parsePT(item.contentDetails.duration),
            country: countryCode,
            growthRate: realGrowthRate
        };
    });
}

module.exports = { fetchRealTrends, formatNumber, randomInt, parsePT };
