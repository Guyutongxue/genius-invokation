import { useState } from "preact/hooks";

export function useCondVar<T = unknown>(): [
  waiting: boolean,
  wait: () => Promise<T>,
  signal: (value: T) => void,
] {
  const [waiting, setWaiting] = useState(false);
  const [resolve, setResolve] = useState<(value: T) => void>(() => () => {});
  const wait = () => {
    setWaiting(true);
    return new Promise<T>((r) => {
      setResolve(() => r);
    });
  };
  const signal = (value: T) => {
    setWaiting(false);
    return resolve(value);
  };
  return [waiting, wait, signal];
}
