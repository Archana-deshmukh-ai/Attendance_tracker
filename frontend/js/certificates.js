fetch("certificates_data.json")
.then(res => res.json())
.then(data => {
    let container = document.getElementById("certificatesContainer");
    document.getElementById("totalCert").innerText = data.length;

    let avg = data.reduce((a,b)=>a+b.percentage,0)/data.length;
    document.getElementById("attendance").innerText = avg.toFixed(2)+"%";

    data.forEach(cert => {
        let div = document.createElement("div");
        div.className = `cert-card ${cert.badge}`;
        div.innerHTML = `
        <h3>${cert.type}</h3>
        <p>Certificate ID: ${cert.id}</p>
        <p>Issued Date: ${cert.date}</p>
        <p>Attendance: ${cert.percentage}%</p>
        <button onclick="viewCert('${cert.id}')">👁 View</button>
        <button onclick="downloadCert('${cert.id}')">📥 Download</button>
        <button onclick="verifyCert('${cert.id}')">✅ Verify</button>
        `;
        container.appendChild(div);
    });
});

// Search Function
document.getElementById("searchBox").addEventListener("input", function() {
    let value = this.value.toLowerCase();
    document.querySelectorAll(".cert-card").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(value) ? "block" : "none";
    });
});

function viewCert(id){
    alert("Viewing Certificate " + id);
}

function downloadCert(id){
    alert("Download Certificate " + id);
}

function verifyCert(id){
    alert("Certificate " + id + " is VALID ✔");
}

function generateCertificate() {
    fetch("http://127.0.0.1:5000/generate_certificate", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            name: "Grace",
            student_id: "13466769",
            attendance: 96
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        console.log(data);
    });
}