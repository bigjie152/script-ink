import { useStoreUploadImage } from '@editor-v2/store/store';
import { dispatchEvent } from '@editor-v2/utils/customEvents/customEvents';
import { EVENTS } from '@editor-v2/utils/customEvents/events.constant';

export function useDialogImage() {
  const [v] = useStoreUploadImage(store => store.value);

  return v;
}

export const actionDialogImage = {
  setOpen: (id: any, value: boolean) => {
    dispatchEvent(EVENTS.UPLOAD_IMAGE(id), value);
  },
};

