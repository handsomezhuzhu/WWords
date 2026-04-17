from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path


APP_ROOT = Path("/app")
FRONTEND_ROOT = APP_ROOT / "frontend"
SHUTDOWN_SIGNALS = (signal.SIGINT, signal.SIGTERM)


def _terminate(name: str, process: subprocess.Popen[bytes], sig: signal.Signals) -> None:
    if process.poll() is not None:
        return
    print(f"[container] forwarding {sig.name} to {name}", flush=True)
    process.send_signal(sig)


def _kill(name: str, process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    print(f"[container] force killing {name}", flush=True)
    process.kill()


def main() -> int:
    backend_host = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port = os.getenv("BACKEND_PORT", "8000")
    frontend_host = os.getenv("HOST", "0.0.0.0")
    frontend_port = os.getenv("PORT", "7997")

    backend_env = os.environ.copy()
    frontend_env = os.environ.copy()
    frontend_env["BACKEND_ORIGIN"] = frontend_env.get(
        "BACKEND_ORIGIN",
        f"http://127.0.0.1:{backend_port}",
    )
    frontend_env["HOSTNAME"] = frontend_host
    frontend_env["PORT"] = frontend_port

    backend = subprocess.Popen(
        [
            "uvicorn",
            "app.main:app",
            "--host",
            backend_host,
            "--port",
            backend_port,
        ],
        cwd=APP_ROOT,
        env=backend_env,
    )

    frontend = subprocess.Popen(
        ["node", "server.js"],
        cwd=FRONTEND_ROOT,
        env=frontend_env,
    )

    processes = {
        "backend": backend,
        "frontend": frontend,
    }

    def handle_signal(signum: int, _frame: object) -> None:
        sig = signal.Signals(signum)
        for name, process in processes.items():
            _terminate(name, process, sig)

    for sig in SHUTDOWN_SIGNALS:
        signal.signal(sig, handle_signal)

    try:
        while True:
            for name, process in processes.items():
                return_code = process.poll()
                if return_code is None:
                    continue

                print(
                    f"[container] {name} exited with code {return_code}, stopping remaining processes",
                    flush=True,
                )
                for other_name, other_process in processes.items():
                    if other_name != name:
                        _terminate(other_name, other_process, signal.SIGTERM)

                deadline = time.time() + 10
                for other_name, other_process in processes.items():
                    if other_name == name:
                        continue
                    while other_process.poll() is None and time.time() < deadline:
                        time.sleep(0.2)
                    if other_process.poll() is None:
                        _kill(other_name, other_process)

                return return_code

            time.sleep(0.5)
    finally:
        for name, process in processes.items():
            _terminate(name, process, signal.SIGTERM)
        deadline = time.time() + 5
        for name, process in processes.items():
            while process.poll() is None and time.time() < deadline:
                time.sleep(0.2)
            if process.poll() is None:
                _kill(name, process)


if __name__ == "__main__":
    sys.exit(main())
