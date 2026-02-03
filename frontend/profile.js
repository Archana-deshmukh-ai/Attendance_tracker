// Load user data from localStorage
const name = localStorage.getItem("userName");
const email = localStorage.getItem("userEmail");

// Redirect if not logged in
if (!Name || !email) {
  window.location.href = "login.html";
}

document.getElementById("name").value = Name;
document.getElementById("email").value = email;

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
