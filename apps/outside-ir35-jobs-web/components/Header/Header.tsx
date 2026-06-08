import cn from '@/utils/cn';
import Link from 'next/link';
import { MenuIcon } from 'lucide-react';
import { Button } from '../ui/button';
import HeaderLogo from '../HeaderLogo/HeaderLogo';

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => (
  <header
    className={cn(
      'bg-white text-gray-800 p-4 flex justify-between items-center sticky top-0 z-10',
      {
        [className as string]: !!className,
      },
    )}
  >
    <div className="flex items-center">
      <HeaderLogo />
    </div>
    <nav className="hidden md:block">
      <ul className="flex space-x-4">
        <li>
          <Link className="hover:text-gray-600" href="/jobs">
            Jobs
          </Link>
        </li>
        <li>
          <Link className="hover:text-gray-600" href="/">
            Companies
          </Link>
        </li>
        <li>
          <Link className="hover:text-gray-600" href="/">
            Resources
          </Link>
        </li>
      </ul>
    </nav>
    <div className="flex items-center space-x-4">
      <Link
        className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-800"
        href="/"
      >
        Log in
      </Link>
      <Link
        className="inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-red-500"
        href="/job/post"
      >
        Post a job
      </Link>
    </div>
    <div className="md:hidden">
      <Button aria-label="Open menu" variant="ghost">
        <MenuIcon className="size-6" />
      </Button>
    </div>
  </header>
);

export default Header;
