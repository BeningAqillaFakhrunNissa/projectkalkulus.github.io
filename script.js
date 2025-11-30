let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = localStorage.getItem("currentUser");
let saldo = 0, pengeluaranHariIni = 0, pemasukanHariIni = 0, limitHarian = 100000;

const saldoEl = document.getElementById("saldo");
const pengeluaranEl = document.getElementById("pengeluaran");
const pemasukanEl = document.getElementById("pemasukan");
const limitTeks = document.getElementById("limitTeks");
const peringatanEl = document.getElementById("peringatan");
const tabelRiwayat = document.getElementById("tabelRiwayat");

if (currentUser) showPage("dashboardPage");

// ================== HALAMAN ==================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById("navBar").style.display =
    (id === "dashboardPage" || id === "transaksiPage") ? "flex" : "none";
}

// ================== SIGNUP ==================
function signup() {
  const user = document.getElementById("newUser").value;
  const pass = document.getElementById("newPass").value;

  if (users.find(u => u.user === user)) {
    alert("Username sudah digunakan!");
    return;
  }

  users.push({ user, pass, saldo: 0, limit: 100000, transaksi: [] });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Akun berhasil dibuat!");
  showPage("loginPage");
}

// ================== LOGIN ==================
function login() {
  const user = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPass").value;

  const found = users.find(u => u.user === user && u.pass === pass);

  if (found) {
    currentUser = user;
    localStorage.setItem("currentUser", user);

    // Reset semua data sebelum load user baru
    saldo = found.saldo;
    limitHarian = found.limit;
    pengeluaranHariIni = 0;
    pemasukanHariIni = 0;

    // Reset chart
    chartKeuangan.data.labels = [];
    chartKeuangan.data.datasets[0].data = [];
    chartKeuangan.data.datasets[1].data = [];
    chartKeuangan.update();

    // Reset tabel riwayat
    tabelRiwayat.innerHTML = `<tr><th>Waktu</th><th>Jenis</th><th>Jumlah</th></tr>`;

    limitTeks.textContent = formatRupiah(limitHarian);

    // Load riwayat transaksi user
    loadRiwayat(found.transaksi);

    updateDashboard();
    showPage("dashboardPage");
  } else {
    alert("Username atau password salah!");
  }
}

// ================== LOGOUT ==================
function logout() {
  localStorage.removeItem("currentUser");
  currentUser = null;
  showPage("loginPage");
}

// ================== FORMAT ==================
function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

function formatInputRupiah(el) {
  let angka = el.value.replace(/[^\d]/g, "");
  el.value = angka ? "Rp " + parseInt(angka).toLocaleString("id-ID") : "";
}

function parseRupiah(str) {
  return parseInt(str.replace(/[^0-9]/g, "")) || 0;
}

// ================== CHART ==================
const ctx = document.getElementById("chartKeuangan").getContext("2d");

const gradientPemasukan = ctx.createLinearGradient(0, 0, 0, 200);
gradientPemasukan.addColorStop(0, '#42a5f5');
gradientPemasukan.addColorStop(1, '#90caf9');

const gradientPengeluaran = ctx.createLinearGradient(0, 0, 0, 200);
gradientPengeluaran.addColorStop(0, '#f48fb1');
gradientPengeluaran.addColorStop(1, '#f8bbd0');

const chartKeuangan = new Chart(ctx, {
  type: "bar",
  data: { labels: [], datasets: [
    { label: "Pemasukan", data: [], backgroundColor: gradientPemasukan },
    { label: "Pengeluaran", data: [], backgroundColor: gradientPengeluaran }
  ]},
  options: { responsive: true }
});

function updateChart() {
  const today = new Date().toLocaleDateString("id-ID");
  let idx = chartKeuangan.data.labels.indexOf(today);

  if (idx === -1) {
    chartKeuangan.data.labels.push(today);
    chartKeuangan.data.datasets[0].data.push(pemasukanHariIni);
    chartKeuangan.data.datasets[1].data.push(pengeluaranHariIni);
  } else {
    chartKeuangan.data.datasets[0].data[idx] = pemasukanHariIni;
    chartKeuangan.data.datasets[1].data[idx] = pengeluaranHariIni;
  }

  chartKeuangan.update();
}

// ================== TRANSAKSI ==================
document.getElementById("formTransaksi").addEventListener("submit", (e) => {
  e.preventDefault();

  const jenis = document.getElementById("jenis").value;
  const jumlah = parseRupiah(document.getElementById("jumlah").value);
  peringatanEl.textContent = "";

  if (jenis === "isi") {
    saldo += jumlah;
    pemasukanHariIni += jumlah;
    tambahRiwayat("Pemasukan", jumlah, "plus");
  } else {
    if (pengeluaranHariIni + jumlah > limitHarian) {
      peringatanEl.textContent = "❌ Melebihi limit harian";
      return;
    }

    if (saldo - jumlah < 0) {
      peringatanEl.textContent = "❌ Saldo tidak cukup!";
      return;
    }

    saldo -= jumlah;
    pengeluaranHariIni += jumlah;
    tambahRiwayat("Pengeluaran", -jumlah, "minus");
  }

  updateDashboard();
  saveData();
  e.target.reset();
});

// ================== LIMIT ==================
document.getElementById("formLimit").addEventListener("submit", (e) => {
  e.preventDefault();
  const newLimit = parseRupiah(document.getElementById("inputLimit").value);

  if (newLimit > 0) {
    limitHarian = newLimit;
    limitTeks.textContent = formatRupiah(limitHarian);
    peringatanEl.textContent = "Limit diperbarui!";
    saveData();
  }
  e.target.reset();
});

// ================== RIWAYAT ==================
function tambahRiwayat(jenis, jumlah, cssClass) {
  const row = tabelRiwayat.insertRow(1); // selalu di bawah header (paling atas)
  const waktu = new Date().toLocaleString("id-ID");

  row.insertCell(0).textContent = waktu;
  row.insertCell(1).textContent = jenis;

  const cellJumlah = row.insertCell(2);
  cellJumlah.textContent = (jumlah > 0 ? "+" : "") + formatRupiah(Math.abs(jumlah));
  cellJumlah.className = cssClass;

  updateChart();
}

function loadRiwayat(list) {
  if (!Array.isArray(list)) return;

  // Loop dari awal ke akhir, insertRow(1) pastikan transaksi terbaru di atas
  list.forEach(item => {
    tambahRiwayat(item.jenis, item.jumlah, item.jumlah > 0 ? "plus" : "minus");
  });
}

// ================== DASHBOARD ==================
function updateDashboard() {
  saldoEl.textContent = formatRupiah(saldo);
  pengeluaranEl.textContent = formatRupiah(pengeluaranHariIni);
  pemasukanEl.textContent = formatRupiah(pemasukanHariIni);
}

// ================== SAVE DATA ==================
function saveData() {
  const idx = users.findIndex(u => u.user === currentUser);
  if (idx !== -1) {
    users[idx].saldo = saldo;
    users[idx].limit = limitHarian;
    users[idx].transaksi = [];

    for (let i = 1; i < tabelRiwayat.rows.length; i++) {
      users[idx].transaksi.push({
        jenis: tabelRiwayat.rows[i].cells[1].textContent,
        jumlah: parseRupiah(tabelRiwayat.rows[i].cells[2].textContent)
      });
    }

    localStorage.setItem("users", JSON.stringify(users));
  }
}
