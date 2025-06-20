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


async function getIBMIAMToken(apiKey) {
  try {
    const response = await axios.post(
      'https://iam.cloud.ibm.com/identity/token',
      qs.stringify({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('❌ Failed to fetch IAM token:', err.response?.data || err.message);
    throw new Error('Token request failed');
  }
}


function loadUsers() {
  try {
    const data = fs.readFileSync('users.json');
    return JSON.parse(data);
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
    return res.json({ success: false, message: "Email already registered" });
  }

  users.push({ email, password });
  saveUsers(users);
  res.json({ success: true });
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});


app.post('/generate', async (req, res) => {
  const { name, education, experience, jobRole } = req.body;

  const prompt = `Create a professional Resume and Cover Letter for the following:
Name: ${name}
Education: ${education}
Experience: ${experience}
Job Role: ${jobRole}

Format as:
Resume:
...

Cover Letter:
...`;

  try {
    const token = await getIBMIAMToken(process.env.IBM_API_KEY);

    const response = await axios.post(
      `https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-01`,
      {
        model_id: "ibm/granite-3-3-8b-instruct", 
        input: prompt,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 800,
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
    res.status(500).json({ error: "Generation failed or model limit exceeded. Please try later." });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
