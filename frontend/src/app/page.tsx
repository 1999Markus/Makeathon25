"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Bente's take on sleep!</h1>
      <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="mt-8 cursor-pointer">
              Click me!
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Being tired is being weak! Push through it!
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
    </div>
  );
}
