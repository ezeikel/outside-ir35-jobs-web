import cn from '@/utils/cn';

type HeaderProps = {
  className?: string;
};

const Header = ({ className }: HeaderProps) => {
  return (
    <header
      className={cn({
        [className as string]: !!className,
      })}
    >
      <h1>Header</h1>
    </header>
  );
};

export default Header;
