# Windows Setup Guide

> **Windows and hardware validation are still pending.** This guide is a procedure to execute later on Windows 10 or Windows 11. No step in this document is marked as already passed.

## 1. Scope and current limitations

The agent is an Electron application with a local HTTP API on `127.0.0.1:18765`. On Windows it selects `WindowsPrinterTransport`, which loads the native `printer` package and sends raw ESC/POS data to a Windows printer queue.

The current web client reads the agent token from browser `localStorage` under `printerAgentToken`. The agent stores the token in `%APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt`. The current code does not automatically copy the file token into browser storage. For a development validation machine, provision the token manually in the browser as described below. This is a release-readiness limitation, not a Windows test result.

## 2. Running an already-built installer

A cashier computer is expected to install `Planet Cinema Printer Agent Setup.exe`; it must not need Node.js, npm, Git, TypeScript, or the repository to run the packaged application.

The installer is intended to package the compiled `dist/` output, `package.json`, and `node_modules/`. The native `printer` module must still load inside the packaged Electron runtime. That exact Windows/Electron ABI combination is pending validation.

Required for an installed cashier machine:

- Windows 10 or Windows 11.
- Permission to install the application and printer driver.
- Epson TM-T82/TM-T82III printer and its connection.
- Epson Windows driver when required by the connection or model.
- Cinema web application reachable from the cashier computer.

Node.js is not expected to be required on the cashier computer after installation.

## 3. Windows development/test machine

Use a clean Windows 10 or Windows 11 machine for the first validation. Install:

- Git.
- A Node.js version compatible with the repository and Electron 31.7.1. Use the repository's supported team version if one is defined before beginning the test.
- npm, included with Node.js.
- Python and Visual Studio Build Tools with the Desktop development with C++ workload and Windows SDK if the native module must compile locally.

The repository does not pin Python, Visual Studio Build Tools, or Windows SDK versions. The `printer` 0.4.0 package is a legacy native dependency and may use a prebuilt binary or fall back to `node-gyp`. If the prebuilt binary cannot be used, install the current toolchain required by the installed `node-gyp`; do not assume that the package's old README-era Python 2/Visual Studio 2013 instructions are suitable for a modern Windows machine.

Clone the repository and install dependencies:

```powershell
git clone <repository-url>
cd kasir-ticket\printer-agent
npm ci
```

If the current legacy `printer` dependency tree causes npm peer-resolution failure, use the repository-compatible fallback that was required during macOS setup:

```powershell
npm install --legacy-peer-deps
```

Record which command was used in the validation result.

## 4. Native module and Electron ABI check

The project currently has no `electron-rebuild` dependency, no `rebuild` script, and no pinned native rebuild command. The `printer` package is a native Node module, so a successful Node.js load does not prove that it loads in Electron 31.7.1.

After installing dependencies, first run the project checks:

```powershell
npm test
npm run build
```

Then validate the module in the actual Electron runtime used by the agent. From `printer-agent`:

```powershell
npx electron -e "try { const p = require('printer'); console.log({ getPrinters: typeof p.getPrinters, printDirect: typeof p.printDirect }); } catch (e) { console.error(e); process.exit(1); }"
```

Expected shape:

```text
{ getPrinters: 'function', printDirect: 'function' }
```

If Electron reports an ABI or native DLL loading error, do not claim the printer agent works. Install the rebuild tool as a development dependency in the Windows validation checkout and rebuild specifically for the installed Electron version:

```powershell
npm install --save-dev electron-rebuild
npx electron-rebuild -f -w printer
npm run build
npx electron -e "const p = require('printer'); console.log({ getPrinters: typeof p.getPrinters, printDirect: typeof p.printDirect });"
```

This rebuild command is a validation procedure, not currently a checked-in npm script. If it is required for release, record the exact Electron version, architecture, and rebuild result and then decide whether the project needs a pinned release script in a later implementation phase.

## 5. Epson driver and Windows printer setup

1. Power off the Epson printer before connecting it.
2. Connect it by USB, or connect it to the same LAN for an Ethernet setup.
3. Install the Epson Windows driver recommended for the exact TM-T82/TM-T82III variant and connection.
4. Open **Settings > Bluetooth & devices > Printers & scanners**.
5. Confirm the Epson printer appears with the intended Windows queue name.
6. Open the queue and print a Windows test page.
7. Confirm the device is online, not paused, and not offline.
8. Confirm paper is loaded and the printer's paper width/driver settings match the installed roll.
9. Record the exact Windows queue name and driver version.

A Windows driver makes the printer available to the spooler. It does not prove that the driver accepts the raw ESC/POS commands emitted by the agent, nor does a Windows test page prove QR or cutter behavior. Those require the hardware validation procedure.

## 6. USB and Ethernet

### USB

```text
Windows cashier PC -- USB --> Epson TM-T82/TM-T82III
```

The Epson driver creates a local Windows printer queue. The agent receives the queue's discovered name and sends raw data to that queue. The current agent does not ask for a USB device path or implement a separate USB protocol.

### Ethernet

```text
Windows cashier PC -- LAN --> Epson TM-T82/TM-T82III
```

The Epson driver must expose the network printer as a Windows printer queue. The agent still addresses the Windows queue name; it does not implement direct TCP/IP socket printing or Epson network discovery itself. Ethernet support is therefore conditional on the Windows driver/spooler path and remains unverified until tested.

## 7. Start and verify the agent

For development, run the compiled agent through Electron from the project directory:

```powershell
npm run build
npm start
```

For production, run the installed `Planet Cinema Printer Agent.exe` from the Start Menu or desktop shortcut created by the NSIS installer.

The expected sequence is:

1. The process starts.
2. A tray icon appears.
3. The API listens on `127.0.0.1:18765`.
4. The health endpoint responds when supplied the token.

The token is stored at:

```text
%APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt
```

Check health in PowerShell:

```powershell
$token = (Get-Content "$env:APPDATA\PlanetCinemaPrinterAgent\printer-token.txt" -Raw).Trim()
$headers = @{ "X-Printer-Agent-Token" = $token }
Invoke-RestMethod -Uri "http://127.0.0.1:18765/api/health" -Headers $headers | ConvertTo-Json
```

On Windows, the expected capability fields are:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "platform": "win32",
  "printerBackend": "windows-native",
  "hardwarePrintingSupported": true
}
```

The response also includes `canDiscoverPrinters`, `canRawPrint`, and `canAutoCut`. This response shape is expected from the implementation but is not a Windows test result yet.

## 8. Provision the browser token for validation

For a development/test browser profile, open browser developer tools on the Cinema web application, open the Application/Storage panel, select the Cinema origin, and set:

```text
Key: printerAgentToken
Value: <contents of %APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt>
```

Refresh the page. A production cashier workflow should not depend on a manual developer-tools step; token provisioning remains a release-readiness item in the current implementation.

## 9. Useful environment overrides

The current agent supports these process environment variables:

```text
PRINTER_AGENT_HOST
PRINTER_AGENT_PORT
PRINTER_AGENT_ALLOWED_ORIGINS
PRINTER_AGENT_DATA_DIR
CINEMA_PRINTER_SETTINGS_URL
```

Defaults are:

```text
PRINTER_AGENT_HOST=127.0.0.1
PRINTER_AGENT_PORT=18765
PRINTER_AGENT_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`PRINTER_AGENT_DATA_DIR` is intended for isolated tests. Normal installations use `%APPDATA%`. If the Cinema app uses another origin, configure `PRINTER_AGENT_ALLOWED_ORIGINS` before starting the agent and record that deployment setting.
