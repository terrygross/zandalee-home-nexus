
import { useState } from 'react';
import { Menu, Home, Settings, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export const LeftNavDrawer = () => {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-80 mt-0 rounded-none fixed inset-y-0 left-0 z-[200] bg-background border-r">
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex flex-col gap-2 p-4">
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setOpen(false)}>
            <Home className="h-4 w-4" />
            Home
          </Button>
          
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setOpen(false)}>
            <User className="h-4 w-4" />
            Profile
          </Button>
          
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setOpen(false)}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
