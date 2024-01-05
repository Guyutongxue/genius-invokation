import { useState } from "preact/hooks";

export function useCondVar(): [waiting: boolean, wait: () => Promise<void>, signal: () => void] {
  const [waiting, setWaiting] = useState(false);
  const [resolve, setResolve] = useState<() => void>(() => {});
  const wait = () => {
    setWaiting(true);
    return new Promise<void>(r => {
      setResolve(() => r);
    });
  };
  const signal = () => {
    setWaiting(false);
    resolve();
  };
  return [waiting, wait, signal];
}
