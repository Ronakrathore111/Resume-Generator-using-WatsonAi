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

  const prompt = `Create a professional Resume and Cover Letter in the exact format below:

[Resume]
<resume content>

[Cover Letter]
<cover letter content>

Details:
Name: ${name}
Education: ${education}
Experience: ${experience}
Job Role: ${jobRole}`;

  try {
    const token = await getIBMIAMToken(process.env.IBM_API_KEY);

    const response = await axios.post(
      'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-01',
      {
        model_id: 'meta-llama/llama-2-13b-chat',
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 800,
        },
        project_id: process.env.IBM_PROJECT_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const output = response.data.results[0]?.generated_text || '';
    let resume = '', coverLetter = '';

    const coverIndex = output.search(/(\[Cover Letter\]|Cover Letter Content:|Cover Letter:)/i);
    if (coverIndex !== -1) {
      resume = output.slice(0, coverIndex).replace(/\[Resume\]/i, '').trim();
      coverLetter = output.slice(coverIndex).replace(/(\[Cover Letter\]|Cover Letter Content:|Cover Letter:)/i, '').trim();
    } else {
      resume = output.trim();
    }
    const secondResumeIndex = resume.toLowerCase().indexOf("resume:", 10);
    if (secondResumeIndex !== -1) {
      resume = resume.slice(0, secondResumeIndex).trim();
    }

    const skillMatches = [...resume.matchAll(/Skills:/gi)];
    if (skillMatches.length > 1) {
      const secondSkillIndex = skillMatches[1].index;
      resume = resume.slice(0, secondSkillIndex).trim();
    }

    res.json({
      resume,
      coverLetter: coverLetter || "Cover letter not generated.",
    });
  } catch (err) {
    console.error('❌ IBM API Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Generation failed or model limit exceeded. Please try later.',
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
