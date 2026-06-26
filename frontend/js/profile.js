// Student Data (You can change this anytime)
const student = {
    name: "Rahul Kumar",
    rollNo: "22CS045",
    department: "Computer Science Engineering",
    year: "3rd Year",
    section: "A",
    email: "rahul@gmail.com",
    phone: "+91 9876543210",
    attendance: "92%",
    cgpa: "8.7"
};

// Show student data on page
document.getElementById("studentName").innerText = student.name;

// If you want to show other values dynamically (optional)
document.addEventListener("DOMContentLoaded", function () {

    const infoBoxes = document.querySelectorAll(".info-grid div");

    infoBoxes[0].innerHTML = `<span>Roll No:</span> ${student.rollNo}`;
    infoBoxes[1].innerHTML = `<span>Department:</span> ${student.department}`;
    infoBoxes[2].innerHTML = `<span>Year:</span> ${student.year}`;
    infoBoxes[3].innerHTML = `<span>Section:</span> ${student.section}`;
    infoBoxes[4].innerHTML = `<span>Email:</span> ${student.email}`;
    infoBoxes[5].innerHTML = `<span>Phone:</span> ${student.phone}`;
    infoBoxes[6].innerHTML = `<span>Attendance:</span> ${student.attendance}`;
    infoBoxes[7].innerHTML = `<span>CGPA:</span> ${student.cgpa}`;
});


// Edit Profile Button Function
document.querySelector(".edit-btn").addEventListener("click", function () {
    alert("Edit Profile Feature Coming Soon!");
});

// code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
// end of the code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.