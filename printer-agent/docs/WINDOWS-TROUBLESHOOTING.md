# Windows Troubleshooting Guide

> Use this guide for future Windows validation and support. No troubleshooting scenario below has been verified on Windows yet.

## Collect diagnostics first

Record:

- Agent version from `/api/health`.
- Windows version/build.
- Printer model and firmware.
- USB or Ethernet connection.
- Windows printer queue name.
- Epson driver name/version.
- `%APPDATA%\PlanetCinemaPrinterAgent\printer-config.json` contents, with the token excluded.
- Health response.
- Printer discovery response.
- Job ID and timestamp.
- Agent console output or captured log.

Do not send `printer-token.txt` to support. Treat it as a local credential.

### Health and discovery commands

```powershell
$token = (Get-Content "$env:APPDATA\PlanetCinemaPrinterAgent\printer-token.txt" -Raw).Trim()
$headers = @{ "X-Printer-Agent-Token" = $token }
Invoke-RestMethod "http://127.0.0.1:18765/api/health" -Headers $headers | ConvertTo-Json -Depth 8
Invoke-RestMethod "http://127.0.0.1:18765/api/printers" -Headers $headers | ConvertTo-Json -Depth 8
Invoke-RestMethod "http://127.0.0.1:18765/api/config" -Headers $headers | ConvertTo-Json -Depth 8
```

### Check the local port

```powershell
Test-NetConnection 127.0.0.1 -Port 18765
Get-NetTCPConnection -LocalPort 18765 -ErrorAction SilentlyContinue
```

### Capture console output

The current agent does not write a dedicated rotating Windows log file. For a controlled diagnostic run, start the installed executable from PowerShell and capture stdout/stderr:

```powershell
$log = "$env:TEMP\planet-cinema-printer-agent.log"
$exe = "C:\Program Files\Planet Cinema Printer Agent\Planet Cinema Printer Agent.exe"
& $exe *> $log
```

The install directory may differ because the NSIS installer allows it to be changed. Locate the executable from the Start Menu shortcut or installed-app location. Preserve the log with the health response and job ID.

## Agent does not start

1. Confirm the application appears in **Installed apps**.
2. Start it from the Start Menu.
3. Check for a tray icon.
4. Run the port check above.
5. Run the executable from PowerShell to capture startup errors.
6. Check Windows Event Viewer only for application crash evidence; the agent currently has no dedicated Event Log provider.
7. Confirm the packaged native module is compatible with Electron 31.7.1.
8. Confirm `build/icon.ico` was present when the installer was built.

Common release-only causes include a native ABI mismatch, missing packaged native DLL, missing installer files, and an installer built for the wrong architecture.

## Agent starts but Cinema says disconnected

1. Confirm `Test-NetConnection 127.0.0.1 -Port 18765` succeeds.
2. Call `/api/health` with the token header.
3. Confirm the browser has `localStorage.printerAgentToken` set to the token in `%APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt`.
4. Confirm the token was copied without whitespace.
5. Confirm the Cinema origin is in `PRINTER_AGENT_ALLOWED_ORIGINS`.
6. Confirm the browser is using `localhost` or `127.0.0.1` consistently with the configured CORS origins.
7. Review browser network errors and the agent console.

The current client does not automatically provision the browser token. A missing browser token produces a 401 even when the agent itself is healthy.

## Health returns 401

The API requires:

```http
X-Printer-Agent-Token: <token>
```

Read the token safely:

```powershell
$token = (Get-Content "$env:APPDATA\PlanetCinemaPrinterAgent\printer-token.txt" -Raw).Trim()
```

Do not put the token in screenshots, issue titles, or shared logs. If the token file is missing, restart the agent so it can generate one, then provision the approved browser workflow.

## Health works but no printer appears

1. Open **Settings > Bluetooth & devices > Printers & scanners**.
2. Confirm the Epson queue exists and is not offline.
3. Print a Windows test page.
4. Record the exact queue name and driver.
5. Check the Electron native module load command from [WINDOWS-SETUP.md](WINDOWS-SETUP.md).
6. Confirm the app is running as the same Windows user that can access the printer.
7. Check Windows Print Spooler:

```powershell
Get-Service Spooler
```

8. Restart the spooler only under an approved support procedure:

```powershell
Restart-Service Spooler
```

The agent does not implement direct USB or TCP discovery. Ethernet printers must be installed as Windows printer queues first. Do not add a fake printer record to make the setup page look healthy.

## Printer appears but print fails

