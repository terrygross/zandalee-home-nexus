import json
import os

VERSION_FILE = "version.json"
DEFAULT_VERSION = "1.0"

def load_version():
    if not os.path.exists(VERSION_FILE):
        save_version(DEFAULT_VERSION)
        return DEFAULT_VERSION
    with open(VERSION_FILE, "r") as f:
        return json.load(f).get("version", DEFAULT_VERSION)

def save_version(version):
    with open(VERSION_FILE, "w") as f:
        json.dump({"version": version}, f, indent=2)

def bump_version():
    current = load_version()
    major, minor = map(int, current.split("."))
    if minor < 9:
        minor += 1
    else:
        major += 1
        minor = 0
    new_version = f"{major}.{minor}"
    save_version(new_version)
    return new_version

def get_version():
    return load_version()
