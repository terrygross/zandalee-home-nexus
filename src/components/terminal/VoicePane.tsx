
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGateway } from '@/hooks/useGateway';

export const VoicePane = () => {
  const [selectedVoice, setSelectedVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);

  const { voices } = useGateway();

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const voiceList = await voices();
      // Filter out any empty or invalid voices
      const validVoices = voiceList.filter(voice => voice && voice.trim() !== '');
      setAvailableVoices(validVoices);
      const saved = localStorage.getItem('selected_voice');
      if (saved && validVoices.includes(saved)) {
        setSelectedVoice(saved);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setAvailableVoices([]);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selected_voice', voice);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            {availableVoices.length > 0 ? (
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices.map((voice, index) => (
                    <SelectItem key={`voice-${index}-${voice}`} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                placeholder="Enter voice name"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
