# voice_console.py
# Polished terminal UI for Zandalee Voice Service.
# - Shows live health
# - Dropdown-style mic selection
# - Recalibrate microphones
# - Mute / Unmute
# - Type text to speak
# - Probe mic levels
#
# Depends: rich (pip install rich)

from __future__ import annotations
import os
import sys
import time
from typing import Any, Dict, List, Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, IntPrompt, Confirm
from rich.text import Text
from rich.box import ROUNDED

# local client wrapper
from voice_client import VoiceServiceClient

console = Console()

def human_endpoint_list(endpoints: List[str]) -> str:
    try:
        return ", ".join([e.split()[0] for e in endpoints])
    except Exception:
        return ", ".join(endpoints or [])

def show_header():
    console.clear()
    title = Text("Zandalee — Voice Control", style="bold cyan")
    console.rule(title)

def draw_health(c: VoiceServiceClient) -> Dict[str, Any]:
    try:
        h = c.health()
    except Exception as e:
        console.print(Panel.fit(f"[red]Voice service not reachable[/red]\n{e}", title="Health", style="red"))
        return {"ok": False, "error": str(e)}

    ok = h.get("ok", False)
    mute = h.get("mute", False)
    mic = h.get("input_device_id", None)
    ver = h.get("version", "?")
    cfg_path = h.get("config_path", "")
    endpoints = human_endpoint_list(h.get("endpoints", []))

    status = "[green]OK[/green]" if ok else "[red]ERROR[/red]"
    mute_s = "[yellow]Muted[/yellow]" if mute else "[green]Unmuted[/green]"
    mic_s = f"[cyan]{mic}[/cyan]" if mic is not None else "[yellow]None[/yellow]"

    grid = Table.grid(padding=(0, 2))
    grid.add_column(justify="right", style="bold")
    grid.add_column()
    grid.add_row("Status", status)
    grid.add_row("Mute", mute_s)
    grid.add_row("Mic Device ID", mic_s)
    grid.add_row("Version", ver)
    grid.add_row("Config", cfg_path or "-")
    grid.add_row("Endpoints", endpoints or "-")

    console.print(Panel(grid, title="Health", box=ROUNDED))
    return h

def list_devices(c: VoiceServiceClient) -> List[Dict[str, Any]]:
    d = c.devices()
    devices = d.get("devices", []) or []
    table = Table(box=ROUNDED)
    table.add_column("ID", justify="right", style="bold")
    table.add_column("Name")
    table.add_column("HostAPI", justify="center")
    table.add_column("Channels", justify="right")
    table.add_column("Default", justify="center")
    for dev in devices:
        table.add_row(
            str(dev.get("id")),
            str(dev.get("name")),
            str(dev.get("hostapi")),
            str(dev.get("max_input_channels")),
            "✓" if dev.get("default") else ""
        )
    console.print(Panel(table, title="Input Devices"))
    return devices

def choose_device(c: VoiceServiceClient):
    devices = list_devices(c)
    if not devices:
        console.print("[red]No input-capable devices found.[/red]")
        return
    ids = [d["id"] for d in devices if "id" in d]
    while True:
        try:
            did = IntPrompt.ask("Enter device ID to select", default=ids[0] if ids else 0)
        except KeyboardInterrupt:
            console.print("\n[yellow]Cancelled.[/yellow]")
            return
        if did in ids:
            res = c.set_input_device(did)
            if res.get("ok"):
                console.print(f"[green]Selected mic {did}.[/green]")
            else:
                console.print(f"[red]Failed to set device:[/red] {res}")
            return
        console.print(f"[yellow]Invalid ID {did}. Try again.[/yellow]")

def recalibrate(c: VoiceServiceClient):
    console.print("[cyan]Starting calibration. I will speak prompts — please follow them and talk clearly.[/cyan]")
    res = c.calibrate_mics()
    if not res.get("ok"):
        console.print(f"[red]Calibration failed:[/red] {res}")
        return
    sel = res.get("selected_device_id", None)
    ranked = res.get("ranked", [])[:5]
    table = Table(box=ROUNDED)
    table.add_column("Rank", justify="right")
    table.add_column("ID", justify="right")
    table.add_column("Name")
    table.add_column("Score", justify="right")
    for i, r in enumerate(ranked, start=1):
        table.add_row(str(i), str(r.get("id")), str(r.get("name")), str(r.get("score", "-")))
    console.print(Panel(table, title=f"Calibration done. Selected: {sel}"))
    time.sleep(0.5)

def probe(c: VoiceServiceClient):
    console.print("[cyan]Recording ~2 seconds… speak now.[/cyan]")
    res = c.probe_mic()
    if not res.get("ok"):
        console.print(f"[red]Probe failed:[/red] {res}")
        return
    peak = res.get("peak")
    rms = res.get("rms")
    wav = res.get("wav_path")
    console.print(Panel.fit(f"Peak: {peak}\nRMS: {rms}\nWAV: {wav}", title="Mic Probe"))

def speak(c: VoiceServiceClient):
    text = Prompt.ask("What should Zandalee say?")
    if not text.strip():
        return
    res = c.speak(text)
    if res.get("ok"):
        console.print(f"[green]Said:[/green] {text}")
    else:
        console.print(f"[red]Speak failed:[/red] {res}")

def toggle_mute(c: VoiceServiceClient):
    h = c.health()
    muted = h.get("mute", False)
    res = c.unmute() if muted else c.mute()
    if res.get("ok"):
        console.print("[green]Muted[/green]" if not muted else "[green]Unmuted[/green]")
    else:
        console.print(f"[red]Mute toggle failed:[/red] {res}")

def main():
    base = os.environ.get("ZANDALEE_VOICE_URL", "http://127.0.0.1:8765")
    c = VoiceServiceClient(base_url=base)
    show_header()
    draw_health(c)

    while True:
        console.print()
        console.print("[bold]Actions[/bold]:")
        console.print("  [cyan]1[/cyan] • List devices")
        console.print("  [cyan]2[/cyan] • Select mic (dropdown style)")
        console.print("  [cyan]3[/cyan] • Recalibrate microphones")
        console.print("  [cyan]4[/cyan] • Probe mic level (~2s)")
        console.print("  [cyan]5[/cyan] • Mute / Unmute")
        console.print("  [cyan]6[/cyan] • Speak a line")
        console.print("  [cyan]R[/cyan] • Refresh health")
        console.print("  [cyan]Q[/cyan] • Quit")

        choice = Prompt.ask("[bold]Choose[/bold]", choices=["1","2","3","4","5","6","R","Q","r","q"], default="R").upper()
        try:
            if choice == "1":
                list_devices(c)
            elif choice == "2":
                choose_device(c)
            elif choice == "3":
                recalibrate(c)
            elif choice == "4":
                probe(c)
            elif choice == "5":
                toggle_mute(c)
            elif choice == "6":
                speak(c)
            elif choice == "R":
                pass
            elif choice == "Q":
                console.print("\n[green]Goodbye.[/green]")
                return
        finally:
            # Always re-draw header + health after an action
            time.sleep(0.2)
            show_header()
            draw_health(c)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[yellow]Exited.[/yellow]")
        sys.exit(0)
