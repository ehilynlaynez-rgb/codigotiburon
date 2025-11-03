import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import { Server } from "socket.io";
import http from "http";
import odbc from "odbc";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Multer (subida segura de imágenes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname.replace(/[^\w.\-]/g, "_"));
  },
});
const upload = multer({ storage });

// DB Connection (Access via ODBC)
const connStr = process.env.ACCESS_CONN;
let pool;
async function getPool() {
  if (!pool) pool = await odbc.pool(connStr);
  return pool;
}

// Notificaciones email (config opcional)
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail(subject, text) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.MAIL_TO || "ehilyn.laynez@gmail.com",
      subject, text
    });
  } catch (e) {
    console.error("Error enviando correo:", e.message);
  }
}

// --- Socket.IO: eventos en vivo
io.on("connection", (socket) => {
  console.log("Cliente conectado");
});

function broadcast(type, payload) {
  io.emit(type, payload);
}

// ---------------------
// Endpoints
// ---------------------

// Aulas
app.get("/api/aulas", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query("SELECT Id, Nombre, Modulo, OcupadaPor FROM Aulas ORDER BY Id");
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/aulas", async (req, res) => {
  const { Nombre, Modulo } = req.body;
  try {
    const pool = await getPool();
    await pool.query(`INSERT INTO Aulas (Nombre, Modulo, OcupadaPor) VALUES (?, ?, NULL)`, [Nombre, Modulo]);
    broadcast("aulas:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/aulas/:id", async (req, res) => {
  const { id } = req.params;
  const { Nombre, Modulo } = req.body;
  try {
    const pool = await getPool();
    await pool.query(`UPDATE Aulas SET Nombre=?, Modulo=? WHERE Id=?`, [Nombre, Modulo, id]);
    broadcast("aulas:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/aulas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.query(`DELETE FROM Recursos WHERE Aula_ID=?`, [id]);
    await pool.query(`DELETE FROM Aulas WHERE Id=?`, [id]);
    broadcast("aulas:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recursos
app.get("/api/recursos", async (req, res) => {
  const { aulaId } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT Id, Aula_ID, Tipo, Codigo, Estado FROM Recursos WHERE (? IS NULL OR Aula_ID=?) ORDER BY Id`,
      [aulaId || null, aulaId || null]
    );
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/recursos", async (req, res) => {
  const { Aula_ID, Tipo, Codigo } = req.body;
  try {
    const pool = await getPool();
    await pool.query(`INSERT INTO Recursos (Aula_ID, Tipo, Codigo, Estado) VALUES (?, ?, ?, 'OK')`, [Aula_ID, Tipo, Codigo]);
    broadcast("recursos:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/recursos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.query(`DELETE FROM Recursos WHERE Id=?`, [id]);
    broadcast("recursos:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reservas (reservar / liberar)
app.post("/api/reservas", async (req, res) => {
  const { Aula_ID, Usuario, Inicio, Fin } = req.body;
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO Reservas (Aula_ID, Usuario, FechaHoraInicio, FechaHoraFin, Estado) VALUES (?, ?, ?, ?, 'Activa')`,
      [Aula_ID, Usuario, Inicio, Fin]
    );
    await pool.query(`UPDATE Aulas SET OcupadaPor=? WHERE Id=?`, [Usuario, Aula_ID]);
    const msg = `Reserva creada para Aula ${Aula_ID} por ${Usuario} de ${Inicio} a ${Fin}`;
    await sendMail("Reserva de aula", msg);
    broadcast("reservas:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/liberar", async (req, res) => {
  const { Aula_ID } = req.body;
  try {
    const pool = await getPool();
    await pool.query(`UPDATE Reservas SET Estado='Finalizada' WHERE Aula_ID=? AND Estado='Activa'`, [Aula_ID]);
    await pool.query(`UPDATE Aulas SET OcupadaPor=NULL WHERE Id=?`, [Aula_ID]);
    const msg = `Aula ${Aula_ID} liberada`;
    await sendMail("Aula liberada", msg);
    broadcast("reservas:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reportar daño (con foto)
app.post("/api/reportes", upload.single("foto"), async (req, res) => {
  const { Aula_ID, Recurso_ID, Descripcion } = req.body;
  const fotoRuta = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO Reportes (Aula_ID, Recurso_ID, Descripcion, FotoRuta, Estado, Fecha) VALUES (?, ?, ?, ?, 'Abierto', NOW())`,
      [Aula_ID, Recurso_ID || null, Descripcion, fotoRuta]
    );
    await pool.query(`UPDATE Recursos SET Estado='Dañado' WHERE Id=?`, [Recurso_ID]);
    await sendMail("Reporte de recurso dañado", `Aula ${Aula_ID}, Recurso ${Recurso_ID}: ${Descripcion}`);
    broadcast("reportes:update", {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reparación (solo técnico)
app.post("/api/reparaciones", async (req, res) => {
  const { Reporte_ID, Tecnico } = req.body;
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO Reparaciones (Reporte_ID, Tecnico, Fecha, Estado) VALUES (?, ?, NOW(), 'Reparado')`,
      [Reporte_ID, Tecnico]
    );
    // Cerrar reporte y marcar recurso OK
    const r = await pool.query(`SELECT Recurso_ID FROM Reportes WHERE Id=?`, [Reporte_ID]);
    const recursoId = r.length ? r[0].Recurso_ID : null;
    if (recursoId) {
      await pool.query(`UPDATE Recursos SET Estado='OK' WHERE Id=?`, [recursoId]);
    }
    await pool.query(`UPDATE Reportes SET Estado='Cerrado' WHERE Id=?`, [Reporte_ID]);
    await sendMail("Reparación completada", `Reporte ${Reporte_ID} marcado como reparado por ${Tecnico}`);
    broadcast("reparaciones:update", {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Históricos
app.get("/api/historicos", async (req, res) => {
  try {
    const pool = await getPool();
    const reservas = await pool.query(`SELECT TOP 100 * FROM Reservas ORDER BY Id DESC`);
    const reportes = await pool.query(`SELECT TOP 100 * FROM Reportes ORDER BY Id DESC`);
    const reparaciones = await pool.query(`SELECT TOP 100 * FROM Reparaciones ORDER BY Id DESC`);
    res.json({ reservas, reportes, reparaciones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => console.log("Backend escuchando en puerto", port));
