import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Render a 3D model (.glb/.gltf) to a small transparent PNG thumbnail,
 * returned as a data URL. Uses a throwaway WebGL renderer and simple lighting.
 */
export async function generateModelThumbnail(
  src: string,
  size = 160,
): Promise<string> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(src);

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  const dims = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(dims.x, dims.y, dims.z, 0.001);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera(40, 1, maxDim / 100, maxDim * 20);
  const dist = maxDim / (2 * Math.tan((40 * Math.PI) / 360));
  camera.position.copy(center).add(new THREE.Vector3(dist, dist * 0.5, dist));
  camera.lookAt(center);

  const scene = new THREE.Scene();
  scene.add(gltf.scene);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));

  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.copy(center).add(new THREE.Vector3(1, 2, 1).multiplyScalar(dist));
  key.target.position.copy(center);
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xffffff, 1);
  fill.position.copy(center).add(new THREE.Vector3(-1, 0.5, -1).multiplyScalar(dist));
  scene.add(fill);

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  renderer.dispose();
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
