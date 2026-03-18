const express = require("express");
const db = require("./db");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// GET all items
app.get("/items", (req, res) => {
  db.all("SELECT * FROM items", [], (err, rows) => {
    res.json(rows);
  });
});
// ADD item
app.post("/items", (req, res) => {
  const { part_name, part_number, quantity, min_stock } = req.body;

  db.run(
    "INSERT INTO items (part_name, part_number, quantity, min_stock VALUES (?, ?, ?, ?)",
    [part_name, part_number, quantity, min_stock]
  );

  res.json({ message: "Part added" });
});
// DELETE item
app.delete("/items/:id", (req, res) => {
  db.run("DELETE FROM items WHERE id=?", [req.params.id]);
  res.json({ message: "Deleted" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
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
app.post("/items", (req, res) => {
  const { name, stock, min_stock } = req.body;
  db.run(
    "INSERT INTO items (name, stock, min_stock) VALUES (?, ?, ?)",
    [name, stock, min_stock]
  );
  res.json({ message: "Item added" });
});
app.post("/update-stock", (req, res) => {
  const { id, qty, type } = req.body;

  const change = type === "IN" ? qty : -qty;

  db.run(
    "UPDATE items SET stock = stock + ? WHERE id=?",
    [change, id]
  );

  db.run(
    "INSERT INTO history (item_id, qty, type) VALUES (?, ?, ?)",
    [id, qty, type]
  );

  res.json({ message: "Stock updated" });
});
app.get("/history/:id", (req, res) => {
  db.all(
    "SELECT * FROM history WHERE item_id=? ORDER BY date",
    [req.params.id],
    (err, rows) => res.json(rows)
  );
});
async function addItem() {
  const part_name = document.getElementById("part_name").value;
  const part_number = document.getElementById("part_number").value;
  const quantity = document.getElementById("quantity").value;
  const min_stock = document.getElementById("min_stock").value;

  await fetch("/items", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      part_name,
      part_number,
      quantity,
      min_stock
    })
  });

  loadItems();
}async function useItem(id) {
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
data.forEach(item => {
  let warning = "";

  if (item.quantity <= item.min_stock) {
    warning = "⚠️ Stok Minimum!";
  }

  list.innerHTML += `
    <li>
      <b>${item.part_name}</b><br>
      No: ${item.part_number}<br>
      Qty: ${item.quantity} ${warning}
    </li>
  `;
});