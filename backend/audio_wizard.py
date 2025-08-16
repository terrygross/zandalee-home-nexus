
import os
import json
import time
import logging
import platform
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import sounddevice as sd
import webrtcvad
from pathlib import Path

logger = logging.getLogger(__name__)

class AudioWizard:
    def __init__(self):
        self.zandalee_home = os.getenv("ZANDALEE_HOME", "C:\\Users\\teren\\Documents\\Zandalee")
        self.config_dir = os.path.join(self.zandalee_home, "config")
        self.audio_config_path = os.path.join(self.config_dir, "audio.json")
        
        # Ensure directories exist
        os.makedirs(self.config_dir, exist_ok=True)
        
        # VAD setup
        self.vad = webrtcvad.Vad()
        
    def list_devices(self) -> List[Dict[str, Any]]:
        """List available input devices, filtered for real devices"""
        try:
            devices = sd.query_devices()
            input_devices = []
            
            for i, device in enumerate(devices):
                if device['max_input_channels'] > 0:
                    # Filter out problematic devices
                    name = device['name'].strip()
                    if any(skip in name.lower() for skip in [
                        'sound mapper', 'primary capture', 'communications',
                        'loopback', 'stereo mix', 'what u hear'
                    ]):
                        continue
                    
                    input_devices.append({
                        'id': i,
                        'name': name,
                        'max_input_channels': device['max_input_channels'],
                        'samplerate': int(device['default_samplerate'])
                    })
            
            return input_devices
        except Exception as e:
            logger.error(f"Failed to list devices: {e}")
            return []
    
    def test_device_samplerates(self, device_id: int, samplerates: List[int] = None) -> Optional[int]:
        """Test which samplerates work for a device"""
        if samplerates is None:
            samplerates = [16000, 48000, 44100]
        
        for sr in samplerates:
            try:
                # Try to open a brief stream to test
                with sd.RawInputStream(
                    device=device_id,
                    samplerate=sr,
                    channels=1,
                    dtype='int16',
                    blocksize=int(sr * 0.01)  # 10ms
                ):
                    return sr
            except Exception:
                continue
        
        return None
    
    def capture_audio(self, device_id: int, samplerate: int, duration_sec: float) -> Tuple[np.ndarray, bool]:
        """Capture audio from device"""
        frames_per_buffer = int(samplerate * 0.01)  # 10ms
        total_frames = int(samplerate * duration_sec)
        audio_data = []
        had_errors = False
        
        try:
            def callback(indata, frames, time, status):
                nonlocal had_errors
                if status:
                    had_errors = True
                    logger.warning(f"Audio callback status: {status}")
                audio_data.extend(indata[:, 0])  # Take first channel
            
            with sd.RawInputStream(
                device=device_id,
                samplerate=samplerate,
                channels=1,
                dtype='int16',
                blocksize=frames_per_buffer,
                callback=callback
            ):
                # Record for specified duration
                sd.sleep(int(duration_sec * 1000))
            
            if len(audio_data) < total_frames * 0.8:  # Allow some tolerance
                logger.warning(f"Insufficient audio data captured: {len(audio_data)}/{total_frames}")
                had_errors = True
            
            return np.array(audio_data, dtype=np.int16), had_errors
            
        except Exception as e:
            logger.error(f"Capture failed: {e}")
            return np.array([], dtype=np.int16), True
    
    def detect_voice_segments(self, audio: np.ndarray, samplerate: int, 
                            frame_ms: int = 10, vad_mode: int = 1,
                            start_voiced_frames: int = 2) -> Tuple[List[bool], float, int]:
        """Use WebRTC VAD to detect voice segments"""
        self.vad.set_mode(vad_mode)
        
        frame_samples = int(samplerate * frame_ms / 1000)
        total_frames = len(audio) // frame_samples
        voice_flags = []
        voiced_count = 0
        start_delay_frames = -1
        
        for i in range(total_frames):
            start_idx = i * frame_samples
            end_idx = start_idx + frame_samples
            frame = audio[start_idx:end_idx]
            
            if len(frame) < frame_samples:
                break
            
            # Convert to bytes for VAD
            frame_bytes = frame.tobytes()
            
            try:
                is_voice = self.vad.is_speech(frame_bytes, samplerate)
                voice_flags.append(is_voice)
                
                if is_voice:
                    voiced_count += 1
                    if start_delay_frames == -1 and voiced_count >= start_voiced_frames:
                        start_delay_frames = i
                        
            except Exception:
                voice_flags.append(False)
        
        voiced_ratio = voiced_count / max(total_frames, 1)
        start_delay_ms = start_delay_frames * frame_ms if start_delay_frames >= 0 else 0
        
        return voice_flags, voiced_ratio, start_delay_ms
    
    def compute_audio_metrics(self, noise_audio: np.ndarray, voice_audio: np.ndarray, 
                            samplerate: int, frame_ms: int = 10) -> Dict[str, float]:
        """Compute comprehensive audio quality metrics"""
        eps = 1e-10
        
        # RMS calculations
        noise_rms = np.sqrt(np.mean(noise_audio.astype(float) ** 2)) / 32768.0
        voice_rms = np.sqrt(np.mean(voice_audio.astype(float) ** 2)) / 32768.0
        
        # SNR calculation
        snr_db = 20 * np.log10(max(voice_rms, eps) / max(noise_rms, eps))
        
        # Voice activity detection
        voice_flags, voiced_ratio, start_delay_ms = self.detect_voice_segments(
            voice_audio, samplerate, frame_ms
        )
        
        # Clipping detection (within 1% of int16 range)
        clipping_threshold = int(0.99 * 32767)
        clipped_samples = np.sum(np.abs(voice_audio) >= clipping_threshold)
        clipping_pct = (clipped_samples / max(len(voice_audio), 1)) * 100
        
        # For now, dropout detection is basic (would need stream callback status)
        dropouts = 0
        
        return {
            'noise_rms': float(noise_rms),
            'voice_rms': float(voice_rms),
            'snr_db': float(snr_db),
            'voiced_ratio': float(voiced_ratio),
            'start_delay_ms': float(start_delay_ms),
            'clipping_pct': float(clipping_pct),
            'dropouts': int(dropouts)
        }
    
    def compute_device_score(self, metrics: Dict[str, float]) -> float:
        """Compute device quality score using the specified formula"""
        # Normalize SNR (target range 15-35 dB)
        snr_norm = np.clip(metrics['snr_db'] / 35.0, 0, 1)
        
        # Voice ratio score (optimal range 0.4-0.8)
        voiced_ratio = metrics['voiced_ratio']
        if voiced_ratio < 0.4:
            voice_score = voiced_ratio / 0.4
        elif voiced_ratio > 0.8:
            voice_score = 1.0 - (voiced_ratio - 0.8) / 0.2
        else:
            voice_score = 1.0
        
        # Delay penalty (target 0-40ms)
        delay_penalty = np.clip(metrics['start_delay_ms'] / 40.0, 0, 1)
        
        # Clipping penalty (target < 5%)
        clipping_penalty = np.clip(metrics['clipping_pct'] / 5.0, 0, 1)
        
        # Dropout penalty (target 0)
        dropout_penalty = min(metrics['dropouts'] / 10.0, 1)
        
        # Weighted score
        score = (0.50 * snr_norm + 
                0.20 * voice_score - 
                0.15 * delay_penalty - 
                0.10 * clipping_penalty - 
                0.05 * dropout_penalty)
        
        return max(0.0, score)
    
    def test_single_device(self, device_id: int, device_name: str, 
                          config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Test a single device with noise floor and voice tests"""
        logger.info(f"Testing device {device_id}: {device_name}")
        
        # Test samplerates
        samplerate = self.test_device_samplerates(device_id, config.get('samplerates', [16000, 48000, 44100]))
        if not samplerate:
            logger.warning(f"Device {device_id} failed all samplerate tests")
            return None
        
        try:
            # Phase 1: Noise floor (1 second)
            logger.debug(f"  Phase 1: Recording noise floor")
            noise_audio, noise_errors = self.capture_audio(device_id, samplerate, 1.0)
            if noise_errors or len(noise_audio) == 0:
                logger.warning(f"Device {device_id} noise capture failed")
                return None
            
            # Phase 2: Voice test (up to 10 seconds with VAD)
            logger.debug(f"  Phase 2: Voice test - say '{config.get('voice_prompt', 'testing one two three')}'")
            
            # Simple beep notification (optional - could use winsound on Windows)
            try:
                import winsound
                winsound.Beep(800, 200)  # 800Hz for 200ms
            except:
                pass  # Skip beep if not available
            
            # Record voice with preroll
            voice_audio, voice_errors = self.capture_audio(device_id, samplerate, 6.0)  # 6 seconds for voice test
            if voice_errors or len(voice_audio) == 0:
                logger.warning(f"Device {device_id} voice capture failed")
                return None
            
            # Compute metrics
            metrics = self.compute_audio_metrics(
                noise_audio, voice_audio, samplerate, 
                config.get('frame_ms', 10)
            )
            
            # Compute score
            score = self.compute_device_score(metrics)
            
            result = {
                'id': device_id,
                'name': device_name,
                'samplerate': samplerate,
                'score': score,
                **metrics
            }
            
            logger.info(f"  Results: SNR={metrics['snr_db']:.1f}dB, Voiced={metrics['voiced_ratio']*100:.1f}%, Score={score*100:.1f}")
            return result
            
        except Exception as e:
            logger.error(f"Device {device_id} test failed: {e}")
            return None
    
    def run_wizard(self, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run the complete mic wizard"""
        if config is None:
            config = {}
        
        # Set defaults
        config.setdefault('frame_ms', 10)
        config.setdefault('samplerates', [16000, 48000, 44100])
        config.setdefault('vad_mode', 1)
        config.setdefault('start_voiced_frames', 2)
        config.setdefault('silence_hold_ms', 5000)
        config.setdefault('preroll_ms', 500)
        config.setdefault('voice_prompt', 'testing one two three')
        
        logger.info("Starting Mic Wizard")
        
        # Get available devices
        devices = self.list_devices()
        if not devices:
            return {"ok": False, "error": "no_input_devices"}
        
        logger.info(f"Found {len(devices)} candidate devices")
        
        # Test each device
        results = []
        for device in devices:
            result = self.test_single_device(device['id'], device['name'], config)
            if result:
                results.append(result)
        
        if not results:
            return {"ok": False, "error": "no_working_devices"}
        
        # Sort by score (desc), then by start_delay_ms (asc), then by snr_db (desc)
        results.sort(key=lambda x: (-x['score'], x['start_delay_ms'], -x['snr_db']))
        
        # Choose best device
        chosen_device = results[0]
        chosen_config = {
            'id': chosen_device['id'],
            'name': chosen_device['name'],
            'samplerate': chosen_device['samplerate'],
            'frame_ms': config['frame_ms'],
            'vad_mode': config['vad_mode'],
            'start_voiced_frames': config['start_voiced_frames'],
            'end_unvoiced_frames': config['silence_hold_ms'] // config['frame_ms'],
            'preroll_ms': config['preroll_ms'],
            'silence_hold_ms': config['silence_hold_ms']
        }
        
        # Persist configuration
        self.save_audio_config(chosen_config)
        
        logger.info(f"Wizard complete. Chosen device: {chosen_device['name']} (score: {chosen_device['score']*100:.1f})")
        
        return {
            "ok": True,
            "results": results,
            "chosen": chosen_config
        }
    
    def save_audio_config(self, config: Dict[str, Any]) -> bool:
        """Save audio configuration to local JSON file"""
        try:
            full_config = {
                "machine": platform.node(),
                "device_id": config['id'],
                "device_name": config['name'],
                "samplerate": config['samplerate'],
                "frame_ms": config['frame_ms'],
                "vad_mode": config['vad_mode'],
                "start_voiced_frames": config['start_voiced_frames'],
                "end_unvoiced_frames": config['end_unvoiced_frames'],
                "preroll_ms": config['preroll_ms'],
                "silence_hold_ms": config['silence_hold_ms'],
                "updated_at": datetime.now().isoformat()
            }
            
            with open(self.audio_config_path, 'w') as f:
                json.dump(full_config, f, indent=2)
            
            logger.info(f"Audio config saved to {self.audio_config_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save audio config: {e}")
            return False
    
    def load_audio_config(self) -> Optional[Dict[str, Any]]:
        """Load audio configuration from local JSON file"""
        try:
            if os.path.exists(self.audio_config_path):
                with open(self.audio_config_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load audio config: {e}")
        return None
    
    def use_device(self, device_id: int) -> Dict[str, Any]:
        """Manually set a device (bypassing wizard)"""
        devices = self.list_devices()
        device = next((d for d in devices if d['id'] == device_id), None)
        
        if not device:
            return {"ok": False, "error": "device_not_found"}
        
        # Test the device quickly
        samplerate = self.test_device_samplerates(device_id)
        if not samplerate:
            return {"ok": False, "error": "device_not_working"}
        
        # Create basic config
        config = {
            'id': device_id,
            'name': device['name'],
            'samplerate': samplerate,
            'frame_ms': 10,
            'vad_mode': 1,
            'start_voiced_frames': 2,
            'end_unvoiced_frames': 500,
            'preroll_ms': 500,
            'silence_hold_ms': 5000
        }
        
        success = self.save_audio_config(config)
        return {"ok": success}
