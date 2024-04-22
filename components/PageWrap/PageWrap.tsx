import cn from '@/utils/cn';

type PageWrapProps = {
  children: React.ReactNode;
  className?: string;
};

const PageWrap = ({ children, className }: PageWrapProps) => (
  <div
    className={cn('max-w-[100vw] overflow-y-scroll flex flex-col p-4 ', {
      [className as string]: !!className,
    })}
    style={{
      height: 'calc(100vh - 72px)',
    }}
  >
    {children}
  </div>
);

export default PageWrap;
