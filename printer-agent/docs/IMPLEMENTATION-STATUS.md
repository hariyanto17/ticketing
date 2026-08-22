# Printer Agent Implementation Status

## Completed and testable on macOS

- Local authenticated HTTP API with health, config, discovery, test-print, and ticket-print routes.
- Platform capability reporting with explicit unsupported hardware behavior on macOS.
- Transport boundary with a Windows-native adapter and unsupported-platform adapter.
- Independent ESC/POS ticket renderer with deterministic QR, feed, and optional cut commands.
- Sequential queue with queued/printing/completed/failed states, recovery after failures, and job ID deduplication.
- File-backed configuration and token persistence across service instances.
- Frontend client abstraction and printer setup page using stable printer IDs and separate agent/printer status.
- Tray background shell opening the existing Cinema web settings route.
- Shutdown and packaged-app startup abstractions.
- Unit and API contract tests.

## Windows-only or hardware-dependent

- Loading and rebuilding the `printer` native module for the target Electron Windows runtime.
- Windows spooler discovery and any native printer identifier exposed by the installed driver.
- Physical Epson TM-T82/TM-T82III output, QR scanning, paper width, feed, and automatic cut.
- Windows startup behavior, installer installation, code signing, SmartScreen, driver installation, disconnect/reconnect recovery, and production cashier workflow.

No fallback printer list or simulated successful print remains in the production path.
