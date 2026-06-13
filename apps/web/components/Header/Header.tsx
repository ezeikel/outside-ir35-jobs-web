import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import cn from '@/utils/cn';
import HeaderLogo from '../HeaderLogo/HeaderLogo';
import { Button } from '../ui/button';
import UserMenu from './UserMenu';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => (
  <header
    className={cn(
      'sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6',
      {
        [className as string]: !!className,
      },
    )}
  >
    <div className="flex items-center gap-8">
      <HeaderLogo />
      <nav className="hidden md:block">
        <ul className="flex gap-6 text-sm text-muted-foreground">
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/jobs"
            >
              Jobs
            </Link>
          </li>
          <li>
            <Link className="transition-colors hover:text-foreground" href="/">
              Companies
            </Link>
          </li>
          <li>
            <Link className="transition-colors hover:text-foreground" href="/">
              Resources
            </Link>
          </li>
        </ul>
      </nav>
    </div>
    <div className="hidden items-center gap-2 md:flex">
      <UserMenu />
      <Button asChild>
        <Link href="/job/post">Post a job</Link>
      </Button>
    </div>
    <div className="md:hidden">
      <Button aria-label="Open menu" variant="ghost">
        <MenuIcon className="size-6" />
      </Button>
    </div>
  </header>
);

export default Header;
