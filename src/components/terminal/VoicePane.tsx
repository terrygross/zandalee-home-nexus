
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGateway } from '@/hooks/useGateway';

export const VoicePane = () => {
  const [selectedVoice, setSelectedVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { voices } = useGateway();

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);
      console.log('Loading voices...');
      const voiceList = await voices();
      console.log('Raw voice list:', voiceList);
      
      // Filter out any empty or invalid voices
      const validVoices = voiceList?.voices?.filter(voice => voice && voice.trim() !== '') || [];
      console.log('Valid voices:', validVoices);
      
      setAvailableVoices(validVoices);
      const saved = localStorage.getItem('selected_voice');
      if (saved && validVoices.includes(saved)) {
        setSelectedVoice(saved);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setAvailableVoices([]);
    } finally {
      setLoading(false);
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
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading voices...</div>
            ) : availableVoices.length > 0 ? (
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
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">No voices available. Enter manually:</div>
                <Input
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  placeholder="Enter voice name"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
