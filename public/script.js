function showLogin() {
  document.getElementById("slider").style.transform = "translateX(0%)";
  document.getElementById("loginToggle").classList.add("active");
  document.getElementById("signupToggle").classList.remove("active");
}

function showSignup() {
  document.getElementById("slider").style.transform = "translateX(-50%)";
  document.getElementById("signupToggle").classList.add("active");
  document.getElementById("loginToggle").classList.remove("active");
}

document.getElementById("login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.success) {
    window.location.href = "/home.html";
  } else {
    alert("Login failed.");
  }
});

document.getElementById("signup")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.success) {
    alert("Signup successful! Please login.");
    showLogin();
  } else {
    alert("Signup failed.");
  }
});

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

  resume.textContent = "Generating resume...";
  coverLetter.textContent = "Generating cover letter...";
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
      resume.textContent = data.resume;
      coverLetter.textContent = data.coverLetter;
      output.scrollIntoView({ behavior: "smooth" });
    } else {
      throw new Error(data.error || "Generation failed");
    }
  } catch (err) {
    error.textContent = "❌ " + err.message;
  }
});

function downloadTextFile(filename, textContent) {
  const blob = new Blob([textContent], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById("downloadResume")?.addEventListener("click", () => {
  const text = document.getElementById("resume").textContent;
  downloadTextFile("Resume.txt", text);
});

document.getElementById("downloadCover")?.addEventListener("click", () => {
  const text = document.getElementById("coverLetter").textContent;
  downloadTextFile("CoverLetter.txt", text);
});
