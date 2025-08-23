import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  note?: string;
  result: string;
}

interface SuperAdminAuditBannerProps {
  entries: AuditEntry[];
  recentEntries: AuditEntry[];
  hasNewAttempts: boolean;
  onMarkAsSeen: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function SuperAdminAuditBanner({
  entries,
  recentEntries,
  hasNewAttempts,
  onMarkAsSeen,
  onRefresh,
  loading
}: SuperAdminAuditBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (dismissed || recentEntries.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onMarkAsSeen();
  };

  return (
    <Alert className="mb-4 border-destructive bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex items-start justify-between w-full">
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-semibold mb-2">
            ⚠️ Super-Admin protections were challenged
          </AlertTitle>
          
          {/* Desktop view - show recent attempts */}
          <AlertDescription className="hidden sm:block">
            <div className="space-y-1 text-xs">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono">
                    {formatDistanceToNow(new Date(entry.ts))} ago
                  </span>
                  <span>•</span>
                  <span className="font-medium">{entry.actor}</span>
                  <span>attempted</span>
                  <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                  <span>on {entry.target}</span>
                </div>
              ))}
            </div>
          </AlertDescription>

          {/* Mobile view - collapsed single line */}
          <AlertDescription className="sm:hidden text-xs text-muted-foreground">
            {recentEntries.length} recent attempt{recentEntries.length !== 1 ? 's' : ''} detected
          </AlertDescription>
        </div>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">View all</span>
                <span className="xs:hidden">View</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Super-Admin Audit Log</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="hidden md:table-cell">Note</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono whitespace-nowrap">
                            {formatDistanceToNow(new Date(entry.ts))} ago
                          </TableCell>
                          <TableCell className="font-medium">{entry.actor}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                          </TableCell>
                          <TableCell>{entry.target}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {entry.note || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              {entry.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onRefresh} disabled={loading}>
                  Refresh
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={onMarkAsSeen} className="text-xs">
            Mark as seen
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}