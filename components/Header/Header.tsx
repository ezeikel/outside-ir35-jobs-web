import cn from '@/utils/cn';
import Link from 'next/link';
import { MenuIcon } from 'lucide-react';
import { Button } from '../ui/button';

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => {
  return (
    <header
      className={cn('bg-white text-gray-800 py-4', {
        [className as string]: !!className,
      })}
    >
      <div className="container mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link className="text-xl font-bold" href="/">
            Outside IR35 Jobs
          </Link>
        </div>
        <nav className="hidden md:block">
          <ul className="flex space-x-4">
            <li>
              <Link className="hover:text-gray-600" href="/">
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-primary"
            href="/"
          >
            Post a job
          </Link>
        </div>
        <div className="md:hidden">
          <Button aria-label="Open menu" variant="ghost">
            <MenuIcon className="size-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
