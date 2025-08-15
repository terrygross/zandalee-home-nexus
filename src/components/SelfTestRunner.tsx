
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZandaleeAPI } from "@/hooks/useZandaleeAPI";

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const SelfTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState('');
  const { toast } = useToast();
  const { runSelfTest } = useZandaleeAPI();

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    try {
      setCurrentTest('Running comprehensive self-test...');
      const testResults = await runSelfTest();
      
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 20) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setResults(testResults);
      setCurrentTest('');

      const allPassed = testResults.every(result => result.passed);
      toast({
        title: allPassed ? "Self-Test Passed" : "Self-Test Issues Found",
        description: allPassed 
          ? "All systems are functioning correctly" 
          : "Some components need attention",
        variant: allPassed ? "default" : "destructive"
      });

    } catch (error) {
      toast({
        title: "Self-Test Error",
        description: error instanceof Error ? error.message : 'Failed to run self-test',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  const getOverallStatus = () => {
    if (results.length === 0) return { status: 'pending', color: 'text-text-muted' };
    const allPassed = results.every(result => result.passed);
    return {
      status: allPassed ? 'passed' : 'failed',
      color: allPassed ? 'text-status-success' : 'text-status-error'
    };
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-text-primary text-sm">
          <Play className="w-4 h-4 text-energy-glow" />
          <span>System Self-Test</span>
        </CardTitle>
        <CardDescription className="text-text-secondary text-xs">
          Verify all components are working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            onClick={runTests}
            disabled={isRunning}
            className="bg-energy-glow/20 hover:bg-energy-glow/30 text-energy-glow border border-energy-glow/30 text-xs"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? 'Running Tests...' : 'Run Self-Test'}
          </Button>

          <div className={`text-xs font-medium ${overallStatus.color}`}>
            Status: {overallStatus.status.toUpperCase()}
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-text-muted text-center">
              {currentTest || 'Initializing tests...'}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-text-primary">Test Results:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-space-surface/30 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {result.passed ? (
                      <CheckCircle className="w-4 h-4 text-status-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-status-error" />
                    )}
                    <span className="text-xs font-medium text-text-primary">
                      {result.test}
                    </span>
                  </div>
                  <span className={`text-xs ${result.passed ? 'text-status-success' : 'text-status-error'}`}>
                    {result.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/30">
              <div className="text-xs text-text-muted">
                <strong>Summary:</strong> {results.filter(r => r.passed).length}/{results.length} tests passed
              </div>
              {results.some(r => !r.passed) && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-medium text-status-error">Issues Found:</div>
                  {results.filter(r => !r.passed).map((result, index) => (
                    <div key={index} className="text-xs text-text-secondary ml-2">
                      • {result.test}: {result.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-text-muted border-t border-border/30 pt-2">
          Self-test verifies daemon connection, TTS functionality, and microphone availability.
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfTestRunner;
