require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔐 IBM Token
async function getIBMIAMToken(apiKey) {
  try {
    const response = await axios.post(
      'https://iam.cloud.ibm.com/identity/token',
      qs.stringify({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('❌ Failed to fetch IAM token:', err.response?.data || err.message);
    throw new Error('Token request failed');
  }
}

// 🔐 User Auth
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync('users.json'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'Email already registered' });
  }

  users.push({ email, password });
  saveUsers(users);
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email && u.password === password);
  res.json({ success: !!user, message: user ? null : 'Invalid credentials' });
});

// ✍️ Resume + Cover Letter Generation
app.post('/generate', async (req, res) => {
  const { name, education, experience, jobRole } = req.body;

  const prompt = `
You are a professional AI assistant that creates job-specific resumes and cover letters.

Please create the following documents based on the user-provided information:
- A clean, formal **Resume**
- A well-crafted **Cover Letter**

Use this user info:
- Name: ${name}
- Education: ${education}
- Experience: ${experience}
- Target Job Role: ${jobRole}

Structure the output like this:

Resume:
[Insert professional resume with bullets, sections like Summary, Education, Experience, Skills]

Cover Letter:
[Insert cover letter with proper salutation, paragraphs and signature]
`;

  try {
    const token = await getIBMIAMToken(process.env.IBM_API_KEY);

    const response = await axios.post(
      'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-01',
      {
        model_id: "mistralai/mixtral-8x7b-instruct-v01",
        input: prompt,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 1000,
        },
        project_id: process.env.IBM_PROJECT_ID
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const output = response.data.results[0]?.generated_text || "";
    const [resume, coverLetter] = output.split(/Cover Letter:/i);

    res.json({
      resume: resume?.replace(/^Resume:/i, '').trim(),
      coverLetter: coverLetter?.trim() || "Cover letter not found.",
    });

  } catch (err) {
    console.error('❌ IBM API Error:', err.response?.data || err.message);
    res.status(500).json({ error: "Generation failed or model limit exceeded. Please try again." });
  }
});


app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
