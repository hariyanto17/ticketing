# Windows Release Guide

> **STATUS: PENDING.** No Windows installer, native Electron module, code signing, SmartScreen behavior, or clean-machine installation has been verified.

## 1. Current packaging configuration

The current package uses:

- Application ID: `com.planetcinema.printer-agent`.
- Product name: `Planet Cinema Printer Agent`.
- Target: Windows NSIS x64.
- Installer mode: assisted install, not one-click.
- Requested execution level: `asInvoker`.
- Output directory: `dist-installers` relative to `printer-agent`.
- Start Menu shortcut: enabled.
- Desktop shortcut: enabled.
- Installation directory can be changed: enabled.
- Expected installer name: electron-builder's generated NSIS artifact, commonly `Planet Cinema Printer Agent Setup.exe`.

Before the first Windows build, confirm the actual generated filename in `printer-agent\dist-installers`; do not distribute a guessed filename.

## 2. Important release blockers to resolve or record

### Native Electron ABI

The dependency `printer@0.4.0` is a native Node module. The repository currently has no checked-in `electron-rebuild` dependency, no rebuild script, and no verified Windows Electron ABI artifact. The native module must load inside Electron 31.7.1, not merely inside the system Node.js executable.

The release candidate must run the Electron load check from [WINDOWS-SETUP.md](WINDOWS-SETUP.md). If rebuilding is required, record the exact `electron-rebuild` command and Electron/Node architecture used.

### Installer icon

`electron-builder.yml` references `./build/icon.ico`, but the current repository inspection did not find a `printer-agent/build/` directory. Confirm that `build/icon.ico` exists before running `npm run package`. If it does not exist, electron-builder may fail or produce an installer without the intended icon. Do not work around this by claiming packaging passed.

### Browser token provisioning

The agent token is generated in `%APPDATA%\PlanetCinemaPrinterAgent\printer-token.txt`, while the frontend reads `localStorage.printerAgentToken`. The current code does not automatically provision the browser token. A production release must define and validate a secure provisioning workflow before cashier rollout; manual developer-tools provisioning is suitable only for controlled validation.

### Startup and tray assets

Startup is enabled by `app.setLoginItemSettings` only for packaged apps. The tray currently uses an empty native image, so visible Windows tray branding must be checked during release validation.

## 3. Build from Windows

Open PowerShell in the repository:

```powershell
cd <checkout>\printer-agent
npm ci
npm test
npm run build
npm run package
```

If the legacy `printer` dependency causes npm peer-resolution failure, use the documented fallback:

```powershell
npm install --legacy-peer-deps
npm test
npm run build
npm run package
```

The actual project scripts are:

- `npm test`: Node test runner with `tsx`.
- `npm run build`: `tsc -p tsconfig.json`.
- `npm run package`: `electron-builder --win --x64`.

The expected output directory is:

```text
printer-agent\dist-installers\
```

Inspect the directory and record the exact installer filename, file size, SHA-256 hash, and build version:

```powershell
Get-ChildItem .\dist-installers
Get-FileHash .\dist-installers\*.exe -Algorithm SHA256
```

Do not build the final installer on macOS and infer Windows native compatibility from it. The `printer` module and packaged Electron runtime need Windows validation.

## 4. Native module release check

Before packaging, run the Electron load check:

```powershell
npx electron -e "try { const p = require('printer'); console.log({ getPrinters: typeof p.getPrinters, printDirect: typeof p.printDirect }); } catch (e) { console.error(e); process.exit(1); }"
```

If it fails with an ABI/native DLL error:

```powershell
npm install --save-dev electron-rebuild
npx electron-rebuild -f -w printer
npm run build
npx electron -e "const p = require('printer'); console.log({ getPrinters: typeof p.getPrinters, printDirect: typeof p.printDirect });"
```

This is not currently a repository script. If the release requires it, preserve the output and document the final pinned approach before distributing an installer.

## 5. Install and validate the installer

Use a clean Windows test machine, not only the developer workstation:

