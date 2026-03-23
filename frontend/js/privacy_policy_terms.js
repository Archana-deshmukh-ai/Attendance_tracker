const agreeCheck = document.getElementById("agreeCheck");
const agreeBtn = document.getElementById("agreeBtn");
const backBtn = document.getElementById("backBtn");

// Enable agree button
agreeCheck.addEventListener("change", function () {
  if (this.checked) {
    agreeBtn.disabled = false;
    agreeBtn.style.opacity = "1";
    agreeBtn.style.cursor = "pointer";
  } else {
    agreeBtn.disabled = true;
    agreeBtn.style.opacity = "0.5";
    agreeBtn.style.cursor = "not-allowed";
  }
});

// Agree button action
agreeBtn.addEventListener("click", function () {
  alert("You accepted the Privacy Policy!");
  window.location.href = "signup.html"; // go back to signup
});

// Go back button
backBtn.addEventListener("click", function () {
  window.location.href = "signup.html";
});
