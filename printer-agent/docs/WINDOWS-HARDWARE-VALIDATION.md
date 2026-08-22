# Windows Hardware Validation

> **STATUS: PENDING.** No Windows machine or physical Epson printer has been tested in this macOS phase. Every result in this document must be recorded as `PASS`, `FAIL`, or `NOT RUN` during the future validation.

## Windows and hardware tests still pending

- Native `printer` module loading inside Electron on Windows.
- Windows printer discovery from the installed spooler.
- Actual Epson TM-T82/TM-T82III detection.
- Raw ESC/POS printing.
- Physical text layout and paper width.
- Physical QR output and scanning.
- Physical feed and automatic cut.
- Queue behavior with real hardware.
- Duplicate protection and intentional reprint.
- Printer disconnect/reconnect recovery.
- Windows startup and tray behavior.
- Installer and clean-machine installation.
- SmartScreen and antivirus behavior.
- Code signing.

## Test record

Copy this section for each machine/test run.

```text
Date:
Tester:
Windows version/build:
Machine:
Agent version:
Installer filename/hash:
Printer model/firmware:
Connection: USB / Ethernet
Epson driver/version:
Windows queue name:
Paper width: 58 mm / 80 mm

Printer discovery: PASS / FAIL / NOT RUN
Printer setup: PASS / FAIL / NOT RUN
Test print: PASS / FAIL / NOT RUN
ESC/POS initialization: PASS / FAIL / NOT RUN
Text/alignment: PASS / FAIL / NOT RUN
QR scan: PASS / FAIL / NOT RUN
Feed: PASS / FAIL / NOT RUN
Auto cut: PASS / FAIL / NOT RUN
Queue 5 jobs: PASS / FAIL / NOT RUN
Queue 10 jobs: PASS / FAIL / NOT RUN
Duplicate protection: PASS / FAIL / NOT RUN
Explicit reprint: PASS / FAIL / NOT RUN
Power-off handling: PASS / FAIL / NOT RUN
USB/network disconnect recovery: PASS / FAIL / NOT RUN
Agent restart: PASS / FAIL / NOT RUN
Windows restart/startup: PASS / FAIL / NOT RUN
Tray behavior: PASS / FAIL / NOT RUN
Installer: PASS / FAIL / NOT RUN
Clean-machine install: PASS / FAIL / NOT RUN

Overall: PASS / FAIL / NOT RUN
Notes/evidence:
```

## 1. Preflight

1. Complete [WINDOWS-SETUP.md](WINDOWS-SETUP.md).
2. Install the agent or run the development build.
3. Install the Epson driver and confirm a Windows test page prints.
4. Record the Windows queue name, driver version, connection type, and printer firmware.
5. Read the token from `%APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt`.
6. Verify health before testing hardware:

```powershell
$token = (Get-Content "$env:APPDATA\PlanetCinemaPrinterAgent\printer-token.txt" -Raw).Trim()
$headers = @{ "X-Printer-Agent-Token" = $token }
Invoke-RestMethod "http://127.0.0.1:18765/api/health" -Headers $headers | ConvertTo-Json
```

Expected Windows capability values include `platform: win32`, `printerBackend: windows-native`, and `hardwarePrintingSupported: true`. This only proves the agent reports the Windows path; it does not prove the native module or printer works.

## 2. Verify discovery

```powershell
$printers = Invoke-RestMethod "http://127.0.0.1:18765/api/printers" -Headers $headers
$printers | ConvertTo-Json -Depth 8
```

The returned `printers` array must contain the real Windows-installed Epson queue. Each record should include:

- `id`: stable identity supplied by the native layer, or the documented `printer-name` fallback if Windows exposes no better ID.
- `name`: Windows queue display/name.
- `status`: `ready`, `busy`, `offline`, or `unknown`.
- `isDefault`.
- `driver`.
- `capabilities`, which may be `unknown` unless the driver exposes proof.
- `identifierSource`.

The current adapter does not invent Epson or Microsoft printers. If the agent is healthy but `printers` is empty, compare the Windows Printers & scanners queue with the native Electron module check. If Windows shows the printer but the agent does not, collect the native module error, queue name, architecture, and driver details. Do not manually mark the printer ready.

## 3. Validate the Cinema Printer Setup page

1. Open the Cinema web application.
2. Navigate to **Settings > Printer Setup**.
3. Confirm the page shows **Connected** only when the agent health request succeeds.
4. Confirm the real Epson printer appears in the list.
5. Select the printer by the returned ID.
6. Select `58 mm` or `80 mm` to match the roll.
7. Set Auto Cut on or off for the relevant test.
8. Click **Save**.
9. Read config from the API:

```powershell
Invoke-RestMethod "http://127.0.0.1:18765/api/config" -Headers $headers | ConvertTo-Json
```

10. Refresh the browser and confirm the selected ID remains selected.
11. Restart the agent and repeat the config request.
12. Confirm `ticketPrinterId`, `ticketPrinter`, `paperWidth`, and `autoCut` remain unchanged.

A display name is retained for presentation, but the frontend persists `ticketPrinterId`. If the native layer supplies only a Windows queue name, the API reports `identifierSource: printer-name`; that limitation must be recorded rather than hidden behind a fabricated UUID.

## 4. First physical test print

1. Open **Settings > Printer Setup**.
2. Select the Epson printer.
3. Save the configuration.
4. Click **Test Print**.
5. Confirm the API response is a real completed job, not an unsupported or failed response.
6. Confirm the printer receives paper.
7. Record a photograph or scan of the output and the returned job ID.

Verify physically:

- Text is readable.
- The configured paper width is correct.
- The header alignment is correct.
- Movie, studio, date/time, seat, ticket, order, and price are readable.
- The QR code is present.
- The paper feed is sufficient.
- The cutter behaves according to the Auto Cut setting.

