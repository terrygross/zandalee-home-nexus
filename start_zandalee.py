
#!/usr/bin/env python3
"""
Zandalee AI Desktop - Startup Script
This script starts both the Python backend and opens the web interface
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_requirements():
    """Check if required Python packages are installed"""
    try:
        import fastapi
        import uvicorn
        print("✓ Python dependencies found")
        return True
    except ImportError as e:
        print(f"✗ Missing Python dependency: {e}")
        print("Please run: pip install -r backend/requirements.txt")
        return False

def start_backend():
    """Start the FastAPI backend server"""
    backend_dir = Path(__file__).parent / "backend"
    if not backend_dir.exists():
        print("✗ Backend directory not found")
        return None
    
    print("🚀 Starting Zandalee backend...")
    
    # Start the FastAPI server
    process = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "main:app", 
        "--host", "127.0.0.1", 
        "--port", "3001",
        "--reload"
    ], cwd=backend_dir)
    
    return process

def start_frontend():
    """Start the React development server"""
    print("🌐 Starting Zandalee web interface...")
    
    # Check if npm/yarn is available and node_modules exists
    if not Path("node_modules").exists():
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], check=True)
    
    # Start the Vite dev server
    process = subprocess.Popen([
        "npm", "run", "dev"
    ])
    
    return process

def main():
    print("=" * 50)
    print("🤖 Zandalee AI Desktop Assistant")
    print("=" * 50)
    
    # Check requirements
    if not check_python_requirements():
        sys.exit(1)
    
    try:
        # Start backend
        backend_process = start_backend()
        if not backend_process:
            sys.exit(1)
        
        # Wait a moment for backend to start
        print("⏳ Waiting for backend to initialize...")
        time.sleep(3)
        
        # Start frontend
        frontend_process = start_frontend()
        
        # Wait a moment for frontend to start
        print("⏳ Waiting for frontend to initialize...")
        time.sleep(5)
        
        # Open browser
        print("🌐 Opening Zandalee in your browser...")
        webbrowser.open("http://localhost:8080")
        
        print("\n" + "=" * 50)
        print("✅ Zandalee is now running!")
        print("🌐 Web Interface: http://localhost:8080")
        print("🔧 API Backend: http://localhost:3001")
        print("⌨️  Press Ctrl+C to stop both servers")
        print("=" * 50)
        
        # Wait for user to stop
        try:
            backend_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Shutting down Zandalee...")
            backend_process.terminate()
            frontend_process.terminate()
            print("✅ Zandalee stopped successfully")
    
    except Exception as e:
        print(f"❌ Error starting Zandalee: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
