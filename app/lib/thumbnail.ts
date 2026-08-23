import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const SKY_HDR_URL = "/assets/place/sky.hdr";

/**
 * Render a 3D model (.glb/.gltf) to a small transparent PNG thumbnail,
 * returned as a data URL. Frames the model via its bounding sphere and lights
 * it with the world's HDR sky (used as both environment map and background).
 */
export async function generateModelThumbnail(
  src: string,
  size = 160,
): Promise<string> {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const gltf = await loader.loadAsync(src);

  // Frame the model with its bounding sphere so it always fits the camera.
  const sphere = new THREE.Box3()
    .setFromObject(gltf.scene)
    .getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const radius = Math.max(sphere.radius, 0.001);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);

  const fov = 40;
  const camera = new THREE.PerspectiveCamera(fov, 1, radius / 100, radius * 50);
  const dist = (radius / Math.sin((fov * Math.PI) / 360)) * 1.1;
  camera.position
    .copy(center)
    .addScaledVector(new THREE.Vector3(1, 0.5, 1).normalize(), dist);
  camera.lookAt(center);

  const scene = new THREE.Scene();
  scene.add(gltf.scene);

  // HDR environment for lighting + sky background (fall back to a light).
  let pmrem: THREE.PMREMGenerator | null = null;
  let hdr: THREE.DataTexture | null = null;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rgbe = new RGBELoader();
    hdr = await rgbe.loadAsync(SKY_HDR_URL);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const envRT = pmrem.fromEquirectangular(hdr);
    scene.environment = envRT.texture;
    scene.background = hdr;
  } catch {
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  }

  // Key light for definition.
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position
    .copy(center)
    .add(new THREE.Vector3(1, 2, 1).normalize().multiplyScalar(radius * 4));
  key.target.position.copy(center);
  scene.add(key, key.target);

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  renderer.dispose();
  dracoLoader.dispose();
  pmrem?.dispose();
  hdr?.dispose();
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });

  return dataUrl;
}

/** Convert a PNG data URL into a Blob for direct S3 upload. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
