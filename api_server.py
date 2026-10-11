"""
api_server.py – Mantra AI v3.2 Web API
───────────────────────────────────────
FastAPI server that exposes MantraAI's capabilities as REST endpoints
for the Next.js frontend dashboard.

Usage:
    python api_server.py

Runs on http://localhost:8000 with CORS enabled for the frontend.
"""

import os
import sys
import subprocess
import signal
import json
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ── Ensure project root is on sys.path ────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

# ── Import MantraAI modules ──────────────────────────────────────────────────
from system.system_control import SystemControl, _get_brightness
from automation import Automation
from browser import Browser
from screen import Screen

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="MantraAI API",
    description="REST API for MantraAI desktop control",
    version="3.2",
)

# CORS – allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Module Instances ──────────────────────────────────────────────────────────

system_control = SystemControl()
automation = Automation()
browser_tool = Browser()
screen_tool = Screen()

# ── Mantra Process Management ─────────────────────────────────────────────────

_mantra_process: Optional[subprocess.Popen] = None


def _is_mantra_running() -> bool:
    """Check if the MantraAI main process is alive."""
    global _mantra_process
    if _mantra_process is None:
        return False
    poll = _mantra_process.poll()
    if poll is not None:
        _mantra_process = None
        return False
    return True


# ── Request/Response Models ───────────────────────────────────────────────────

class VolumeRequest(BaseModel):
    level: int  # 0–100

class BrightnessRequest(BaseModel):
    level: int  # 0–100

class AppRequest(BaseModel):
    name: str

class BrowserRequest(BaseModel):
    url: Optional[str] = None
    query: Optional[str] = None
    platform: Optional[str] = "google"  # "google" or "youtube"

class PowerRequest(BaseModel):
    action: str  # "shutdown", "restart", "sleep", "lock", "cancel"
    delay: Optional[int] = 60

class StatusResponse(BaseModel):
    status: str
    message: str
    data: Optional[dict] = None


# ── Mantra Core Endpoints ─────────────────────────────────────────────────────

@app.get("/api/mantra/status")
async def mantra_status():
    running = _is_mantra_running()
    return StatusResponse(
        status="running" if running else "stopped",
        message="MantraAI is active and listening." if running
                else "MantraAI is not running.",
        data={"pid": _mantra_process.pid if running else None}
    )


@app.post("/api/mantra/start")
async def mantra_start():
    global _mantra_process
    if _is_mantra_running():
        return StatusResponse(
            status="running",
            message="MantraAI is already running.",
            data={"pid": _mantra_process.pid}
        )
    try:
        # Start main.py in a subprocess
        _mantra_process = subprocess.Popen(
            [sys.executable, str(PROJECT_ROOT / "main.py")],
            cwd=str(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                          if sys.platform == "win32" else 0,
        )
        # Give it a moment to start
        await asyncio.sleep(1)
        if _mantra_process.poll() is not None:
            stderr = _mantra_process.stderr.read().decode(errors="replace")
            _mantra_process = None
            raise HTTPException(
                status_code=500,
                detail=f"MantraAI failed to start: {stderr[:500]}"
            )
        return StatusResponse(
            status="running",
            message="MantraAI started successfully!",
            data={"pid": _mantra_process.pid}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mantra/stop")
async def mantra_stop():
    global _mantra_process
    if not _is_mantra_running():
        return StatusResponse(status="stopped", message="MantraAI is not running.")
    try:
        if sys.platform == "win32":
            _mantra_process.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            _mantra_process.terminate()
        _mantra_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _mantra_process.kill()
    finally:
        _mantra_process = None
    return StatusResponse(status="stopped", message="MantraAI has been stopped.")


# ── System Control Endpoints ──────────────────────────────────────────────────

@app.get("/api/system/volume")
async def get_volume():
    msg = system_control.get_volume()
    # Parse percentage from message like "Volume is at 50 percent."
    try:
        level = int("".join(c for c in msg.split("at")[1] if c.isdigit()))
    except (IndexError, ValueError):
        level = -1
    return StatusResponse(
        status="ok", message=msg, data={"level": level}
    )


@app.post("/api/system/volume")
async def set_volume(req: VolumeRequest):
    msg = system_control.set_volume(req.level)
    return StatusResponse(status="ok", message=msg, data={"level": req.level})


@app.post("/api/system/volume/up")
async def volume_up():
    msg = system_control.volume_up()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/system/volume/down")
async def volume_down():
    msg = system_control.volume_down()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/system/mute")
async def mute():
    msg = system_control.mute()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/system/unmute")
async def unmute():
    msg = system_control.unmute()
    return StatusResponse(status="ok", message=msg)


@app.get("/api/system/brightness")
async def get_brightness():
    level = _get_brightness()
    if level is None:
        return StatusResponse(
            status="ok",
            message="Brightness control not available on this display.",
            data={"level": -1}
        )
    return StatusResponse(
        status="ok",
        message=f"Brightness is at {level} percent.",
        data={"level": level}
    )


@app.post("/api/system/brightness")
async def set_brightness(req: BrightnessRequest):
    msg = system_control.set_brightness(req.level)
    return StatusResponse(status="ok", message=msg, data={"level": req.level})


@app.post("/api/system/brightness/up")
async def brightness_up():
    msg = system_control.brightness_up()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/system/brightness/down")
async def brightness_down():
    msg = system_control.brightness_down()
    return StatusResponse(status="ok", message=msg)


# ── Power Management Endpoints ───────────────────────────────────────────────

@app.post("/api/system/power")
async def power_action(req: PowerRequest):
    actions = {
        "shutdown": lambda: system_control.shutdown(delay=req.delay or 60),
        "restart": lambda: system_control.restart(delay=req.delay or 10),
        "sleep": system_control.sleep,
        "lock": system_control.lock,
        "cancel": system_control.cancel_shutdown,
    }
    action_fn = actions.get(req.action)
    if not action_fn:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown power action: {req.action}. "
                   f"Valid: {list(actions.keys())}"
        )
    msg = action_fn()
    return StatusResponse(status="ok", message=msg)


# ── App Launcher Endpoints ───────────────────────────────────────────────────

@app.post("/api/apps/open")
async def open_app(req: AppRequest):
    msg = automation.open_app(req.name)
    return StatusResponse(status="ok", message=msg)


@app.post("/api/apps/close")
async def close_app(req: AppRequest):
    msg = automation.close_app(req.name)
    return StatusResponse(status="ok", message=msg)


# ── Browser Endpoints ────────────────────────────────────────────────────────

@app.post("/api/browser/open")
async def open_browser(req: BrowserRequest):
    if req.url:
        msg = browser_tool.open_website(req.url)
    elif req.query:
        if req.platform == "youtube":
            msg = browser_tool.search_youtube(req.query)
        else:
            msg = browser_tool.search_google(req.query)
    else:
        raise HTTPException(status_code=400, detail="Provide url or query.")
    return StatusResponse(status="ok", message=msg)


# ── Screen Endpoints ─────────────────────────────────────────────────────────

@app.post("/api/screen/screenshot")
async def take_screenshot():
    msg = screen_tool.take_screenshot()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/screen/record/start")
async def start_recording():
    msg = screen_tool.start_recording()
    return StatusResponse(status="ok", message=msg)


@app.post("/api/screen/record/stop")
async def stop_recording():
    msg = screen_tool.stop_recording()
    return StatusResponse(status="ok", message=msg)


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "MantraAI API", "version": "3.2"}


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  MantraAI API Server v3.2")
    print("  http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
