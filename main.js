import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GUI } from "dat.gui";

let scene,
  camera,
  renderer,
  model,
  guiControls = {
    showModel: false,
    showPointCloud: true,
    autoRotate: true,
  },
  orbitControls,
  autoRotate = true,
  pointCloud,
  currentLoadingModel = "",
  modelsInScene = [],
  pointCloudsInScene = [],
  previousPointCloudPositions = null,
  isFirstLoad = true,
  gui;

const models = [
  "glock_21_custom.glb",
  "modified_mosin.glb",
  "ferrari_f50_1995.glb",
  "bmw_m6_gt3_2018.glb",
  "Y.glb",
];

const DEFAULT_MODEL_PATH = "ferrari_f50_1995.glb";

const modelAttributes = {
  "glock_21_custom.glb": {
    backgroundColor: new THREE.Color(0x191919),
    cameraPosition: new THREE.Vector3(1.25, 0),
    // modelPosition: new THREE.Vector3(0, 0.2, 0),
    modelPosition: new THREE.Vector3(0, 0, 0),
  },
  "modified_mosin.glb": {
    backgroundColor: new THREE.Color(0x191919),
    cameraPosition: new THREE.Vector3(1.25, 0, 0),
    // modelPosition: new THREE.Vector3(0, -0.2, 0),
    modelPosition: new THREE.Vector3(0, 0, 0),
  },
  "ferrari_f50_1995.glb": {
    backgroundColor: new THREE.Color(0x191919),
    cameraPosition: new THREE.Vector3(2.25, 0.6, 2.5),
    // modelPosition: new THREE.Vector3(-2, 0.45, 0),
    modelPosition: new THREE.Vector3(0, 0, 0),
  },
  "bmw_m6_gt3_2018.glb": {
    backgroundColor: new THREE.Color(0x191919),
    cameraPosition: new THREE.Vector3(2.25, 0.6, 2.5),
    // modelPosition: new THREE.Vector3(3, -0.8, -5.5),
    modelPosition: new THREE.Vector3(0, 0, 0),
  },
  default: {
    backgroundColor: new THREE.Color(0x191919),
    cameraPosition: new THREE.Vector3(1.25, 0, 0),
    modelPosition: new THREE.Vector3(0, 0, 0),
  },
};

const modelCache = {}; // 用于存储已加载的模型

function updateLoadingProgress(percentage) {
  document.getElementById("progress-bar").style.width = percentage + "%";
  document.getElementById(
    "loading-text"
  ).textContent = `正在加载模型 ${percentage}%`;
}

function loadModel(modelPath) {
  if (pointCloud) {
    // Store the current pointCloud vertices
    previousPointCloudPositions = Array.from(
      pointCloud.geometry.attributes.position.array
    );
  }

  if (currentLoadingModel === modelPath) {
    return;
  }

  currentLoadingModel = modelPath;

  modelsInScene.forEach((m) => scene.remove(m));
  modelsInScene = [];

  pointCloudsInScene.forEach((pc) => scene.remove(pc));
  pointCloudsInScene = [];

  const attributes = modelAttributes[modelPath] || modelAttributes.default;
  scene.background = attributes.backgroundColor;
  camera.position.copy(attributes.cameraPosition);

  if (model) scene.remove(model);
  if (pointCloud) scene.remove(pointCloud);

  document.getElementById("progress-container").style.display = "block";
  updateLoadingProgress(0);

  if (modelCache[modelPath]) {
    handleModelLoaded(modelCache[modelPath]);
    return;
  }

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      if (currentLoadingModel !== modelPath) return;

      // 缓存模型以供将来使用
      modelCache[modelPath] = gltf;

      handleModelLoaded(gltf);
    },
    (xhr) => {
      if (xhr.lengthComputable && modelPath === currentLoadingModel) {
        const percentage = ((xhr.loaded / xhr.total) * 100).toFixed(2);
        updateLoadingProgress(percentage);
      }
    }
  );
}

function handleModelLoaded(gltf) {
  model = gltf.scene;

  const attributes =
    modelAttributes[currentLoadingModel] || modelAttributes.default;
  scene.background = attributes.backgroundColor;
  camera.position.copy(attributes.cameraPosition);

  // 将模型移到指定位置
  model.position.copy(attributes.modelPosition);

  model.visible = guiControls.showModel;
  scene.add(model);
  modelsInScene.push(model);

  createPointCloud(model);
  animatePointsToTarget(pointCloud);
  pointCloudsInScene.push(pointCloud);

  document.getElementById("progress-container").style.display = "none";
}
function initGUI() {
  gui = new GUI();

  gui
    .add(guiControls, "showModel")
    .name("显示模型")
    .onChange((value) => {
      if (model) model.visible = value;
    });

  gui
    .add(guiControls, "showPointCloud")
    .name("显示点云")
    .onChange((value) => {
      if (pointCloud) pointCloud.visible = value;
    });

  gui
    .add(guiControls, "autoRotate")
    .name("自动旋转")
    .onChange((value) => {
      autoRotate = value;
    });
}

