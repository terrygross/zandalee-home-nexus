
#!/usr/bin/env python3
"""
Voice Client Bridge for Zandalee AI
Connects the web interface to your existing local-talking-llm stack
"""

import asyncio
import json
import sys
import os
import subprocess
import time
from typing import Optional, Dict, Any
import argparse

class LocalTalkingLLMBridge:
    def __init__(self, transport: str = "STDIO"):
        self.transport = transport
        self.local_llm_path = os.getenv("LOCAL_TALKING_LLM_PATH", "C:\\Users\\teren\\Documents\\Zandalee\\local-talking-llm")
        self.python_path = os.getenv("VOICE_PY", os.path.join(self.local_llm_path, ".venv", "Scripts", "python.exe"))
        self.metrics = {"stt": 0, "llm": 0, "tts": 0, "total": 0, "vu_level": 0}
        
    async def speak(self, text: str) -> Dict[str, Any]:
        """Send text to your existing TTS system"""
        try:
            start_time = time.time()
            
            # Call your existing TTS script
            process = await asyncio.create_subprocess_exec(
                self.python_path,
                "main.py",  # Adjust this to your actual TTS script
                "--tts-only",
                "--text", text,
                cwd=self.local_llm_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            tts_time = (time.time() - start_time) * 1000
            self.metrics["tts"] = tts_time
            self.metrics["total"] = tts_time
            
            if process.returncode == 0:
                return {"status": "success", "message": "Speech synthesized", "duration_ms": tts_time}
            else:
                return {"status": "error", "message": f"TTS failed: {stderr.decode()}", "duration_ms": tts_time}
                
        except Exception as e:
            return {"status": "error", "message": f"Voice synthesis error: {str(e)}"}
    
    async def listen(self) -> Dict[str, Any]:
        """Capture voice input using your existing STT system"""
        try:
            start_time = time.time()
            
            # Call your existing STT script
            process = await asyncio.create_subprocess_exec(
                self.python_path,
                "main.py",  # Adjust this to your actual STT script
                "--stt-only",
                "--listen",
                cwd=self.local_llm_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            stt_time = (time.time() - start_time) * 1000
            self.metrics["stt"] = stt_time
            
            if process.returncode == 0:
                transcript = stdout.decode().strip()
                return {"status": "success", "transcript": transcript, "duration_ms": stt_time}
            else:
                return {"status": "error", "message": f"STT failed: {stderr.decode()}", "duration_ms": stt_time}
                
        except Exception as e:
            return {"status": "error", "message": f"Voice recognition error: {str(e)}"}
    
    async def get_voice_metrics(self) -> Dict[str, float]:
        """Get real-time voice metrics"""
        # For now, return the stored metrics
        # Later, you can integrate with your existing metrics system
        return self.metrics.copy()
    
    async def set_vu_level(self, level: float):
        """Update VU meter level from your audio system"""
        self.metrics["vu_level"] = level

async def main():
    parser = argparse.ArgumentParser(description="Zandalee Voice Client Bridge")
    parser.add_argument("--transport", choices=["STDIO", "HTTP"], default="STDIO")
    parser.add_argument("--speak", type=str, help="Text to speak")
    parser.add_argument("--listen", action="store_true", help="Listen for voice input")
    parser.add_argument("--metrics", action="store_true", help="Get voice metrics")
    
    args = parser.parse_args()
    
    bridge = LocalTalkingLLMBridge(args.transport)
    
    if args.speak:
        result = await bridge.speak(args.speak)
        print(json.dumps(result))
    elif args.listen:
        result = await bridge.listen()
        print(json.dumps(result))
    elif args.metrics:
        result = await bridge.get_voice_metrics()
        print(json.dumps(result))
    else:
        # Interactive mode for testing
        print("Zandalee Voice Client Bridge - Interactive Mode")
        print("Commands: speak <text>, listen, metrics, quit")
        
        while True:
            try:
                command = input("> ").strip().split(" ", 1)
                
                if command[0] == "speak" and len(command) > 1:
                    result = await bridge.speak(command[1])
                    print(json.dumps(result, indent=2))
                elif command[0] == "listen":
                    result = await bridge.listen()
                    print(json.dumps(result, indent=2))
                elif command[0] == "metrics":
                    result = await bridge.get_voice_metrics()
                    print(json.dumps(result, indent=2))
                elif command[0] == "quit":
                    break
                else:
                    print("Unknown command. Use: speak <text>, listen, metrics, quit")
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
