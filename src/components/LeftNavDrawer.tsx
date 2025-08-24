import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerTrigger, DrawerContent } from '@/components/ui/drawer';

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
        Drawer Content
      </DrawerContent>
    </Drawer>
  );
};
