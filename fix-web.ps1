# Run from repo root: C:\New folder\lms
# powershell -ExecutionPolicy Bypass -File .\fix-web.ps1

$ErrorActionPreference = "Stop"

# Paths to process
$codeRoots = @(
  "apps\web\src",     # TS/JS/JSX/TSX
  "apps\web",         # package.json, vite config, postcss, tsconfig, etc.
  "apps\api"          # optional
)

# File patterns
$patterns = @("*.ts","*.tsx","*.js","*.jsx","*.json","*.cjs","*.mjs","*.html","*.css")

function Get-RepoFiles {
  param($roots, $patterns)
  $all = @()
  foreach ($r in $roots) {
    if (Test-Path $r) {
      foreach ($p in $patterns) {
        $all += Get-ChildItem -Recurse -Path $r -Include $p -File
      }
    }
  }
  return $all | Sort-Object FullName -Unique
}

$files = Get-RepoFiles -roots $codeRoots -patterns $patterns
if (-not $files) {
  Write-Host "No matching files found under paths. Check repo location." -ForegroundColor Red
  exit 1
}

Write-Host "Scanning $($files.Count) files..." -ForegroundColor Cyan

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$changed = @()

foreach ($f in $files) {
  # Read raw bytes to detect BOM
  $origBytes = [System.IO.File]::ReadAllBytes($f.FullName)
  $text = [System.Text.Encoding]::UTF8.GetString($origBytes)
  $before = $text

  # Strip BOM (U+FEFF) at start if present
  if ($origBytes.Length -ge 3 -and $origBytes[0] -eq 0xEF -and $origBytes[1] -eq 0xBB -and $origBytes[2] -eq 0xBF) {
    # When decoded, a leading BOM becomes U+FEFF; remove it
    if ($text.StartsWith([char]0xFEFF)) {
      $text = $text.Substring(1)
    }
  }

  # Remove any stray U+FEFF anywhere
  $text = $text -replace "`uFEFF",""

  # Normalize smart quotes
  $text = $text -replace "[\u201C\u201D]", '"'   # “”
  $text = $text -replace "[\u2018\u2019]", "'"   # ‘’

  # Collapse doubled quotes
  $text = $text -replace '""','"'

  # Tidy typical role arrays/props and spacing
  $text = $text -replace '\[\s*"([^"]+)"\s*\]', '["$1"]'
  $text = $text -replace '"\s*,\s*"', '","'
  $text = $text -replace '\[\s+"','["'
  $text = $text -replace '"\s+\]', '"]'

  # Guard for allow={[""ROLE""]} residues
  $text = $text -replace 'allow=\{\[\s*""([A-Z_]+)""\s*\]\}', 'allow={["$1"]}'
  $text = $text -replace 'allow=\{\[\s*""([A-Z_]+)""\s*,\s*""([A-Z_]+)""\s*\]\}', 'allow={["$1","$2"]}'

  if ($text -ne $before) {
    [System.IO.File]::WriteAllText($f.FullName, $text, $utf8NoBom)
    $changed += $f.FullName
  }
}

Write-Host "✅ Cleaned files: $($changed.Count)" -ForegroundColor Green

# Report remaining suspicious patterns
Write-Host "`n🔎 Looking for doubled-quote arrays like [""STUDENT""] ..." -ForegroundColor Cyan
$badArrays = @()
foreach ($f in $files) {
  $i = 0
  Get-Content $f.FullName | ForEach-Object {
    $i++
    if ($_ -match '\[""[A-Z_]+""') {
      $badArrays += "{0}:{1}: {2}" -f $f.FullName, $i, ($_.Trim())
    }
  }
}

if ($badArrays.Count) {
  Write-Host "❌ Still found possible offenders:" -ForegroundColor Red
  $badArrays | Select-Object -First 40 | ForEach-Object { Write-Host $_ }
  if ($badArrays.Count -gt 40) { Write-Host "...(more not shown)" }
} else {
  Write-Host "✅ No doubled-quote arrays remaining." -ForegroundColor Green
}

# Build to verify
Write-Host "`n📦 Installing deps & building web..." -ForegroundColor Cyan
Push-Location "apps\web"
npm install
npm run build
Pop-Location

Write-Host "`n🎉 Done. Start dev with: cd 'C:\New folder\lms\apps\web'; npm run dev" -ForegroundColor Green
