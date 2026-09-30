# Stops the preview server on port 3200 (`next start -p 3200`, started from
# this repository by `npm run preview` or `npm run preview:serve`), and nothing
# else.
#
# Why it exists: an agent that rebuilds the app has to free port 3200 first,
# and the permission system refuses a bare `taskkill` or `Stop-Process`,
# because it cannot tell the preview server from any other workload. This
# script can: it only stops a process that is listening on 3200 AND whose
# command line is Next's `start -p 3200` from this repository's node_modules.
# The user allowed it on 30/09/2026 (round v5), in .claude/settings.local.json.
#
# Run from Git Bash:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1
#
# Exit codes: 0 when port 3200 is free afterwards (including when nothing was
# running), 1 when the listener is something else and was left alone, 2 when
# the server did not stop in time.

$ErrorActionPreference = "Stop"
$port = 3200
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -eq 0) {
    Write-Output "Port $port is already free."
    exit 0
}

foreach ($owner in ($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $owner"
    $command = if ($process) { $process.CommandLine } else { "" }
    $isNext = $command -match 'next[\\/]dist[\\/]bin[\\/]next"?\s+start\s+-p\s+3200\b'
    $isOurs = $command -and $command.ToLowerInvariant().Contains($repo.ToLowerInvariant())
    if (-not ($isNext -and $isOurs)) {
        Write-Output "Left alone: PID $owner is not this repository's preview server ($command)."
        exit 1
    }
    Stop-Process -Id $owner -Force
    Write-Output "Stopped the preview server, PID $owner."
}

for ($i = 0; $i -lt 50; $i++) {
    if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
        Write-Output "Port $port is free."
        exit 0
    }
    Start-Sleep -Milliseconds 200
}
Write-Output "Port $port is still busy after 10 seconds."
exit 2
