// 🔄 Toggle Login & Signup
document.querySelector(".toggle-signup")?.addEventListener("click", () => {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("signupSection").style.display = "block";
});

document.querySelector(".toggle-login")?.addEventListener("click", () => {
  document.getElementById("signupSection").style.display = "none";
  document.getElementById("loginSection").style.display = "block";
});

// 🔐 Handle Login
document.getElementById("login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.success) {
      window.location.href = "/home.html";
    } else {
      alert(data.message || "Login failed. Please check your credentials.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ✍️ Handle Signup
document.getElementById("signup")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  try {
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.success) {
      alert("Signup successful! Please login.");
      document.getElementById("signupSection").style.display = "none";
      document.getElementById("loginSection").style.display = "block";
    } else {
      alert(data.message || "Signup failed. Try a different email.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// 🤖 Resume & Cover Letter Generator
document.getElementById("resumeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const education = document.getElementById("education").value.trim();
  const experience = document.getElementById("experience").value.trim();
  const jobRole = document.getElementById("jobRole").value.trim();

  const output = document.getElementById("output");
  const resume = document.getElementById("resume");
  const coverLetter = document.getElementById("coverLetter");
  const error = document.getElementById("error");

  resume.innerHTML = "<pre>Generating resume...</pre>";
  coverLetter.innerHTML = "<pre>Generating cover letter...</pre>";
  error.textContent = "";
  output.style.display = "block";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, education, experience, jobRole }),
    });

    const data = await response.json();

    if (response.ok) {
      resume.innerHTML = `<pre>${data.resume?.trim() || "Resume not generated."}</pre>`;
      coverLetter.innerHTML = `<pre>${data.coverLetter?.trim() || "Cover letter not generated."}</pre>`;
      output.scrollIntoView({ behavior: "smooth" });
    } else {
      throw new Error(data.error || "Failed to generate content.");
    }
  } catch (err) {
    resume.innerHTML = "";
    coverLetter.innerHTML = "";
    error.textContent = "❌ " + err.message;
  }
});

// 📥 Download PDF
function downloadAsPDF(title, content) {
  const win = window.open('', '', 'height=700,width=700');
  win.document.write(`
    <html>
      <head><title>${title}</title></head>
      <body style="font-family:Arial;padding:20px;">
        <h1>${title}</h1>
        <pre style="white-space:pre-wrap;">${content}</pre>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}

document.getElementById("downloadResume")?.addEventListener("click", () => {
  const text = document.getElementById("resume").textContent.trim();
  if (!text || text.includes("not generated")) {
    alert("No resume available to download.");
  } else {
    downloadAsPDF("Resume", text);
  }
});

document.getElementById("downloadCover")?.addEventListener("click", () => {
  const text = document.getElementById("coverLetter").textContent.trim();
  if (!text || text.includes("not generated")) {
    alert("No cover letter available to download.");
  } else {
    downloadAsPDF("Cover Letter", text);
  }
});
