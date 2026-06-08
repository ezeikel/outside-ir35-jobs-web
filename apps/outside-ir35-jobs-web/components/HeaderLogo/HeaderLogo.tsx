'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMediaQuery } from 'react-responsive';

const HeaderLogo = () => {
  const [isClient, setIsClient] = useState(false);
  const isNotMobile = useMediaQuery({ minWidth: 768 }, undefined, (matches) => {
    if (isClient) {
      return matches;
    }

    return false;
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return 'Loading...';
  }

  return (
    <Link className="text-xl font-bold" href="/">
      {isNotMobile ? 'Outside IR35 Jobs' : 'OIR35J'}
    </Link>
  );
};

export default HeaderLogo;
