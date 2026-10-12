export function ErrorMessage({ message, retry }) { return <div className="notice error" role="alert"><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>; }
export function Loading() { return <div className="loading" role="status"><span className="spinner" />Getting the lovely things ready…</div>; }
