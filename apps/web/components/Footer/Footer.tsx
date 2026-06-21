import Link from 'next/link';

const Footer = () => (
  <footer className="border-t border-border bg-card/50 px-4 py-8 text-sm text-muted-foreground sm:px-6">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p>© {new Date().getFullYear()} Chewy Bytes Limited. outsideir35.jobs</p>
      <nav>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/jobs"
            >
              Jobs
            </Link>
          </li>
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/day-rates"
            >
              Day rates
            </Link>
          </li>
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/blog"
            >
              Blog
            </Link>
          </li>
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
          </li>
          <li>
            <Link
              className="transition-colors hover:text-foreground"
              href="/terms"
            >
              Terms
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
);

export default Footer;
