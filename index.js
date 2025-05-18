const fs = require("fs");
const { google } = require("googleapis");
const youtube = google.youtube("v3");

// 🔑 Your API Key
const API_KEY = ""; // Replace with your YouTube Data API v3 key

// 🔍 Search Queries
const searchQueries = [
  "queries", //your query
];

// 📅 Date filter (only videos uploaded after this)
const publishedAfter = "2025-05-10T00:00:00Z";

// ⏰ Create IST timestamp for filename
function getISTTimestamp() {
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms
  const istDate = new Date(Date.now() + istOffset);
  return istDate
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "IST");
}

// ⏰ Get IST date and time for report heading
function getISTDateTime() {
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms
  const now = new Date(Date.now() + istOffset);
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(" ")[0]; // HH:MM:SS
  const hhmm = time.slice(0, 5); // HH:MM
  return `${date} ${hhmm} IST`;
}

// 🧠 Extract contact method (optional usage)
function extractContactMethod(text) {
  if (/whatsapp/i.test(text)) return "WhatsApp";
  if (/instagram/i.test(text)) return "Instagram";
  if (/dm/i.test(text)) return "DM";
  if (/call/i.test(text)) return "Call";
  return "Unknown";
}

// 📞 Extract phone number from text (optional usage)
function extractPhoneNumber(text) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?(\d{10})/g;
  const matches = text.match(phoneRegex);
  if (matches && matches.length > 0) {
    return matches[0].replace(/[\s\-\.\(\)]/g, "");
  }
  return "";
}

// 🚀 Main Function
async function searchAndSave() {
  let results = [];
  let serial = 1;

  for (const query of searchQueries) {
    console.log(`Searching for query: "${query}"`);
    const response = await youtube.search.list({
      key: API_KEY,
      part: "snippet",
      q: query,
      maxResults: 50,
      publishedAfter,
      type: "video",
      order: "viewCount",
    });

    const videos = response.data.items;
    console.log(`Found ${videos.length} videos for query.`);

    for (const video of videos) {
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      const publishedAt = video.snippet.publishedAt;
      const channelTitle = video.snippet.channelTitle;

      const details = await youtube.videos.list({
        key: API_KEY,
        part: "statistics,snippet",
        id: videoId,
      });

      const item = details.data.items[0];
      const viewCount = parseInt(item.statistics.viewCount);
      const description = item.snippet.description;

      // No filtering based on contact info, just filter by views
      if (viewCount >= 5000) {
        const combinedText = title + " " + description;
        const contactMethod = extractContactMethod(combinedText); // optional
        const contactNo = extractPhoneNumber(description); // optional

        results.push({
          serial: serial++,
          seller: channelTitle,
          productType: title,
          contactMethod,
          contactNo,
          title,
          views: viewCount,
          published: publishedAt.split("T")[0],
          videoLink: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }
  }

  // 📄 Build HTML Table
  let html = `
    <html>
      <head>
        <title>YouTube Sellers Report</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          a { color: #0077cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h2>YouTube Sellers Report (Generated on ${getISTDateTime()})</h2>
        <table>
          <tr>
            <th>S.No</th>
            <th>Seller Name</th>
            <th>Product Type</th>
            <th>Contact Method</th>
            <th>Contact No</th>
            <th>Video Title</th>
            <th>Views</th>
            <th>Published</th>
            <th>Video Link</th>
          </tr>
  `;

  for (const item of results) {
    html += `
      <tr>
        <td>${item.serial}</td>
        <td>${item.seller}</td>
        <td>${item.productType}</td>
        <td>${item.contactMethod}</td>
        <td>${item.contactNo || "-"}</td>
        <td>${item.title}</td>
        <td>${item.views}</td>
        <td>${item.published}</td>
        <td><a href="${item.videoLink}" target="_blank">Watch</a></td>
      </tr>
    `;
  }

  html += `
        </table>
      </body>
    </html>
  `;

  // 📝 Write file with IST timestamp
  const filename = `youtube_sellers_${getISTTimestamp()}.html`;
  fs.writeFileSync(filename, html);
  console.log(`✅ Report saved as: ${filename}`);

  // Open the file automatically (for Windows, Mac, Linux)
  openFile(filename);
}

// Function to open file after creation based on OS
function openFile(filename) {
  const { exec } = require("child_process");
  const platform = process.platform;

  if (platform === "win32") {
    exec(`start "" "${filename}"`);
  } else if (platform === "darwin") {
    exec(`open "${filename}"`);
  } else if (platform === "linux") {
    exec(`xdg-open "${filename}"`);
  } else {
    console.log("Cannot open file automatically on this OS.");
  }
}

// 🏁 Run the main function
searchAndSave().catch(console.error);
