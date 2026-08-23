"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
// import { smaa } from "three/examples/jsm/tsl/display/SMAANode.js";

import { pass, mrt, output, emissive, vec4 } from "three/tsl";

import {
  PerspectiveCamera,
  PMREMGenerator,
  RenderPipeline,
  WebGPURenderer,
} from "three/webgpu";

import { Scene } from "three/webgpu";

import { WebGLRenderer, EquirectangularReflectionMapping } from "three";
import { HDRLoader } from "three/examples/jsm/Addons.js";

interface EffectsSSGIProps {
  children?: any;
  /** HDR environment map URL. Defaults to the bundled sky. */
  hdriUrl?: string;
  /** HDR environment lighting intensity (live-updatable). */
  environmentIntensity?: number;
}

export function EffectsSSGI({
  children = null,
  hdriUrl = "/assets/place/sky.hdr",
  environmentIntensity = 0.35,
}: EffectsSSGIProps) {
  const [ready, setReady] = useState(false);
  let gl = useThree((r) => r.gl) as
    | (
        | WebGLRenderer
        | (WebGPURenderer & {
            domElement: { parentElement: { parentElement: HTMLDivElement } };
          })
      )
    | null;

  let scene = useThree((r) => r.scene) as Scene;
  let camera = useThree((r) => r.camera) as PerspectiveCamera;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let stats = new Stats();
    stats.dom.style.position = "absolute";
    stats.dom.style.touchAction = "none";
    stats.dom.style.top = "";
    stats.dom.style.left = "";
    stats.dom.style.left = "15px";
    stats.dom.style.top = "50px";
    stats.dom.style.borderRadius = "10px";
    stats.dom.style.overflow = "hidden";

    if (gl?.domElement?.parentElement?.parentElement) {
      gl.domElement.parentElement.parentElement.appendChild(stats.dom);
    }

    let id: any;

    let rr = () => {
      stats.update();
      id = requestAnimationFrame(rr);
    };
    id = requestAnimationFrame(rr);

    return () => {
      cancelAnimationFrame(id);

      gl?.domElement?.parentElement?.parentElement?.removeChild(stats.dom);
    };
  }, []);

  // Render pipeline (once).
  useEffect(() => {
    if (!scene || !camera || !gl) {
      return;
    }
    let pipe = new RenderPipeline(gl as WebGPURenderer);

    const scenePass = pass(scene, camera);
    scenePass.setMRT(
      mrt({
        output: output,
        emissive: emissive,
      }),
    );

    const scenePassColor = scenePass.getTextureNode("output");
    const scenePassEmissive = scenePass.getTextureNode("emissive");

    const bloomPass = bloom(scenePassEmissive, 80, 1, 0.1);

    // composite: scene color + bloom
    const compositePass = vec4(
      scenePassColor.rgb.add(bloomPass.rgb),
      scenePassColor.a,
    );

    pipe.outputNode = compositePass;

    let frame = 0;
    let hh = () => {
      frame = requestAnimationFrame(hh);
      if ((gl as { initialized: boolean }).initialized || true) {
        try {
          pipe?.render();
        } catch (e) {
          console.trace(e);
        }
      }
    };
    frame = requestAnimationFrame(hh);

    return () => {
      cancelAnimationFrame(frame);
      pipe.dispose();
    };
  }, [scene, camera, gl]);

  // Environment + background map (re-loads when the HDR URL changes).
  useEffect(() => {
    if (!scene || !gl) return;
    let cancelled = false;

    const loader = new HDRLoader();
    loader
      .loadAsync(hdriUrl)
      .then((sky) => {
        if (cancelled) return;
        sky.mapping = EquirectangularReflectionMapping;

        const prm = new PMREMGenerator(gl as any);
        prm.compileEquirectangularShader();
        const rtt = prm.fromEquirectangular(sky);

        scene.environment = rtt.texture;
        scene.background = rtt.texture;
        scene.backgroundIntensity = 0.5;

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [scene, gl, hdriUrl]);

  // Lighting intensity — live-updatable via the node-material observer.
  useEffect(() => {
    if (!scene) return;
    scene.environmentIntensity = environmentIntensity;
  }, [scene, environmentIntensity]);

  useFrame(() => {}, 11);

  return <>{ready && children}</>;
}