1. Confirm `/api/config` points to the returned `ticketPrinterId`.
2. Confirm the printer status is `ready`.
3. Confirm `hardwarePrintingSupported` is true on Windows.
4. Record the failed job ID and error code.
5. Check for `HARDWARE_PRINTING_UNSUPPORTED`, `PRINTER_NOT_READY`, or native binding errors.
6. Run a Windows test page.
7. Verify the selected queue is the Epson queue, not a PDF/XPS queue.
8. Check the spooler queue for stuck jobs.
9. Capture native Electron load output and agent console output.

The agent must never report completed when the transport fails. A Windows test page succeeding does not prove raw ESC/POS output succeeds.

## Ticket prints but QR is wrong or will not scan

1. Capture the exact QR input sent in the test payload without exposing customer data.
2. Use the known test value `TEST-QR-PLANET-CINEMA`.
3. Confirm the renderer test passes locally.
4. Confirm the physical QR is not clipped, blurred, or too small.
5. Try the other supported paper width only if the ticket layout requires it.
6. Record phone model/scanner result and physical ticket evidence.

Do not change QR commands before distinguishing an incorrect input payload from a transport/printer rendering problem.

## Ticket prints but does not cut

1. Confirm the exact Epson model has a cutter.
2. Confirm `autoCut=true` in `/api/config`.
3. Confirm the renderer byte test includes the cut command.
4. Confirm the job used the raw Windows transport.
5. Check printer-local settings and driver queue configuration.
6. Test a manufacturer utility or supported Epson command only as a diagnostic comparison.
7. Record whether feed occurs and whether the printer cuts partially or not at all.

Possible causes include a model without a cutter, disabled printer configuration, unsupported command, incorrect queue/driver, or transport failure. Do not treat a generated command as proof of physical cutting.

## Printer is offline or powered off

The UI should distinguish an agent connection from printer readiness. With the printer off, test:

1. Health remains available if the agent is running.
2. Discovery/status identifies the printer as unavailable or offline where the Windows API reports it.
3. A print request fails with an explicit error.
4. No success toast or completed result is shown.
5. A later successful job works after the printer is restored.

Record whether Windows reports `offline`, `busy`, or `unknown`; the native driver status is part of the evidence.

## USB disconnected or Ethernet unavailable

1. Disconnect the cable or remove the network path.
2. Query health and discovery.
3. Submit one controlled test job.
4. Confirm it fails without permanently blocking the queue.
5. Restore the connection.
6. Confirm discovery recovers.
7. Submit a new job and inspect the physical result.

The current agent does not directly diagnose cable or network faults; use Windows printer settings, spooler status, and driver utilities as additional evidence.

## Agent works manually but not after Windows restart

The packaged agent calls Electron `app.setLoginItemSettings` with `openAtLogin: true` and `path: process.execPath`. Development runs do not enable startup.

1. Confirm the packaged app was used.
2. Check **Task Manager > Startup apps** and **Settings > Apps > Startup**.
3. Confirm the entry is enabled.
4. Confirm Windows did not remove or block it.
5. Log in after restart and check the tray and port.
6. Capture startup errors by launching manually if needed.

Do not claim startup passed until the full Windows restart test succeeds.

## Tray icon or exit behavior is wrong

1. Confirm the process is running.
2. Check the notification overflow area.
3. Confirm the tray menu opens the Cinema Printer Settings URL.
4. Close the web browser and verify the API remains available.
5. Choose **Exit** and confirm the process/port stops.
6. Record whether the icon is visually identifiable.

The current tray uses an empty native image, so a blank or generic icon is a known release-validation concern.

## Installer is blocked by SmartScreen or antivirus

Do not disable security features as the production fix. Record:

- Installer filename and SHA-256.
- Publisher/signature state.
- Windows warning text.
- Windows version/build.
- Antivirus product and detection name.

For production, sign the installer and binaries with the organization's certificate, maintain consistent publisher identity, submit false positives to the vendor, and distribute only the approved artifact. See [WINDOWS-RELEASE.md](WINDOWS-RELEASE.md).

## Support escalation package

Send support:

```text
Agent version:
Windows version/build:
Printer model/firmware:
Connection:
Epson driver/version:
Windows queue name:
Health response with token removed:
Printer discovery response with token removed:
Config response with token removed:
Job ID:
Timestamp:
Captured agent log:
Physical result:
```

Never send `printer-token.txt` or a raw request containing customer ticket data unless the approved incident process requires it.
