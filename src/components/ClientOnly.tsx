import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
}

export default function ClientOnly({ children }: ClientOnlyProps) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    setReady(true);
  }, []);
  
  return ready ? <>{children}</> : null;
}
