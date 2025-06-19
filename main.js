import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let mainMesh = null;
let autoRotate = false;
let animationMixer = null;
let animationAction = null;
let animationPlaying = false;

// Configuración básica
const escenaDiv = document.getElementById('escena');
const width = escenaDiv.clientWidth;
const height = escenaDiv.clientHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // Antialias para suavizar
renderer.setClearColor(0x000000, 0); // Fondo transparente
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputEncoding = THREE.sRGBEncoding;
escenaDiv.appendChild(renderer.domElement);

// Iluminación más tenue
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.3);
hemiLight.position.set(0, 1, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.bias = -0.0001;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const spotLight = new THREE.SpotLight(0xfff0e0, 0.25, 0, Math.PI / 6, 0.2, 1.5);
spotLight.position.set(-8, 12, 8);
spotLight.castShadow = true;
scene.add(spotLight);


// const gradTexture = new THREE.CanvasTexture(generateGradientTexture());
// scene.background = gradTexture;
scene.background = null;

// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 4;
controls.update();

// Cargar el modelo GLB
const loader = new GLTFLoader();
loader.load(
    'modelo.glb',
    function (gltf) {
        scene.add(gltf.scene);

        // Mejorar materiales y agregar texturas procedurales
        gltf.scene.traverse(obj => {
            if (obj.isMesh) {
                if (!mainMesh) mainMesh = obj;
                obj.castShadow = true;
                obj.receiveShadow = true;

                // Si el material es MeshStandardMaterial, mejora la apariencia
                if (obj.material && obj.material.isMeshStandardMaterial) {
                    obj.material.roughness = 0.25;
                    obj.material.metalness = 0.7;
                    obj.material.envMapIntensity = 1.2;
                    obj.material.clearcoat = 0.6;
                    obj.material.clearcoatRoughness = 0.15;
                    obj.material.sheen = 0.5;
                    obj.material.sheenColor = new THREE.Color(0x88aaff);

                    // Añadir textura procedural tipo ruido para dar interés
                    obj.material.bumpMap = generateNoiseTexture();
                    obj.material.bumpScale = 0.08;
                    obj.material.needsUpdate = true;
                }
            }
        });

        // Animaciones
        if (gltf.animations && gltf.animations.length > 0) {
            animationMixer = new THREE.AnimationMixer(gltf.scene);
            animationAction = animationMixer.clipAction(gltf.animations[0]);
        }

        // Buscar mallas con morph targets (shape keys)
        gltf.scene.traverse(obj => {
            if (obj.isMesh && obj.morphTargetInfluences && obj.morphTargetDictionary) {
                const morphDict = obj.morphTargetDictionary;
                const morphInfluences = obj.morphTargetInfluences;
                const controlsDiv = document.getElementById('morph-controls');
                Object.keys(morphDict).forEach((name, idx) => {
                    const label = document.createElement('label');
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = 0;
                    slider.max = 1;
                    slider.step = 0.01;
                    slider.value = morphInfluences[morphDict[name]];
                    slider.style.setProperty('--val', slider.value * 100);
                    slider.oninput = () => {
                        morphInfluences[morphDict[name]] = parseFloat(slider.value);
                        slider.style.setProperty('--val', slider.value * 100);
                    };
                    label.appendChild(slider);
                    const span = document.createElement('span');
                    span.className = 'knob-label-text';
                    span.textContent = name;
                    label.appendChild(span);
                    controlsDiv.appendChild(label);
                });
            }
        });
    },
);

// Conexión de controles de manipulaciones
const colorSlider = document.getElementById('color');
const sizeSlider = document.getElementById('size');
const wireframeBtn = document.querySelector('.btn:nth-child(3)');
const autoRotateBtn = document.querySelector('.btn:nth-child(2)');
const animarBtn = document.querySelector('.btn:nth-child(1)');

if (colorSlider) {
    colorSlider.addEventListener('input', () => {
        if (mainMesh && mainMesh.material) {
            // Cambia el color del material principal (hue)
            const h = colorSlider.value / 360;
            const s = 0.7, l = 0.5;
            const color = new THREE.Color().setHSL(h, s, l);
            if (Array.isArray(mainMesh.material)) {
                mainMesh.material.forEach(mat => {
                    if (mat.color) mat.color.set(color);
                });
            } else {
                if (mainMesh.material.color) mainMesh.material.color.set(color);
            }
        }
    });
}

if (sizeSlider) {
    sizeSlider.addEventListener('input', () => {
        if (mainMesh) {
            const scale = sizeSlider.value / 100;
            mainMesh.scale.set(scale, scale, scale);
        }
    });
}

if (wireframeBtn) {
    wireframeBtn.addEventListener('click', () => {
        if (mainMesh && mainMesh.material) {
            if (Array.isArray(mainMesh.material)) {
                mainMesh.material.forEach(mat => {
                    if ('wireframe' in mat) mat.wireframe = !mat.wireframe;
                });
            } else {
                if ('wireframe' in mainMesh.material)
                    mainMesh.material.wireframe = !mainMesh.material.wireframe;
            }
        }
    });
}

if (autoRotateBtn) {
    autoRotateBtn.addEventListener('click', () => {
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 2.0;
    });
}

if (animarBtn) {
    animarBtn.addEventListener('click', () => {
        if (animationMixer && animationAction) {
            if (!animationPlaying) {
                animationAction.play();
                animationPlaying = true;
            } else {
                animationAction.paused = !animationAction.paused;
            }
        }
    });
}

// Función de animación
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (animationMixer && animationPlaying) {
        animationMixer.update(0.016);
    }
    renderer.render(scene, camera);
}
animate();

// En el evento resize, ajusta el tamaño del renderer y la cámara al tamaño del div
window.addEventListener('resize', () => {
    const width = escenaDiv.clientWidth;
    const height = escenaDiv.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Utilidad: textura procedural de gradiente para fondo
function generateGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#23243a');
    grad.addColorStop(1, '#7ecfff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return canvas;
}

// Utilidad: textura procedural de ruido para bumpMap
function generateNoiseTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < size * size * 4; i += 4) {
        const val = Math.floor(Math.random() * 128 + 128);
        imgData.data[i] = val;
        imgData.data[i + 1] = val;
        imgData.data[i + 2] = val;
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}
