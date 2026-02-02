let tableData = [];
let present = 0;
let absent = 0;
let late = 0;
let dateCount = {};

fetch("./students.csv")
    .then(res => res.text())
    .then(data => {
        const rows = data.trim().split("\n").slice(1);

        rows.forEach(row => {
            const cols = row.split(",");

            tableData.push(cols);

            const date = cols[5];
            const status = cols[6];

            if (status === "Present") present++;
            if (status === "Absent") absent++;
            if (status === "Late") late++;

            if (!dateCount[date]) dateCount[date] = 0;
            if (status === "Present") dateCount[date]++;
        });

        loadTable();
        loadStatusChart();
        loadTrendChart();
    });

function loadTable() {
    const tbody = document.querySelector("#reportTable tbody");

    tableData.forEach(row => {
        const tr = document.createElement("tr");

        row.forEach((cell, index) => {
            const td = document.createElement("td");
            td.textContent = cell;

            if (index === 6) {
                td.className =
                    cell === "Present" ? "present" :
                    cell === "Absent" ? "absent" : "late";
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function loadStatusChart() {
    new Chart(document.getElementById("statusChart"), {
        type: "bar",
        data: {
            labels: ["Present", "Absent", "Late"],
            datasets: [{
                label: "Attendance Count",
                data: [present, absent, late],
                backgroundColor: ["green", "red", "orange"]
            }]
        }
    });
}

function loadTrendChart() {
    new Chart(document.getElementById("trendChart"), {
        type: "line",
        data: {
            labels: Object.keys(dateCount),
            datasets: [{
                label: "Students Present",
                data: Object.values(dateCount),
                borderColor: "blue",
                fill: false
            }]
        }
    });
}
