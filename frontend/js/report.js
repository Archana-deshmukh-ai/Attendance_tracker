let tableData = [];
let presentCount = 0;
let absentCount = 0;
let lateCount = 0;
let dateMap = {};

fetch("students.csv")
    .then(res => res.text())
    .then(data => {
        const rows = data.trim().split("\n").slice(1);

        rows.forEach(row => {
            const cols = row.split(",");
            if (cols.length === 5) {
                tableData.push(cols);

                const status = cols[4];
                const date = cols[3];

                if (status === "Present") presentCount++;
                if (status === "Absent") absentCount++;
                if (status === "Late") lateCount++;

                if (!dateMap[date]) dateMap[date] = 0;
                if (status === "Present") dateMap[date]++;
            }
        });

        displayTable(tableData);
        loadStatusChart();
        loadTrendChart();
    });

function displayTable(data) {
    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        row.forEach((cell, i) => {
            const td = document.createElement("td");
            td.textContent = cell;

            if (i === 4) {
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
                data: [presentCount, absentCount, lateCount]
            }]
        }
    });
}

function loadTrendChart() {
    new Chart(document.getElementById("trendChart"), {
        type: "line",
        data: {
            labels: Object.keys(dateMap),
            datasets: [{
                label: "Students Present",
                data: Object.values(dateMap),
                fill: false
            }]
        }
    });
}
