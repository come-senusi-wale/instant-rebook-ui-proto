// import SearchPage from '@/components/SearchPage';

// export default function Home() {
//   return <SearchPage />;
// }


import { Suspense } from 'react';
import SearchPage from '@/components/SearchPage';

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <p>Loading hotel search...</p>
        </main>
      }
    >
      <SearchPage />
    </Suspense>
  );
}