import { useEffect, useState } from 'react';
export default function useResource(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) setState(s => ({ ...s, loading: true, error: '' })); return loader(); })
      .then(data => { if (active) setState({ data, error: '', loading: false }); })
      .catch(e => { if (active) setState({ data: null, error: e.message, loading: false }); });
    return () => { active = false; };
    // The caller supplies stable primitive keys for its request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  return { ...state, retry: () => setAttempt(n => n + 1) };
}
