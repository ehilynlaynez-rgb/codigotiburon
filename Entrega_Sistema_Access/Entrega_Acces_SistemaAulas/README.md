# Sistema de Gestión de Aulas (Access + Node + Frontend)

Este paquete incluye:
- **PowerShell** (`scripts/CreateAccessDb.ps1`) para **generar** localmente en Windows el archivo **Access** `data/aulas.accdb`, crear tablas y **sembrar** toda la información que me diste.
- **Backend Node.js** (Express + Socket.IO + node-odbc + multer + nodemailer) con endpoints REST y notificaciones por correo.
- **Frontend** con `index.html`, `dashboard.html`, `aula.html`, `styles.css`, `script.js`.
- **CSV/SQL** de respaldo en `data/` por si prefieres importar manualmente a Access.

> Nota importante: aquí no puedo adjuntar un `.accdb` ya creado, porque se necesita el motor de Access
  en Windows para fabricarlo. Por eso te dejo un script de PowerShell que lo crea **en tu máquina** con un click.

## Cómo dejar todo corriendo (Windows)

1) **Instala** el motor ODBC de Access si no lo tienes:
   - *Microsoft Access Database Engine 2016 Redistributable* (x64)  
   - Asegúrate de que concuerde con la arquitectura de tu Node (x64).

2) **Crea la base de datos Access con datos**:
   - Abre **PowerShell** como Administrador en la carpeta del proyecto.
   - Ejecuta:  
     ```powershell
     ./scripts/CreateAccessDb.ps1
     ```
   - Esto generará `data/aulas.accdb` con tablas, índices y **todos los registros** ya insertados.

3) **Backend**:
   - Entra a `backend/` y ejecuta:
     ```bash
     npm install
     npm start
     ```
   - Por defecto corre en `http://localhost:3001`. Revisa `.env` para ajustar:
     - `ACCESS_CONN=Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=../data/aulas.accdb;`
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (placeholders); destinatario por defecto: `ehilyn.laynez@gmail.com`

4) **Frontend**:
   - Abre `frontend/index.html` en el navegador (o usa una extensión de Live Server).
   - Inicia sesión de prueba (Admin/Técnico/Usuario) para ver permisos.
   - Conecta con el backend en `script.js` (`API_BASE` = `http://localhost:3001`).

## Funciones incluidas
- Ver aulas y recursos en tiempo real (Socket.IO): quién la ocupa y qué recursos tiene.
- **Reservar** y **liberar** aulas.
- **Registrar recursos** por aula.
- **Reportar recurso dañado** (con descripción + **subida de foto**).
- **Dashboard** con estado en vivo.
- **Históricos** de reservas, reportes y reparaciones.
- **Notificaciones por correo**: al reservar/liberar, cuando se reporta daño y cuando se marca reparación.
- **Permisos**:
  - **Técnicos** pueden marcar “reparado”.
  - **Admins** pueden gestionar todo.
- CRUD de **Aulas** y **Recursos**.

> Si lo quieres subir a GitHub, sube todo excepto `data/aulas.accdb` (puede ser pesado) y/o añade un `.gitignore`.
> El script de PowerShell garantiza que cualquiera pueda regenerar la base de datos con los datos de ejemplo.
