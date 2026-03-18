const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./inventory.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      stock INTEGER
    )
  `);
});

module.exports = db;
let chart;

async function loadItems() {
  const res = await fetch("/items");
  const data = await res.json();

  const list = document.getElementById("list");
  list.innerHTML = "";

  let names = [];
  let stocks = [];

  data.forEach(item => {
    list.innerHTML += `
      <li>
        ${item.name} (${item.stock})
        <button onclick="deleteItem(${item.id})">Hapus</button>
      </li>
    `;
    names.push(item.name);
    stocks.push(item.stock);
  });

  renderChart(names, stocks);
}

function renderChart(names, stocks) {
  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: names,
      datasets: [{
        label: "Stok Barang",
        data: stocks
      }]
    }
  });
}
async function exportExcel() {
  const res = await fetch("/items");
  const data = await res.json();

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

  XLSX.writeFile(workbook, "inventory.xlsx");
}
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      stock INTEGER,
      min_stock INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      qty INTEGER,
      type TEXT, -- IN / OUT
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});
async function addItem() {
  const name = document.getElementById("name").value;
  const stock = document.getElementById("stock").value;
  const min_stock = document.getElementById("min_stock").value;

  await fetch("/items", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, stock, min_stock })
  });

  loadItems();
}
data.forEach(item => {
  let warning = "";

  if (item.stock <= item.min_stock) {
    warning = "⚠️ STOK MENIPIS!";
  }

  list.innerHTML += `
    <li>
      ${item.name} (${item.stock}) ${warning}
      <button onclick="useItem(${item.id})">Pakai</button>
    </li>
  `;
});
async function useItem(id) {
  const qty = prompt("Jumlah dipakai:");
  
  await fetch("/update-stock", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      id: id,
      qty: parseInt(qty),
      type: "OUT"
    })
  });

  loadItems();
}
async function loadHistory(itemId) {
  const res = await fetch("/history/" + itemId);
  const data = await res.json();

  let labels = data.map(d => d.date);
  let qty = data.map(d => d.qty);

  renderChart(labels, qty);
}