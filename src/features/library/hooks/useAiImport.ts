import { useState, useCallback, useRef } from 'react';
import {
  uploadQuizFile,
  streamExtractQuestions,
  PreviewQuestion,
  liveQuestionStore,
} from '../services/aiImportService';

export type ImportStep = 'uploading' | 'reading' | 'done';

export function useAiImport(deviceId: string) {
  const [step, setStep] = useState<ImportStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Returns the first question so the caller can navigate immediately.
  // The rest of the stream continues via liveQuestionStore.
  const startImport = useCallback(
    (fileUri: string, fileName: string): Promise<PreviewQuestion | null> => {
      if (!isMountedRef.current) return Promise.resolve(null);

      setError(null);
      setStep('uploading');

      return new Promise(resolve => {
        (async () => {
          // Step 1: Upload
          let storagePath: string;
          try {
            storagePath = await uploadQuizFile(fileUri, fileName, deviceId);
          } catch (e) {
            if (isMountedRef.current) {
              setStep(null);
              setError(
                e instanceof Error
                  ? e.message
                  : 'Upload failed. Please try again.',
              );
            }
            resolve(null);
            return;
          }

          if (!isMountedRef.current) {
            resolve(null);
            return;
          }
          setStep('reading');

          // Step 2: Stream from Edge Function.
          // Resolves as soon as the first question arrives — caller navigates then.
          // The rest of the stream delivers to liveQuestionStore.
          streamExtractQuestions(storagePath, fileName, firstQuestion => {
            if (isMountedRef.current) setStep('done');
            resolve(firstQuestion);
          }).catch(e => {
            // Only show error in UI if we haven't already navigated away (first question)
            const msg =
              e instanceof Error
                ? e.message
                : 'Extraction failed. Please try again.';
            if (isMountedRef.current) {
              setStep(null);
              setError(msg);
            }
            // If first question never arrived, unblock the promise
            resolve(null);
          });
        })();
      });
    },
    [deviceId],
  );

  const reset = useCallback(() => {
    liveQuestionStore.unregister();
    setStep(null);
    setError(null);
  }, []);

  // Track mount state so we don't call setState after unmount
  useRef(
    (() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    })(),
  );

  return { step, error, startImport, reset };
}