function init() {
  initGUI();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(1.25, 0.6, 4);

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#app"),
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;

  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;

  setupModelSwitcher();
  loadModel(DEFAULT_MODEL_PATH);
  setupLights();
  setupControls();

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

// #region 不要删除下面代码
// function setupModelSwitcher() {
//   const btnContainer = document.createElement("div");
//   btnContainer.style.position = "absolute";
//   btnContainer.style.top = "10px";
//   btnContainer.style.left = "10px";
//   btnContainer.style.zIndex = "1000";

//   models.forEach((modelPath) => {
//     const btn = document.createElement("button");
//     btn.innerText = modelPath.split("_").slice(0, 2).join(" ");
//     btn.addEventListener("click", () => loadModel(modelPath));
//     btnContainer.appendChild(btn);
//   });
//   document.body.appendChild(btnContainer);
// }
// #endregion

function setupModelSwitcher() {
  const modelController = { model: DEFAULT_MODEL_PATH };

  const modelChooser = gui.add(modelController, "model", models);
  modelChooser.onChange(function (value) {
    loadModel(value);
  });
}

function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 5, 1);
  scene.add(directionalLight);
}

function setupControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.25;
  orbitControls.addEventListener("start", () => (autoRotate = false));
  // orbitControls.addEventListener("end", () => (autoRotate = true));
  orbitControls.addEventListener(
    "end",
    () => (autoRotate = guiControls.autoRotate)
  );
}

function animate() {
  requestAnimationFrame(animate);
  if (model && autoRotate) model.rotation.y -= 0.003;
  if (pointCloud && autoRotate) pointCloud.rotation.y -= 0.003;
  orbitControls.update();
  renderer.render(scene, camera);
}

function createPointCloud(mesh) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  mesh.updateMatrixWorld(true);

  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const vertex = new THREE.Vector3();
      const positions = child.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        vertex.applyMatrix4(child.matrixWorld);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }
  });

  let initialPositions;
  if (previousPointCloudPositions) {
    initialPositions = previousPointCloudPositions.slice();
    const diff = vertices.length - initialPositions.length;

    if (diff > 0) {
      for (let i = 0; i < diff; i += 3) {
        // Copy from existing positions.
        const index = i % initialPositions.length;
        initialPositions.push(
          initialPositions[index],
          initialPositions[index + 1],
          initialPositions[index + 2]
        );
      }
    } else {
      initialPositions = initialPositions.slice(0, vertices.length);
    }
  } else {
    initialPositions = new Float32Array(vertices.length);
    for (let i = 0; i < initialPositions.length; i += 3) {
      initialPositions[i] = (Math.random() - 0.5) * 10;
      initialPositions[i + 1] = (Math.random() - 0.5) * 10;
      initialPositions[i + 2] = (Math.random() - 0.5) * 10;
    }
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(initialPositions, 3)
  );

  const material = new THREE.PointsMaterial({
    size: 0.005,
    color: 0xffffff,
  });
  pointCloud = new THREE.Points(geometry, material);

  pointCloud.visible = guiControls.showPointCloud;

  pointCloud.userData.targets = [];
  pointCloud.userData.speeds = []; // Add speeds for each point
  for (let i = 0; i < vertices.length; i += 3) {
    pointCloud.userData.targets.push(
      new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
    );

    if (isFirstLoad) {
      pointCloud.userData.speeds.push(
        Math.random() > 0.6
          ? Math.random() * 0.005 + 0.0005
          : Math.random() * 0.0005
      ); // Assign a random speed for each point
    } else {
      pointCloud.userData.speeds.push(Math.random() * 0.005 + 0.0005); // Assign a random speed for each point
    }
  }

  isFirstLoad = false;

  scene.add(pointCloud);

  // Store current vertices for the next model switch.
  previousPointCloudPositions = Array.from(vertices);
}

function animatePointsToTarget(pointCloud) {
  const positions = pointCloud.geometry.attributes.position;
  const targets = pointCloud.userData.targets;
  const speeds = pointCloud.userData.speeds;

  const progresses = new Array(positions.count).fill(0);

  const animatePoints = () => {
    let allPointsReachedTarget = true;

    for (let i = 0; i < positions.count; i++) {
      progresses[i] += speeds[i];
      if (progresses[i] > 1) progresses[i] = 1;
      else allPointsReachedTarget = false;

      positions.array[i * 3] = THREE.MathUtils.lerp(
        positions.array[i * 3],
        targets[i].x,
        progresses[i]
      );
      positions.array[i * 3 + 1] = THREE.MathUtils.lerp(
        positions.array[i * 3 + 1],
        targets[i].y,
        progresses[i]
      );
      positions.array[i * 3 + 2] = THREE.MathUtils.lerp(
        positions.array[i * 3 + 2],
        targets[i].z,
        progresses[i]
      );
    }

    positions.needsUpdate = true;

    if (!allPointsReachedTarget) {
      requestAnimationFrame(animatePoints);
    } else {
      previousPointCloudPositions = Array.from(positions.array);
    }
  };

  animatePoints();
}

init();
animate();
