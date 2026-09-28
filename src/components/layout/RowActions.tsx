import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface RowActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

export function RowActions({ items }: { items: RowActionItem[] }) {
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <>
      <div className="hidden justify-end gap-0.5 lg:flex">
        {visible.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            title={item.label}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              item.destructive ? 'hover:bg-destructive/10 hover:text-destructive' : ''
            }`}
          >
            <item.icon size={16} />
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="Actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {visible.map((item) => (
              <DropdownMenuItem
                key={item.label}
                className={`min-h-11 gap-2 ${item.destructive ? 'text-destructive focus:text-destructive' : ''}`}
                onClick={item.onClick}
              >
                <item.icon size={16} />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
