import { useState, useEffect, useRef } from "react";
import { Shield, Plus, Upload, Key, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api, Policy } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function SecurityTab() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [lawsToken, setLawsToken] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    kind: "file_access",
    value: "",
    action: "allow" as "allow" | "block"
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const response = await api.policy_list();
      if (response.ok && response.data) {
        setPolicies(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load security policies",
        variant: "destructive"
      });
    }
  };

  const handleAddPolicy = async () => {
    if (!newPolicy.value.trim()) return;

    try {
      const response = newPolicy.action === 'allow' 
        ? await api.policy_allow(newPolicy.kind, newPolicy.value)
        : await api.policy_block(newPolicy.kind, newPolicy.value);

      if (response.ok) {
        toast({
          title: "Policy Added",
          description: `${newPolicy.action === 'allow' ? 'Allowed' : 'Blocked'} ${newPolicy.kind}: ${newPolicy.value}`
        });
        setNewPolicy({ kind: "file_access", value: "", action: "allow" });
        setIsAddingPolicy(false);
        loadPolicies();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add security policy",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON file",
        variant: "destructive"
      });
    }
  };

  const handleUpdateLaws = async () => {
    if (!selectedFile || !lawsToken.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a JSON file and enter a token",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await api.laws_update_from_file(selectedFile.name, lawsToken);
      if (response.ok) {
        toast({
          title: "Laws Updated",
          description: "Core laws have been updated successfully"
        });
        setSelectedFile(null);
        setLawsToken("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update laws",
        variant: "destructive"
      });
    }
  };

  const policyKinds = [
    "file_access",
    "network",
    "system",
    "user_data",
    "api_access",
    "memory",
    "conversation"
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Security & Laws</h3>
      </div>

      {/* Add Policy Section */}
      <Card className="border-primary/20 bg-gradient-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Security Policies</CardTitle>
            <Button
              onClick={() => setIsAddingPolicy(!isAddingPolicy)}
              variant="outline"
              size="sm"
              className="border-primary/30"
            >
              <Plus className="w-3 h-3 mr-1" />
              {isAddingPolicy ? "Cancel" : "Add"}
            </Button>
          </div>
        </CardHeader>
        
        {isAddingPolicy && (
          <CardContent className="space-y-3">
            <div>
              <Select value={newPolicy.kind} onValueChange={(value) => setNewPolicy({...newPolicy, kind: value})}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Policy kind" />
                </SelectTrigger>
                <SelectContent>
                  {policyKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {kind.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Input
              placeholder="Policy value..."
              value={newPolicy.value}
              onChange={(e) => setNewPolicy({...newPolicy, value: e.target.value})}
              className="bg-background/50"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={() => setNewPolicy({...newPolicy, action: "allow"})}
                variant={newPolicy.action === "allow" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1",
                  newPolicy.action === "allow" && "bg-success hover:bg-success/90 text-success-foreground"
                )}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Allow
              </Button>
              <Button
                onClick={() => setNewPolicy({...newPolicy, action: "block"})}
                variant={newPolicy.action === "block" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1",
                  newPolicy.action === "block" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                )}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Block
              </Button>
            </div>
            
            <Button
              onClick={handleAddPolicy}
              disabled={!newPolicy.value.trim()}
              className="w-full bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              Add Policy
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Current Policies */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <h4 className="text-sm font-medium text-foreground mb-2">Current Policies</h4>
        {policies.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Shield className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No security policies defined</p>
          </div>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} className="border-border/50 bg-background/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={policy.action === 'allow' ? 'default' : 'destructive'}
                    className={cn(
                      "text-xs",
                      policy.action === 'allow' && "bg-success text-success-foreground"
                    )}
                  >
                    {policy.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {policy.created.toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-foreground">{policy.kind.replace('_', ' ')}</div>
                  <div className="text-muted-foreground text-xs mt-1">{policy.value}</div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Separator />

      {/* Core Laws Update Section */}
      <Card className="border-warning/20 bg-gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-warning" />
            Core Laws Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-dashed"
            >
              <Upload className="w-4 h-4 mr-2" />
              {selectedFile ? selectedFile.name : "Choose JSON File"}
            </Button>
          </div>
          
          <Input
            type="password"
            placeholder="Security token..."
            value={lawsToken}
            onChange={(e) => setLawsToken(e.target.value)}
            className="bg-background/50"
          />
          
          <Button
            onClick={handleUpdateLaws}
            disabled={!selectedFile || !lawsToken.trim()}
            className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            Update Core Laws
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <Button
        onClick={loadPolicies}
        variant="outline"
        size="sm"
        className="w-full"
      >
        Refresh Policies
      </Button>
    </div>
  );
}