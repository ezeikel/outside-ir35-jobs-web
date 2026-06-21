interface LayoutWrapProps {
  children: React.ReactNode;
}

const LayoutWrap = ({ children }: LayoutWrapProps) => (
  <div className="grid min-h-screen grid-rows-[auto,1fr,auto]">{children}</div>
);

export default LayoutWrap;
