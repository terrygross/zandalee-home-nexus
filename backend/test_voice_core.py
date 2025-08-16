
import unittest
import asyncio
import os
import tempfile
from unittest.mock import Mock, patch, AsyncMock
from main import VoiceCore

class TestVoiceCore(unittest.TestCase):
    def setUp(self):
        self.voice_core = VoiceCore()
    
    def test_command_construction(self):
        """Test child process command construction"""
        expected_cmd = [
            self.voice_core.voice_py,
            self.voice_core.bridge_path,
            "--transport", "STDIO",
            "--speak", "test text"
        ]
        
        # We can't directly test the private command construction,
        # but we can verify the paths are set correctly
        self.assertTrue(self.voice_core.voice_py.endswith("python.exe"))
        self.assertTrue(self.voice_core.bridge_path.endswith("voice_client.py"))
    
    def test_empty_text_handling(self):
        """Test speak endpoint with empty text"""
        async def run_test():
            result = await self.voice_core.speak("")
            self.assertEqual(result["ok"], False)
            self.assertEqual(result["error"], "empty text")
            
            result = await self.voice_core.speak("   ")
            self.assertEqual(result["ok"], False)
            self.assertEqual(result["error"], "empty text")
        
        asyncio.run(run_test())
    
    def test_missing_bridge_handling(self):
        """Test behavior when bridge file is missing"""
        # Create voice core with non-existent bridge path
        with tempfile.TemporaryDirectory() as temp_dir:
            voice_core = VoiceCore()
            voice_core.bridge_path = os.path.join(temp_dir, "nonexistent.py")
            
            async def run_test():
                result = await voice_core.speak("test")
                self.assertEqual(result["ok"], False)
                self.assertEqual(result["error"], "voice_client.py not found")
            
            asyncio.run(run_test())
    
    def test_busy_lock_behavior(self):
        """Test half-duplex busy lock behavior"""
        async def run_test():
            # Mock the subprocess execution to take some time
            with patch('asyncio.create_subprocess_exec') as mock_subprocess:
                mock_process = Mock()
                mock_process.communicate = AsyncMock(return_value=(b'', b''))
                mock_process.returncode = 0
                mock_subprocess.return_value = mock_process
                
                # Start first speak call (should succeed)
                task1 = asyncio.create_task(self.voice_core.speak("first"))
                
                # Give it a moment to acquire the lock
                await asyncio.sleep(0.01)
                
                # Start second speak call while first is running (should be busy)
                result2 = await self.voice_core.speak("second")
                
                # Second call should be rejected as busy
                self.assertEqual(result2["ok"], False)
                self.assertEqual(result2["error"], "busy")
                
                # Wait for first call to complete
                result1 = await task1
                self.assertEqual(result1["ok"], True)
        
        asyncio.run(run_test())
    
    def test_metrics_update_after_speak(self):
        """Test that metrics are updated after speak call"""
        async def run_test():
            # Initial metrics
            initial_metrics = self.voice_core.get_metrics()
            self.assertEqual(initial_metrics["last_tts_ms"], 0)
            self.assertFalse(initial_metrics["voice_active"])
            
            # Mock successful subprocess execution
            with patch('asyncio.create_subprocess_exec') as mock_subprocess:
                mock_process = Mock()
                mock_process.communicate = AsyncMock(return_value=(b'', b''))
                mock_process.returncode = 0
                mock_subprocess.return_value = mock_process
                
                # Mock bridge file exists
                with patch('os.path.exists', return_value=True):
                    result = await self.voice_core.speak("test")
                
                # Verify result and metrics update
                self.assertEqual(result["ok"], True)
                self.assertGreater(result["tts_ms"], 0)
                
                # Check updated metrics
                updated_metrics = self.voice_core.get_metrics()
                self.assertEqual(updated_metrics["last_tts_ms"], result["tts_ms"])
                self.assertFalse(updated_metrics["voice_active"])  # Should be False after completion
                self.assertIsNone(updated_metrics["last_error"])
        
        asyncio.run(run_test())
    
    def test_error_handling(self):
        """Test error handling when subprocess fails"""
        async def run_test():
            with patch('asyncio.create_subprocess_exec') as mock_subprocess:
                mock_process = Mock()
                mock_process.communicate = AsyncMock(return_value=(b'', b'TTS Error'))
                mock_process.returncode = 1
                mock_subprocess.return_value = mock_process
                
                with patch('os.path.exists', return_value=True):
                    result = await self.voice_core.speak("test")
                
                # Verify error handling
                self.assertEqual(result["ok"], False)
                self.assertEqual(result["error"], "TTS Error")
                
                # Check error is recorded in metrics
                metrics = self.voice_core.get_metrics()
                self.assertEqual(metrics["last_error"], "TTS Error")
        
        asyncio.run(run_test())

if __name__ == '__main__':
    unittest.main()
