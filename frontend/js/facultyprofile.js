window.onload = function () {

    let faculty = {
        name: "Dr. Archana Rao",
        department: "Computer Science & Engineering",
        email: "archana@college.edu",
        id: "FAC10234",
        experience: "12 Years",
        subjects: 5,
        students: 120,
        reports: 12
    };

    document.getElementById("lecName").innerText = faculty.name;
    document.getElementById("lecDept").innerText = faculty.department;
    document.getElementById("lecEmail").innerText = faculty.email;
    document.getElementById("lecID").innerText = faculty.id;
    document.getElementById("lecExp").innerText = faculty.experience;

    document.getElementById("subjects").innerText = faculty.subjects;
    document.getElementById("students").innerText = faculty.students;
    document.getElementById("reports").innerText = faculty.reports + " Generated";
};
