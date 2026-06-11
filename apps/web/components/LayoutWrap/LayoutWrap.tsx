interface LayoutWrapProps {
  children: React.ReactNode;
}

const LayoutWrap = ({ children }: LayoutWrapProps) => (
  <div className="grid grid-rows-[auto,1fr] ">{children}</div>
);

export default LayoutWrap;
