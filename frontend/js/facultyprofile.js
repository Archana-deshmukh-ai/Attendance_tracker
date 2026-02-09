// Load faculty data when page loads
window.onload = function () {
    const facultyData = JSON.parse(localStorage.getItem("facultyProfile"));

    if (facultyData) {
        document.getElementById("facultyName").innerText = facultyData.name;
        document.getElementById("email").value = facultyData.email;
        document.getElementById("department").value = facultyData.department;
        document.getElementById("designation").value = facultyData.designation;
        document.getElementById("phone").value = facultyData.phone;
    }
};

// Save profile data
function saveProfile() {
    const facultyProfile = {
        name: document.getElementById("facultyName").innerText,
        email: document.getElementById("email").value,
        department: document.getElementById("department").value,
        designation: document.getElementById("designation").value,
        phone: document.getElementById("phone").value
    };

    localStorage.setItem("facultyProfile", JSON.stringify(facultyProfile));

    alert("Faculty profile saved successfully ✅");
}
