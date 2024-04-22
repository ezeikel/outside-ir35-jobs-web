'use client';

import Link from 'next/link';
import { useMediaQuery } from 'react-responsive';

const HeaderLogo = () => {
  const isNotMobile = useMediaQuery({ minWidth: 768 });

  return (
    <Link className="text-xl font-bold" href="/">
      {isNotMobile ? 'Outside IR35 Jobs' : 'OIR35J'}
    </Link>
  );
};

export default HeaderLogo;
