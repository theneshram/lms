# Fix + Diagnose API health on http://localhost:8080/api/health

$ErrorActionPreference = 'Stop'
$root = "C:\New folder\lms"
$apiDocker = Join-Path $root "apps\api\Dockerfile"
$webDocker = Join-Path $root "apps\web\Dockerfile"
$compose  = Join-Path $root "docker-compose.yml"

function W($t,$c="Cyan"){ Write-Host $t -ForegroundColor $c }
function WriteUtf8NoBom($path,$content){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$content,$enc)
  W "Wrote $path" "Green"
}

# 0) Make sure Docker is running
W "Checking Docker…"
docker version | Out-Null

# 1) Stop & remove any running stack
cd $root
W "Stopping old stack…" "Yellow"
docker compose down --remove-orphans --volumes

# 2) Patch API Dockerfile to avoid npm ci lockfile failures
$apiDockerContent = @"
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Use lockfile when available; fall back otherwise
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm i --omit=dev; else npm i --omit=dev; fi
COPY . .
EXPOSE 8080
CMD ["node","src/index.js"]
"@
WriteUtf8NoBom $apiDocker $apiDockerContent

# 3) Patch WEB Dockerfile (dev server in container)
if (Test-Path $webDocker) {
  $webDockerContent = @"
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi
COPY . .
EXPOSE 3000
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","3000"]
"@
  WriteUtf8NoBom $webDocker $webDockerContent
}

# 4) Ensure compose maps 8080:8080 and 3000:3000 (and remove obsolete 'version:' line)
$composeText = Get-Content $compose -Raw
$composeText = $composeText -replace "(?m)^\s*version:.*\r?\n",""
# Normalize api port map to 8080:8080
$composeText = ($composeText -split "`n") | ForEach-Object {
  if ($_ -match "^\s*-\s+""\d{4,5}:8080""") { '      - "8080:8080"' } else { $_ }
} | Out-String
WriteUtf8NoBom $compose $composeText.TrimEnd()

# 5) OPTIONAL: create lockfiles locally so future builds are clean
W "Ensuring local lockfiles…" "Yellow"
Push-Location "$root\apps\api";  if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }; npm install | Out-Host; Pop-Location
Push-Location "$root\apps\web";  if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }; npm install | Out-Host; Pop-Location

# 6) Rebuild and start
W "Rebuilding containers…" "Yellow"
docker compose up -d --build

Start-Sleep -Seconds 3
W "Compose status:" "Cyan"
docker compose ps

# 7) Tail backend logs
W "Backend logs (last 120 lines):" "Cyan"
docker logs lms-backend --tail=120

# 8) Test from inside the backend container (container -> localhost:8080)
W "Testing from inside container…" "Cyan"
docker exec lms-backend sh -lc "apk add --no-cache curl >/dev/null 2>&1 || true; curl -sS http://localhost:8080/api/health || true"

# 9) Test from host
W "Testing from host…" "Cyan"
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 5
  W ("HOST RESULT: " + $resp.StatusCode + " " + $resp.Content) "Green"
} catch {
  W ("HOST ERROR: " + $_.Exception.Message) "Red"
  W "If host test fails but in-container test succeeds, a port conflict or firewall is likely." "Yellow"
}

W "Done."
