// Importa las dependencias principales de Three.js y sus extensiones
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Variables globales para el manejo de la escena y animaciones
let mainMesh = null; // Referencia a la malla principal del modelo
let mainModel = null; // Referencia al grupo raíz del modelo
// let autoRotate = false; // Eliminado: no se usa realmente
let animationMixer = null; // Mezclador de animaciones
let animationAction = null; // Acción de animación activa
let animationPlaying = false; // Estado de reproducción de animación

// Variables globales adicionales
let wireframeMode = false;
let morphTargets = {};
const channel = new BroadcastChannel('criaturas');

// Configuración básica de la escena y el renderer
const escenaDiv = document.getElementById('escena');
const width = escenaDiv.clientWidth;
const height = escenaDiv.clientHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // Antialias para suavizar bordes
renderer.setClearColor(0x000000, 0); // Fondo transparente
renderer.setSize(width, height);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputEncoding = THREE.sRGBEncoding;
escenaDiv.appendChild(renderer.domElement); // Inserta el canvas en el DOM

// Iluminación ambiental tenue
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// Luz hemisférica para simular luz ambiental desde el cielo y el suelo
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.3);
hemiLight.position.set(0, 1, 0);
scene.add(hemiLight);

// Luz direccional para sombras y realce
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.bias = -0.0001;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Luz puntual tipo spot para dar profundidad
const spotLight = new THREE.SpotLight(0xfff0e0, 0.25, 0, Math.PI / 6, 0.2, 1.5);
spotLight.position.set(-8, 12, 8);
spotLight.castShadow = true;
scene.add(spotLight);

// Fondo transparente (puedes cambiarlo por un gradiente procedural si lo deseas)
// const gradTexture = new THREE.CanvasTexture(generateGradientTexture());
// scene.background = gradTexture;
scene.background = null;

// Controles de órbita para mover la cámara con el mouse
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 5;
controls.update();

