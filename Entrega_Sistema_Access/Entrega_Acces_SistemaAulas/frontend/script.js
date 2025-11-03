const API_BASE = "http://localhost:3001";

function me(){
  return { usuario: localStorage.getItem('usuario')||'demo', rol: localStorage.getItem('rol')||'usuario' };
}

async function api(path, opts={}){
  const r = await fetch(`${API_BASE}${path}`, opts);
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

function initDashboard(){
  const { usuario, rol } = me();
  document.getElementById('who').textContent = `${usuario} (${rol})`;

  const socket = io(API_BASE);
  const refresh = () => {
    api('/api/aulas').then(drawAulas).catch(console.error);
    api('/api/historicos').then(h => {
      document.getElementById('hist').textContent = JSON.stringify(h, null, 2);
    });
  };
  refresh();
  ['aulas:update','recursos:update','reservas:update','reportes:update','reparaciones:update'].forEach(ev=>{
    socket.on(ev, refresh);
  });
}

function drawAulas(rows){
  const el = document.getElementById('aulas');
  el.innerHTML = '';
  rows.forEach(a => {
    const div = document.createElement('div');
    div.className = 'aula';
    const busy = !!a.OcupadaPor;
    div.innerHTML = `<div><b>#${a.Id} · ${a.Nombre}</b><div class="kv">Módulo: ${a.Modulo||''}</div></div>
      <div class="badge ${busy?'busy':'ok'}">${busy ? 'Ocupada por '+a.OcupadaPor : 'Libre'}</div>
      <button onclick="go(${a.Id}, '${a.Nombre.replace(/'/g,"\\'")}')">Abrir</button>`;
    el.appendChild(div);
  });
}

function go(id, nombre){
  localStorage.setItem('aulaId', id);
  localStorage.setItem('aulaNombre', nombre);
  location.href = 'aula.html';
}

function initAula(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  const aulaNombre = localStorage.getItem('aulaNombre');
  document.getElementById('title').textContent = `Aula #${aulaId} · ${aulaNombre}`;
  refreshRecursos();
  listReportes();
}

function refreshRecursos(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  api(`/api/recursos?aulaId=${aulaId}`).then(rows => {
    const el = document.getElementById('recursos');
    el.innerHTML = rows.map(r => `<div>#${r.Id} · ${r.Tipo} · ${r.Codigo} · <span class="badge ${r.Estado==='OK'?'ok':'busy'}">${r.Estado}</span></div>`).join('');
  });
}

async function addRecurso(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  const Tipo = document.getElementById('tipo').value;
  const Codigo = document.getElementById('codigo').value;
  await api('/api/recursos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ Aula_ID:aulaId, Tipo, Codigo })});
  document.getElementById('tipo').value=''; document.getElementById('codigo').value='';
  refreshRecursos();
}

async function reservar(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  const { usuario } = me();
  const Inicio = document.getElementById('inicio').value;
  const Fin = document.getElementById('fin').value;
  await api('/api/reservas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ Aula_ID:aulaId, Usuario:usuario, Inicio, Fin })});
  alert('Reservada!');
}

async function liberar(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  await api('/api/liberar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ Aula_ID:aulaId })});
  alert('Liberada!');
}

async function reportar(){
  const aulaId = Number(localStorage.getItem('aulaId'));
  const Recurso_ID = document.getElementById('recursoId').value || '';
  const Descripcion = document.getElementById('desc').value;
  const foto = document.getElementById('foto').files[0];

  const fd = new FormData();
  fd.append('Aula_ID', aulaId);
  if (Recurso_ID) fd.append('Recurso_ID', Recurso_ID);
  fd.append('Descripcion', Descripcion);
  if (foto) fd.append('foto', foto);

  await fetch(`${API_BASE}/api/reportes`, { method: 'POST', body: fd });
  alert('Reporte enviado');
  listReportes();
}

async function listReportes(){
  const h = await api('/api/historicos');
  const repDiv = document.getElementById('reportes');
  repDiv.innerHTML = (h.reportes||[]).filter(r => r.Aula_ID == Number(localStorage.getItem('aulaId'))).map(r =>
    `<div>#${r.Id} · ${r.Descripcion} · ${r.Estado} ${r.FotoRuta?`· <a href="${API_BASE}${r.FotoRuta}" target="_blank">Foto</a>`:''}</div>`
  ).join('');
}
