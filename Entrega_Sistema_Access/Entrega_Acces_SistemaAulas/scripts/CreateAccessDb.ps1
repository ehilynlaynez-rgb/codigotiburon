Param(
  [string]$OutputPath = "../data/aulas.accdb"
)

# Crea una BD Access usando COM de Access (requiere Microsoft Access instalado o Access Runtime)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$schema = Get-Content "../data/schema.sql" -Raw
$seed   = Get-Content "../data/seed.sql" -Raw

# Si existe, eliminar
$fullPath = Resolve-Path $OutputPath -ErrorAction SilentlyContinue
if ($fullPath) {
  Remove-Item $fullPath -Force
}
$OutputPath = (Resolve-Path "../data").Path + "\aulas.accdb"

# Crear la BD
$access = New-Object -ComObject Access.Application
$provider = "Microsoft.ACE.OLEDB.12.0"
$connectionString = "Provider=$provider;Data Source=$OutputPath;Persist Security Info=False;"
$catalog = New-Object -ComObject ADOX.Catalog
$catalog.Create($connectionString)

# Abrir la base para ejecutar SQL
$access.OpenCurrentDatabase($OutputPath)

# Ejecutar schema (separar por ';')
$stmts = $schema -split ";\s*`r?`n"
foreach ($s in $stmts) {
  $t = $s.Trim()
  if ($t.Length -gt 0) {
    try { $access.DoCmd.RunSQL($t) } catch { Write-Host "WARN schema:" $_.Exception.Message }
  }
}

# Ejecutar seed
$stmts2 = $seed -split ";\s*`r?`n"
foreach ($s in $stmts2) {
  $t = $s.Trim()
  if ($t.Length -gt 0) {
    try { $access.DoCmd.RunSQL($t) } catch { Write-Host "WARN seed:" $_.Exception.Message }
  }
}

$access.CloseCurrentDatabase()
$access.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($access) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Base de datos creada en $OutputPath"
