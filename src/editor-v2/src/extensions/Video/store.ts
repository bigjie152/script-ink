import { useStoreUploadVideo } from '@editor-v2/store/store';
import { dispatchEvent } from '@editor-v2/utils/customEvents/customEvents';
import { EVENTS } from '@editor-v2/utils/customEvents/events.constant';

export function useDialogVideo() {
  const [v] = useStoreUploadVideo(store => store.value);

  return v;
}

export const actionDialogVideo = {
  setOpen: (id: any, value: boolean) => {
    dispatchEvent(EVENTS.UPLOAD_VIDEO(id), value);
  },
};