A successful HTTP response is not enough. Mark the test passed only after inspecting the physical ticket.

## 5. ESC/POS command validation

The renderer is platform-independent. The following tests distinguish generated bytes from physical execution.

### Initialization

Print a test ticket and verify that the generated buffer begins with ESC/POS initialization and alignment commands. The physical printer must reset formatting between jobs. Record both the renderer test result and the physical observation separately.

### Text and alignment

Verify normal text, bold title text, centered title/header, and left-aligned detail lines. The current renderer uses a bold title section and left alignment for the ticket body. If text wraps or overflows, record the paper width and exact line; renderer values are adjusted in `TicketRenderer.ts` later, not in the Windows driver as a first response.

### Feed

Verify the ticket advances far enough before the cutter or tear edge. Record excess bottom margin and whether the next ticket starts cleanly.

### QR

Use this known value for an independent QR test:

```text
TEST-QR-PLANET-CINEMA
```

For a real ticket, scan the exact QR content generated from the ticket payload. The renderer test proves the QR command payload contains the input data; the phone scan proves the physical printer rendered it correctly. These are separate results.

### Cut

The renderer emits the Epson-compatible cut command only when `autoCut` is enabled. The byte test proves command presence/absence; only a physical test proves the printer executed it.

## 6. Real cinema ticket

Use a real order in a controlled test environment. Confirm the physical output contains:

- Movie.
- Studio.
- Show date.
- Show time.
- Seat.
- Ticket number.
- Order number.
- Price.
- QR code.

Inspect and record:

- Text wrapping at 58 mm and 80 mm.
- QR size and scan distance.
- Spacing between sections.
- Bottom margin.
- Cutter position.
- Whether any detail is clipped or printed outside the usable width.

The browser print page remains a fallback screen-print path in the existing application. This hardware test is specifically for the printer-agent API path and must identify which path was used.

## 7. Auto Cut

### Auto Cut ON

1. Set `autoCut=true` in Printer Setup.
2. Save.
3. Print one ticket.
4. Verify feed, then physical cut.

### Auto Cut OFF

1. Set `autoCut=false`.
2. Save.
3. Print one ticket.
4. Verify feed occurs and no cut occurs.

If no cut occurs with Auto Cut ON, check in this order:

- Whether the exact Epson model has a cutter.
- Whether the printer is using the expected driver/queue.
- Whether the native raw transport accepted the job.
- Whether the printer's own configuration disables cutting.
- Whether the command is supported by the model.

Do not change renderer commands solely because a driver-managed Windows test page behaves differently.

## 8. Queue and duplicate tests

### Queue order

1. Print one ticket and verify it.
2. Submit five distinct jobs rapidly.
3. Submit ten distinct jobs rapidly.
4. Record each job ID in submission order.
5. Verify physical output order and that tickets do not overlap or interleave.

### Duplicate protection

Submit the same payload with the same `jobId` twice through the authenticated API. The second request must return the existing job result and must not create another physical print.

```powershell
$payload = @{ jobId = "validation-job-001"; mode = "print"; ticketNumber = "PCM-VALIDATION-001"; orderNumber = "ORDER-VALIDATION-001"; movie = "Validation Movie"; qrCode = "TEST-QR-PLANET-CINEMA" } | ConvertTo-Json
Invoke-RestMethod "http://127.0.0.1:18765/api/print/ticket" -Method Post -Headers $headers -ContentType "application/json" -Body $payload
Invoke-RestMethod "http://127.0.0.1:18765/api/print/ticket" -Method Post -Headers $headers -ContentType "application/json" -Body $payload
```

### Explicit reprint

Use the existing Cinema **Reprint Ticket** workflow and record `mode: reprint` at the printer-agent boundary if that flow calls the agent. Confirm the backend's existing reprint audit logging is present and no duplicate ticket record is created. An intentional reprint must remain possible even though duplicate normal-print requests are protected.

## 9. Failure and recovery tests

Run each test with the agent running and configuration saved:

- Power the printer off. Confirm the UI/API reports offline or failure, never success.
- Disconnect USB or remove the network path. Confirm the job fails without permanently blocking later jobs.
- Restart the printer. Confirm discovery/status recovery and print a new test ticket.
- Restart the agent. Confirm config and token remain intact, then print again.
- Submit a successful job, a deliberately failed job, and a later successful job. Confirm the later job runs.

Collect health and discovery responses before and after each failure.

## 10. Windows restart and startup

1. Install the packaged agent.
2. Configure the Epson queue and save.
3. Restart Windows.
4. Log in.
5. Verify the tray icon appears.
6. Verify the health endpoint responds.
7. Verify the printer is discovered.
8. Verify config is retained.
9. Print a test ticket.

The current implementation enables startup only when `app.isPackaged` is true by calling Electron `app.setLoginItemSettings({ openAtLogin: true, path: process.execPath })`. Startup is not enabled for development runs. This mechanism and its exact Windows behavior remain pending validation.

To disable startup during a controlled test, use Windows **Settings > Apps > Startup** if the entry is exposed, or temporarily disable the Planet Cinema Printer Agent entry in Task Manager's **Startup apps**. Record what Windows shows; do not edit the registry manually unless support directs it.

## 11. Tray behavior

Verify:

1. Start Windows and log in.
2. Confirm the tray icon appears.
3. Confirm **Open Cinema Printer Settings** opens the configured web route.
4. Close the browser/main web window and confirm the agent process and API remain running.
5. Choose **Exit** from the tray menu.
6. Confirm the process exits and the health endpoint stops responding.

The tray uses an empty native image in the current implementation, so the visual icon may require release asset validation. Record whether the tray icon is visible and recognizable on Windows.
