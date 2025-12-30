'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@editor-v2/components/ui/toast';
import { useToast } from '@editor-v2/components/ui/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        return (
          <Toast key={id}
            {...props}
          >
            <div className="richtext-grid richtext-gap-1">
              {title && <ToastTitle>
                {title}
              </ToastTitle>}

              {description && (
                <ToastDescription>
                  {description}
                </ToastDescription>
              )}
            </div>

            {action}
            <ToastClose />
          </Toast>
        );
      })}

      <ToastViewport />
    </ToastProvider>
  );
}

