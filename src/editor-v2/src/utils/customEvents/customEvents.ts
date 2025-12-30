import { type EventValues } from '@editor-v2/utils/customEvents/events.constant';

export function listenEvent (eventName: EventValues, callback: any) {
  window.addEventListener(eventName, callback);

  return () => {
    window.removeEventListener(eventName, callback);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dispatchEvent (eventName: EventValues, detail?: any) {
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    }),
  );
}

