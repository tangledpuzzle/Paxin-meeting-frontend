import { BodyPix } from '@tensorflow-models/body-pix';
import { useEffect, useRef, useState } from 'react';
import { BackgroundConfig } from '../helpers/backgroundHelper';
import { RenderingPipeline } from '../helpers/renderingPipelineHelper';
import { SegmentationConfig } from '../helpers/segmentationHelper';
import { SourcePlayback } from '../helpers/sourceHelper';
import { TFLite } from './useTFLite';
import { createTimerWorker } from '../helpers/timerHelper';
import { buildWebGL2Pipeline } from '../pipelines/webgl2/webgl2Pipeline';
import { buildCanvas2dPipeline } from '../pipelines/canvas2d/canvas2dPipeline';

function useRenderingPipeline(
  sourcePlayback: SourcePlayback,
  backgroundConfig: BackgroundConfig,
  segmentationConfig: SegmentationConfig,
  initialBodyPix: BodyPix | null,
  tflite: TFLite
) {
  const [pipeline, setPipeline] = useState<RenderingPipeline | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const [fps, setFps] = useState(0);
  const [durations, setDurations] = useState<number[]>([]);

  useEffect(() => {
    const targetTimerTimeoutMs = 1000 / segmentationConfig.targetFps;

    let previousTime = 0;
    let beginTime = 0;
    let eventCount = 0;
    let frameCount = 0;
    const frameDurations: number[] = [];

    let renderTimeoutId: number;

    const timerWorker = createTimerWorker();

    const newPipeline =
      segmentationConfig.pipeline === 'webgl2'
        ? buildWebGL2Pipeline(
            sourcePlayback,
            backgroundImageRef.current,
            backgroundConfig,
            segmentationConfig,
            canvasRef.current,
            tflite,
            timerWorker,
            addFrameEvent
          )
        : buildCanvas2dPipeline(
            sourcePlayback,
            backgroundConfig,
            segmentationConfig,
            canvasRef.current,
            initialBodyPix!,
            tflite,
            addFrameEvent
          );

    async function render() {
      const startTime = performance.now();

      beginFrame();
      await newPipeline.render();
      endFrame();

      renderTimeoutId = timerWorker.setTimeout(
        render,
        Math.max(0, targetTimerTimeoutMs - (performance.now() - startTime))
      );
    }

    function beginFrame() {
      beginTime = Date.now();
    }

    function addFrameEvent() {
      const time = Date.now();
      frameDurations[eventCount] = time - beginTime;
      beginTime = time;
      eventCount++;
    }

    function endFrame() {
      const time = Date.now();
      frameDurations[eventCount] = time - beginTime;
      frameCount++;
      if (time >= previousTime + 1000) {
        setFps((frameCount * 1000) / (time - previousTime));
        setDurations(frameDurations);
        previousTime = time;
        frameCount = 0;
      }
      eventCount = 0;
    }

    render();
    if (!process.env.NEXT_PUBLIC_IS_PRODUCTION) {
      console.log(
        'Animation started:',
        sourcePlayback,
        backgroundConfig,
        segmentationConfig
      );
    }

    setPipeline(newPipeline);

    return () => {
      timerWorker.clearTimeout(renderTimeoutId);
      timerWorker.terminate();
      newPipeline.cleanUp();
      if (!process.env.NEXT_PUBLIC_IS_PRODUCTION) {
        console.log(
          'Animation stopped:',
          sourcePlayback,
          backgroundConfig,
          segmentationConfig
        );
      }

      setPipeline(null);
    };
  }, [sourcePlayback, backgroundConfig, segmentationConfig, initialBodyPix, tflite]);

  const setBodyPix = (bodyPix: BodyPix) => {
    if (pipeline) {
      pipeline.setBodyPixModel(bodyPix);
    }
  };

  return {
    pipeline,
    backgroundImageRef,
    canvasRef,
    fps,
    durations,
    setBodyPix,
  };
}

export default useRenderingPipeline;
