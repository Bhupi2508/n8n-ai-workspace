const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

let latestResponse = null;
const clients = [];

app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
    <title>n8n API Workflow Project</title>
    <style>
    body { font-family: Arial; margin:0; padding:0; display:flex; justify-content:center; align-items:center; height:100vh; background:linear-gradient(135deg,#6dd5fa,#2980b9);}
    .container { background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.2); text-align:center; width:90%; max-width:700px; max-height:90vh; overflow:auto;}
    h1 { color:#2980b9; margin-bottom:20px;}
    input { padding:10px; border:1px solid #ccc; border-radius:6px; width:70%; margin-right:5px;}
    button { padding:10px 15px; border:none; border-radius:6px; background-color:#2980b9; color:#fff; cursor:pointer;}
    button:hover { background-color:#1f6694;}
    #responseBox { margin-top:20px; padding:15px; border-radius:8px; min-height:100px; background-color:#f4f6f8; color:#333; overflow:auto;}
    .spinner { border: 5px solid #f3f3f3; border-top: 5px solid #2980b9; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto;}
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    th, td { padding:5px; border:1px solid #ccc; text-align:left; }
    img { max-width:100%; border-radius:8px; margin-bottom:15px; }
    </style>
    </head>
    <body>
    <div class="container">
    <h1>n8n API Workflow Project</h1>
    <form id="promptForm">
    <input type="text" id="promptInput" name="data" placeholder="Enter query" required />
    <button type="submit">Submit</button>
    </form>
    <div id="responseBox"><p>No response yet</p></div>
    </div>

    <script>
    const responseBox = document.getElementById("responseBox");
    const form = document.getElementById("promptForm");
    const promptInput = document.getElementById("promptInput");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputValue = promptInput.value.trim();
      if (!inputValue) {
        alert("Please enter a prompt!");
        return;
      }

      // Stage 1: Show spinner for first 5 seconds
      responseBox.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
      setTimeout(() => {
        // Stage 2: Show workflow running message until SSE update
        responseBox.innerHTML = '<p>Workflow is running... please wait.</p>';
      }, 5000);

      // Fire-and-forget backend call
      fetch("/inputPrompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: inputValue })
      }).catch(err => console.error(err));
    });

    // SSE for live updates
    const evtSource = new EventSource("/events");
    evtSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      let html = "";
      if (data.image) html += '<img src="'+data.image+'" alt="Generated Image" />';
      if (data.text) html += data.text;
      responseBox.innerHTML = html || "<p>No response yet</p>";
    };
    </script>
    </body>
    </html>
`);
});

app.post("/inputPrompt", async (req, res) => {
  const data = req.body?.data || "";
  try {
    // Fire-and-forget call to n8n webhook
    axios
      .post("http://localhost:5678/webhook/prompt", { chatInput: data })
      .catch((err) => console.error("n8n call failed:", err));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post("/getResponse", (req, res) => {
  try {
    let { text, image } = req.body;
    text = markdownToHTMLTable(text || "");
    latestResponse = { text, image };

    // SSE broadcast
    clients.forEach((c) =>
      c.res.write(`data: ${JSON.stringify(latestResponse)}\n\n`)
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  clients.push({ res });
  req.on("close", () => {
    const index = clients.findIndex((c) => c.res === res);
    if (index !== -1) clients.splice(index, 1);
  });
});

function markdownToHTMLTable(md) {
  const lines = md.trim().split("\n");
  if (lines.length < 2) return `<p>${md}</p>`;
  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);
  const rows = lines.slice(2).map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
  );
  let html = "<table><thead><tr>";
  headers.forEach((h) => (html += `<th>${h}</th>`));
  html += "</tr></thead><tbody>";
  rows.forEach((r) => {
    html += "<tr>";
    r.forEach((c) => (html += `<td>${c}</td>`));
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