1. Copy the installer from `dist-installers`.
2. Verify its recorded SHA-256 hash.
3. Run the NSIS installer as an administrator only if Windows requests it; the configured application level is `asInvoker`.
4. Choose an installation directory.
5. Confirm the Start Menu and desktop shortcuts.
6. Confirm the installed application starts without Node.js or the repository.
7. Confirm the agent process and tray behavior.
8. Confirm the local health endpoint with the token.
9. Install the Epson driver and connect the printer.
10. Configure the printer in Cinema Printer Settings.
11. Execute [WINDOWS-HARDWARE-VALIDATION.md](WINDOWS-HARDWARE-VALIDATION.md).

Uninstall from **Settings > Apps > Installed apps** and confirm the application is removed. Decide separately whether application data under `%APPDATA%\PlanetCinemaPrinterAgent` should remain for support or be removed during uninstall; the current code does not define a data migration/uninstall policy.

## 6. Versioning and artifact record

Before release:

1. Update `version` in `package.json`.
2. Run tests and build.
3. Build the installer.
4. Record package version, Windows build environment, Electron version, native module rebuild status, installer filename, SHA-256 hash, and signing status.
5. Store the artifact in the approved release location.

Do not overwrite a distributed installer with a rebuilt binary under the same version.

## 7. Code signing

**Code signing: PENDING.** The current `electron-builder.yml` does not configure a certificate or signing credentials.

For production, obtain an organization-controlled Authenticode certificate and keep private keys/secrets outside the repository. Configure electron-builder using the approved CI secret mechanism, commonly environment variables such as `CSC_LINK` and `CSC_KEY_PASSWORD` or the organization's signing service. Confirm the exact electron-builder signing configuration before release; do not put certificate files or passwords in the repository.

Unsigned Electron executables may show SmartScreen warnings and lower antivirus reputation. A standard organization certificate can require reputation building; an EV certificate may affect reputation behavior but does not replace testing or publisher trust. Follow current Microsoft and certificate-provider guidance.

Verify a signed artifact with Windows properties and PowerShell signature inspection:

```powershell
Get-AuthenticodeSignature .\dist-installers\Planet*Setup.exe | Format-List
```

A production artifact must show a valid trusted signer. Do not suppress warnings or ship an unsigned installer as the normal cashier solution.

## 8. SmartScreen and antivirus

A new unsigned or newly signed Electron installer may trigger SmartScreen, Defender, or third-party antivirus warnings. The production response is:

- Sign the installer and application binaries.
- Distribute only the recorded release artifact.
- Submit false positives through the relevant vendor process.
- Build reputation through consistent publisher identity and release provenance.
- Keep hashes and release notes for support.

Do not tell cashiers to disable Defender, SmartScreen, UAC, or antivirus as a production installation step. A temporary isolated validation warning may be recorded, but it is not a release pass.

## 9. Clean-machine release test

Use a fresh Windows 10/11 machine or a clean VM with no Node.js and no repository checkout:

```text
Fresh Windows machine
  -> install Planet Cinema Printer Agent Setup.exe
  -> install Epson driver
  -> connect Epson TM-T82/TM-T82III
  -> start/login and verify tray
  -> verify authenticated health endpoint
  -> open Cinema
  -> provision/validate the approved token workflow
  -> select the real printer ID
  -> save config
  -> print a test ticket
  -> scan QR and verify cut
  -> restart Windows
  -> print again
```

Record every additional runtime dependency discovered. A clean-machine pass must not rely on developer tools, Node.js, npm, Visual Studio, Python, or a copied `node_modules` directory outside the installer.

## 10. Release sign-off

Release is not approved until all applicable items have recorded evidence:

- Automated tests pass.
- Windows Electron native module loads.
- Installer installs and uninstalls cleanly.
- Code signing status is recorded.
- SmartScreen/antivirus behavior is recorded.
- Epson driver setup succeeds.
- Printer discovery succeeds.
- Physical test ticket, QR, feed, and cut succeed.
- Queue, duplicate, failure, recovery, startup, and tray tests succeed.
- Clean-machine test succeeds.
- Token provisioning is suitable for cashier operations.
