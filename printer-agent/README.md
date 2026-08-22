# Planet Cinema Printer Agent

This is the separate local Electron app used by cashier workstations to manage thermal ticket printing.

## Quick start

```bash
npm install
npm run build
npm run dev
```

## Build Windows installer

```bash
npm run package
```

The installer produces a Windows executable named `Planet Cinema Printer Agent Setup.exe`.

The configured electron-builder output directory is `dist-installers/`; confirm the exact generated filename there before distribution.

## Local API

The app listens on `127.0.0.1:18765` by default. The API requires the installation-specific header:

```http
X-Printer-Agent-Token: <token>
```

The token is stored in the local app data directory and is generated automatically on first run.

## Supported operations

- `GET /api/health`
- `GET /api/printers`
- `GET /api/config`
- `PUT /api/config`
- `POST /api/printers/test`
- `POST /api/print/ticket`

## Notes

- The app runs as a background tray process and opens the existing Cinema web printer settings route.
- It binds only to `127.0.0.1` by default.
- On Windows, the native transport discovers printers from the Windows spooler and sends raw ESC/POS data.
- On macOS and unsupported platforms, discovery returns no printers and print requests fail explicitly with `HARDWARE_PRINTING_UNSUPPORTED`.
- Printer jobs are rendered independently from the transport and queued sequentially with idempotent job IDs.

## Status

The renderer, platform capability layer, queue, configuration persistence, API contracts, and unsupported macOS behavior are testable locally. Windows spooler discovery, Epson output, QR scanning, automatic cutting, startup, and installer behavior remain pending physical Windows validation. See `docs/WINDOWS-HARDWARE-VALIDATION.md` and `docs/WINDOWS-RELEASE.md`.

Windows preparation guides:

- `docs/WINDOWS-SETUP.md` - developer/test machine and native Electron module setup.
- `docs/WINDOWS-HARDWARE-VALIDATION.md` - physical Epson and Windows workflow.
- `docs/WINDOWS-RELEASE.md` - installer, signing, clean-machine, and release checks.
- `docs/WINDOWS-TROUBLESHOOTING.md` - diagnostics and support procedures.
- `docs/CASHIER-INSTALLATION.md` - short operator installation guide.

## Security

The agent never exposes arbitrary shell commands or raw filesystem access. All browser requests must include the generated local token.
