import * as tfBodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { useEffect, useState } from 'react';

let bodyPixStore: tfBodyPix.BodyPix;

function useBodyPix() {
  const [bodyPix, setBodyPix] = useState<tfBodyPix.BodyPix | null>(null);

  useEffect(() => {
    async function loadBodyPix() {
      console.log('Loading TensorFlow.js and BodyPix segmentation model');
      await tf.ready();
      bodyPixStore = await tfBodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
      });
      setBodyPix(bodyPixStore);
      console.log('TensorFlow.js and BodyPix loaded');
    }

    let timeout: NodeJS.Timeout | undefined;

    if (!bodyPixStore) {
      timeout = setTimeout(() => {
        loadBodyPix();
      }, 500);
    } else {
      setBodyPix(bodyPixStore);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return bodyPix;
}

export default useBodyPix;
