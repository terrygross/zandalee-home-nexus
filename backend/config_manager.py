
import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class ConfigManager:
    def __init__(self, zandalee_home: str = None):
        self.zandalee_home = zandalee_home or os.getenv("ZANDALEE_HOME", "C:\\Users\\teren\\Documents\\Zandalee")
        self.config_dir = os.path.join(self.zandalee_home, "config")
        
        # Ensure config directory exists
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Config file paths
        self.config_files = {
            "audio": os.path.join(self.config_dir, "audio.json"),
            "llm": os.path.join(self.config_dir, "llm.json"),
            "ui": os.path.join(self.config_dir, "ui.json"),
            "avatar": os.path.join(self.config_dir, "avatar.json")
        }
        
        # Default configurations
        self.defaults = {
            "audio": {
                "input_device": {"id": -1, "name": "Default"},
                "output_device": {"id": -1, "name": "Default"},
                "volume": 0.8,
                "samplerate": 16000,
                "frame_ms": 10,
                "vad_mode": 1,
                "start_voiced_frames": 2,
                "end_unvoiced_frames": 500,
                "preroll_ms": 500,
                "silence_hold_ms": 5000
            },
            "llm": {
                "provider": "openai",
                "api_key": "",
                "model": "gpt-3.5-turbo",
                "base_url": "",
                "temperature": 0.7,
                "max_tokens": 1000,
                "streaming": True
            },
            "ui": {
                "theme": "system",
                "font_size": 14,
                "zoom_level": 1.0,
                "panels": {
                    "chat": True,
                    "meters": True,
                    "memory": True,
                    "actions": True,
                    "avatar": True
                },
                "self_test_on_start": True,
                "latency_meters": True,
                "earcons": True
            },
            "avatar": {
                "enabled": True,
                "style": "realistic",
                "lip_sync": True,
                "renderer": "webgl",
                "performance": {
                    "fps_cap": 30,
                    "quality": "medium"
                },
                "sandbox": {
                    "separate_process": False
                }
            }
        }
        
        # Required fields for validation
        self.required_fields = {
            "audio": ["input_device", "output_device", "volume"],
            "llm": ["provider", "api_key", "model"],
            "ui": ["theme", "font_size", "zoom_level"],
            "avatar": ["enabled", "style", "lip_sync"]
        }
    
    def _validate_config(self, config_type: str, config_data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate configuration data"""
        if config_type not in self.required_fields:
            return False, f"Unknown config type: {config_type}"
        
        required = self.required_fields[config_type]
        missing_fields = []
        
        for field in required:
            if field not in config_data:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"
        
        # Type-specific validation
        if config_type == "audio":
            if not isinstance(config_data["volume"], (int, float)) or not 0 <= config_data["volume"] <= 1:
                return False, "Volume must be a number between 0 and 1"
        
        elif config_type == "llm":
            valid_providers = ["openai", "deepseek", "custom", "gemini", "meta", "ollama"]
            if config_data["provider"] not in valid_providers:
                return False, f"Provider must be one of: {', '.join(valid_providers)}"
        
        elif config_type == "ui":
            valid_themes = ["light", "dark", "system"]
            if config_data["theme"] not in valid_themes:
                return False, f"Theme must be one of: {', '.join(valid_themes)}"
            
            if not isinstance(config_data["font_size"], (int, float)) or config_data["font_size"] < 8:
                return False, "Font size must be a number >= 8"
            
            if not isinstance(config_data["zoom_level"], (int, float)) or config_data["zoom_level"] <= 0:
                return False, "Zoom level must be a positive number"
        
        elif config_type == "avatar":
            if not isinstance(config_data["enabled"], bool):
                return False, "Avatar enabled must be a boolean"
            
            if not isinstance(config_data["lip_sync"], bool):
                return False, "Lip sync must be a boolean"
        
        return True, ""
    
    def load_config(self, config_type: str) -> Dict[str, Any]:
        """Load configuration from disk with fallback to defaults"""
        if config_type not in self.config_files:
            logger.error(f"Unknown config type: {config_type}")
            return {}
        
        config_file = self.config_files[config_type]
        
        try:
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                
                # Validate loaded config
                is_valid, error_msg = self._validate_config(config_type, config_data)
                if is_valid:
                    logger.info(f"Loaded {config_type} config from {config_file}")
                    return config_data
                else:
                    logger.warning(f"Invalid {config_type} config: {error_msg}. Using defaults.")
            else:
                logger.info(f"Config file {config_file} not found. Using defaults.")
        
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load {config_type} config: {e}. Using defaults.")
        
        # Return defaults if loading failed
        default_config = self.defaults[config_type].copy()
        self.save_config(config_type, default_config)  # Save defaults to disk
        return default_config
    
    def save_config(self, config_type: str, config_data: Dict[str, Any]) -> tuple[bool, str]:
        """Save configuration to disk with validation"""
        if config_type not in self.config_files:
            return False, f"Unknown config type: {config_type}"
        
        # Validate config before saving
        is_valid, error_msg = self._validate_config(config_type, config_data)
        if not is_valid:
            return False, error_msg
        
        config_file = self.config_files[config_type]
        
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(config_file), exist_ok=True)
            
            # Add metadata
            config_with_meta = config_data.copy()
            config_with_meta["updated_at"] = self._get_timestamp()
            config_with_meta["machine"] = os.environ.get("COMPUTERNAME", "unknown")
            
            # Write to file
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config_with_meta, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved {config_type} config to {config_file}")
            return True, ""
        
        except (IOError, OSError) as e:
            error_msg = f"Failed to save {config_type} config: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def get_all_configs(self) -> Dict[str, Dict[str, Any]]:
        """Load all configuration types"""
        return {
            config_type: self.load_config(config_type)
            for config_type in self.config_files.keys()
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def reset_config(self, config_type: str) -> tuple[bool, str]:
        """Reset configuration to defaults"""
        if config_type not in self.defaults:
            return False, f"Unknown config type: {config_type}"
        
        default_config = self.defaults[config_type].copy()
        return self.save_config(config_type, default_config)