// Carga del modelo GLB usando GLTFLoader
const loader = new GLTFLoader();
loader.load(
    'modelo.glb',
    function (gltf) {
        scene.add(gltf.scene); // Agrega el modelo a la escena
        mainModel = gltf.scene; // Guarda referencia al grupo raíz

        // Mejora materiales y agrega texturas procedurales a las mallas
        gltf.scene.traverse(obj => {
            if (obj.isMesh) {
                if (!mainMesh) mainMesh = obj; // Guarda la primera malla encontrada como principal
                obj.castShadow = true;
                obj.receiveShadow = true;

                // Si el material es MeshStandardMaterial, ajusta sus propiedades para mejor apariencia
                if (obj.material && obj.material.isMeshStandardMaterial) {
                    obj.material.roughness = 0.25;
                    obj.material.metalness = 0.7;
                    obj.material.envMapIntensity = 1.2;
                    obj.material.clearcoat = 0.6;
                    obj.material.clearcoatRoughness = 0.15;
                    obj.material.sheen = 0.5;
                    obj.material.sheenColor = new THREE.Color(0x88aaff);

                    // Añade una textura procedural de ruido como bumpMap
                    obj.material.bumpMap = generateNoiseTexture();
                    obj.material.bumpScale = 0.08;
                    obj.material.needsUpdate = true;
                }
            }
        });

        // Si el modelo tiene animaciones, prepara el mezclador y la acción
        if (gltf.animations && gltf.animations.length > 0) {
            animationMixer = new THREE.AnimationMixer(gltf.scene);
            animationAction = animationMixer.clipAction(gltf.animations[0]);
        }

        // Busca mallas con morph targets (shape keys) y crea sliders para controlarlos
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
                    // Actualiza el valor del morph target al mover el slider
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

// Obtiene referencias a los controles de la interfaz
const colorSlider = document.getElementById('color');
const sizeSlider = document.getElementById('size');
const wireframeBtn = document.querySelector('.btn:nth-child(3)');
// const autoRotateBtn = document.querySelector('.btn:nth-child(2)'); // Eliminado: no se usa
const animarBtn = document.querySelector('.btn:nth-child(1)');

// Evento para cambiar el color del material principal usando el slider
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

// Evento para cambiar el tamaño (escala) del modelo usando el slider
if (sizeSlider) {
    sizeSlider.addEventListener('input', () => {
        if (mainMesh) {
            const scale = sizeSlider.value / 100;
            mainMesh.scale.set(scale, scale, scale);
        }
    });
}

// Evento para alternar el modo wireframe del material principal
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

// Evento para reproducir/pausar la animación del modelo
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

// Función principal de animación/render loop
function animate() {
    requestAnimationFrame(animate); // Llama a sí misma en cada frame
    controls.update(); // Actualiza los controles de órbita
    if (animationMixer && animationPlaying) {
        animationMixer.update(0.016); // Avanza la animación si está activa
    }
    renderer.render(scene, camera); // Renderiza la escena
}
animate();

// Ajusta el tamaño del renderer y la cámara cuando la ventana cambia de tamaño
window.addEventListener('resize', () => {
    const width = escenaDiv.clientWidth;
    const height = escenaDiv.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Utilidad: genera una textura de gradiente para usar como fondo (no se usa por defecto)
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

// Utilidad: genera una textura procedural de ruido para usar como bumpMap
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

// --- INICIO: Integración MIDI ---
// Permite controlar los sliders desde un controlador MIDI externo
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
}

// Si se obtiene acceso MIDI, asigna el manejador de mensajes MIDI a cada entrada
function onMIDISuccess(midiAccess) {
    for (let input of midiAccess.inputs.values()) {
        input.onmidimessage = handleMIDIMessage;
    }
}

// Si falla el acceso MIDI, muestra una advertencia en consola
function onMIDIFailure() {
    console.warn('No se pudo acceder a la entrada MIDI.');
}

// Manejador de mensajes MIDI: mapea los CC a los sliders correspondientes
function handleMIDIMessage(event) {
    const [status, cc, value] = event.data;
    // Solo procesa mensajes de tipo Control Change (CC)
    if ((status & 0xF0) === 0xB0) {
        // Morph knobs: CC 110-115 (asigna a los sliders de morph target)
        if (cc >= 110 && cc <= 115) {
            const idx = cc - 110;
            const morphControls = document.querySelectorAll('#morph-controls input[type="range"]');
            if (morphControls[idx]) {
                // Convierte el valor MIDI (0-127) al rango del slider (0-1)
                const v = value / 127;
                morphControls[idx].value = v;
                morphControls[idx].dispatchEvent(new Event('input'));
            }
        }
        // Color: CC 116 (0-127 -> 0-360)
        if (cc === 116) {
            const colorSlider = document.getElementById('color');
            if (colorSlider) {
                const v = Math.round((value / 127) * 360);
                colorSlider.value = v;
                colorSlider.dispatchEvent(new Event('input'));
            }
        }
        // Tamaño: CC 117 (0-127 -> 50-150)
        if (cc === 117) {
            const sizeSlider = document.getElementById('size');
            if (sizeSlider) {
                const v = Math.round(50 + (value / 127) * 100);
                sizeSlider.value = v;
                sizeSlider.dispatchEvent(new Event('input'));
            }
        }
    }
}
// --- FIN: Integración MIDI ---

// Agregar las nuevas funciones de control
window.resetAll = function () {
    if (mainMesh && mainMesh.morphTargetDictionary) {
        Object.keys(mainMesh.morphTargetDictionary).forEach(name => {
            const index = mainMesh.morphTargetDictionary[name];
            mainMesh.morphTargetInfluences[index] = 0;
        });
    }

    // Reset sliders
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = slider.id === 'size' ? '100' : '0';
        slider.dispatchEvent(new Event('input'));
    });

    // Reset auto-rotación
    autoRotate = false;
    controls.autoRotate = false;

    // Reset wireframe
    if (mainMesh) {
        if (Array.isArray(mainMesh.material)) {
            mainMesh.material.forEach(mat => {
                if ('wireframe' in mat) mat.wireframe = false;
            });
        } else if (mainMesh.material && 'wireframe' in mainMesh.material) {
            mainMesh.material.wireframe = false;
        }
    }
};

window.toggleWireframe = function () {
    wireframeMode = !wireframeMode;
    if (mainMesh) {
        if (Array.isArray(mainMesh.material)) {
            mainMesh.material.forEach(mat => {
                if ('wireframe' in mat) mat.wireframe = wireframeMode;
            });
        } else if (mainMesh.material && 'wireframe' in mainMesh.material) {
            mainMesh.material.wireframe = wireframeMode;
        }
    }
};

window.aprobarCriatura = function () {
    if (!mainMesh) return;

    // Capturar el estado actual de los morph targets
    const criaturaEstado = {};
    if (mainMesh.morphTargetDictionary && mainMesh.morphTargetInfluences) {
        Object.entries(mainMesh.morphTargetDictionary).forEach(([name, index]) => {
            criaturaEstado[name] = mainMesh.morphTargetInfluences[index];
        });
    }

    const nuevaCriatura = {
        id: Date.now(),
        morphTargets: criaturaEstado,
        position: {
            x: (Math.random() - 0.5) * 20,
            y: 0,
            z: (Math.random() - 0.5) * 20
        },
        color: parseInt(document.getElementById('color').value),
        scale: parseInt(document.getElementById('size').value) / 100,
        timestamp: new Date().toISOString()
    };

    // Guardar en localStorage
    const criaturas = JSON.parse(localStorage.getItem('criaturas') || '[]');
    criaturas.push(nuevaCriatura);
    localStorage.setItem('criaturas', JSON.stringify(criaturas));

    // Enviar mensaje a través de BroadcastChannel
    channel.postMessage({
        type: 'nueva_criatura',
        data: nuevaCriatura
    });

    // Resetear la criatura actual
    resetAll();
};

// Nueva función para animar la figura girando sobre su eje Y
window.girarFiguraY = function (velocidad = 0.02, duracion = 2000) {
    if (!mainModel) return;
    let tiempoInicio = performance.now();
    let rotar = true;

    function rotarY(now) {
        if (!rotar || !mainModel) return;
        let elapsed = now - tiempoInicio;
        if (elapsed < duracion) {
            mainModel.rotation.y += velocidad;
            requestAnimationFrame(rotarY);
        }
    }
    requestAnimationFrame(rotarY);

    window.detenerGiroFiguraY = () => { rotar = false; };
};
