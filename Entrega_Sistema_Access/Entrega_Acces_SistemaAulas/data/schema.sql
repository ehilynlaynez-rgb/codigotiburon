-- Esquema para Access (JET/ACE)
CREATE TABLE Aulas (
  Id AUTOINCREMENT PRIMARY KEY,
  Nombre TEXT(255),
  Modulo TEXT(50),
  OcupadaPor TEXT(100)
);

CREATE TABLE Recursos (
  Id AUTOINCREMENT PRIMARY KEY,
  Aula_ID LONG,
  Tipo TEXT(50),
  Codigo TEXT(100),
  Estado TEXT(20),
  FOREIGN KEY (Aula_ID) REFERENCES Aulas(Id)
);

CREATE TABLE Reservas (
  Id AUTOINCREMENT PRIMARY KEY,
  Aula_ID LONG,
  Usuario TEXT(100),
  FechaHoraInicio DATETIME,
  FechaHoraFin DATETIME,
  Estado TEXT(20)
);

CREATE TABLE Reportes (
  Id AUTOINCREMENT PRIMARY KEY,
  Aula_ID LONG,
  Recurso_ID LONG,
  Descripcion TEXT(255),
  FotoRuta TEXT(255),
  Estado TEXT(20),
  Fecha DATETIME
);

CREATE TABLE Reparaciones (
  Id AUTOINCREMENT PRIMARY KEY,
  Reporte_ID LONG,
  Tecnico TEXT(100),
  Fecha DATETIME,
  Estado TEXT(20)
);

CREATE INDEX idx_recursos_aula ON Recursos(Aula_ID);
CREATE INDEX idx_reservas_aula ON Reservas(Aula_ID);
CREATE INDEX idx_reportes_aula ON Reportes(Aula_ID);
