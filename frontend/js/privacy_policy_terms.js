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

// code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
// end of the code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.