import { useCallback, useEffect, useState } from 'react';

export type Route = 'home' | 'daily' | 'play' | 'stats';

const ROUTES: Route[] = ['home', 'daily', 'play', 'stats'];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '');
  return (ROUTES as string[]).includes(name) ? (name as Route) : 'home';
}

/** Minimal hash router: #/daily, #/play, #/stats; anything else is home. */
export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = r === 'home' ? '/' : `/${r}`;
    window.scrollTo(0, 0);
  }, []);

  return [route, navigate];
}
