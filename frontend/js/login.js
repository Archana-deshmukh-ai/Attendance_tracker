function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
        alert("No user found. Please sign up.");
        return;
    }

    if (email === storedUser.email && password === storedUser.password) {
        alert("Login successful!");
        localStorage.setItem("loggedIn", "true");
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid email or password");
    }
}
