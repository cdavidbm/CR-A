# Importar librerías (en pseudocódigo, solo como referencia)
# import three
# from three.controls import OrbitControls
# from three.loaders import GLTFLoader

# 1. VARIABLES GLOBALES
# Se definen variables para manejar la escena, el modelo principal, animaciones y estados de la interfaz.
main_mesh = None  # Referencia a la malla principal del modelo cargado
auto_rotate = False  # Indica si la cámara debe rotar automáticamente
animation_mixer = None  # Mezclador de animaciones (para modelos animados)
animation_action = None  # Acción de animación activa
animation_playing = False  # Estado de reproducción de la animación

# 2. CONFIGURACIÓN DE ESCENA Y RENDERER
# Se obtiene el contenedor HTML (div) donde se renderiza la escena.
escena_div = get_element_by_id("escena")
width = escena_div.width
height = escena_div.height

# Se crea la escena, la cámara y el renderer (motor de renderizado 3D).
scene = Scene()
camera = PerspectiveCamera(fov=75, aspect=width / height, near=0.1, far=1000)
renderer = WebGLRenderer(alpha=True, antialias=True)
renderer.set_clear_color(0x000000, alpha=0)  # Fondo transparente
renderer.set_size(width, height)
renderer.tone_mapping = "ACESFilmic"
renderer.tone_mapping_exposure = 1.1
renderer.output_encoding = "sRGB"
escena_div.append(renderer.dom_element)  # Se agrega el canvas al DOM

# 3. ILUMINACIÓN DE LA ESCENA
# Se agregan diferentes tipos de luces para dar realismo y profundidad.
scene.add(AmbientLight(color=0xFFFFFF, intensity=0.15))  # Luz ambiental suave
hemi_light = HemisphereLight(sky_color=0xFFFFFF, ground_color=0x222233, intensity=0.3)
hemi_light.position = (0, 1, 0)
scene.add(hemi_light)

dir_light = DirectionalLight(color=0xFFFFFF, intensity=0.5)
dir_light.position = (3, 10, 10)
dir_light.cast_shadow = True
dir_light.shadow_bias = -0.0001
dir_light.shadow_map_size = (2048, 2048)
scene.add(dir_light)

spot_light = SpotLight(
    color=0xFFF0E0, intensity=0.25, angle=PI / 6, penumbra=0.2, decay=1.5
)
spot_light.position = (-8, 12, 8)
spot_light.cast_shadow = True
scene.add(spot_light)

# Fondo transparente (puede cambiarse por un gradiente si se desea)
scene.background = None

# 4. CONTROLES DE ÓRBITA
# Permiten mover la cámara con el mouse alrededor del modelo.
controls = OrbitControls(camera, renderer.dom_element)
camera.position.z = 4
controls.update()

# 5. CARGA DEL MODELO 3D (GLB/GLTF)
# Se utiliza un cargador para importar el modelo y configurar sus materiales y animaciones.
loader = GLTFLoader()


def on_model_loaded(gltf):
    # Se agrega el modelo cargado a la escena.
    scene.add(gltf.scene)
    # --- Recorrido de todos los objetos del modelo ---
    for obj in gltf.scene.traverse():
        if obj.is_mesh:
            # Se guarda la primera malla encontrada como principal.
            if main_mesh is None:
                main_mesh = obj
            obj.cast_shadow = True
            obj.receive_shadow = True
            # Si el material es del tipo estándar, se ajustan sus propiedades para mejor apariencia.
            if obj.material and obj.material.is_mesh_standard_material:
                obj.material.roughness = 0.25
                obj.material.metalness = 0.7
                obj.material.env_map_intensity = 1.2
                obj.material.clearcoat = 0.6
                obj.material.clearcoat_roughness = 0.15
                obj.material.sheen = 0.5
                obj.material.sheen_color = Color(0x88AAFF)
                obj.material.bump_map = generate_noise_texture()
                obj.material.bump_scale = 0.08
                obj.material.needs_update = True
    # --- Configuración de animaciones si existen ---
    if gltf.animations and len(gltf.animations) > 0:
        animation_mixer = AnimationMixer(gltf.scene)
        animation_action = animation_mixer.clip_action(gltf.animations[0])
    # --- Creación de sliders para morph targets (shape keys) ---
    for obj in gltf.scene.traverse():
        if obj.is_mesh and obj.morph_target_influences and obj.morph_target_dictionary:
            morph_dict = obj.morph_target_dictionary
            morph_influences = obj.morph_target_influences
            controls_div = get_element_by_id("morph-controls")
            for name, idx in morph_dict.items():
                # Se crea un slider para cada morph target, permitiendo modificar la geometría.
                slider = create_slider(
                    min=0, max=1, step=0.01, value=morph_influences[idx]
                )

                def on_slider_input():
                    morph_influences[idx] = slider.value

                slider.on_input = on_slider_input
                controls_div.append(slider)


# Se inicia la carga del modelo, llamando a la función anterior al terminar.
loader.load("modelo.glb", on_model_loaded)

# 6. REFERENCIAS A CONTROLES DE LA INTERFAZ
# Se obtienen los elementos de la interfaz para color, tamaño y botones de control.
color_slider = get_element_by_id("color")
size_slider = get_element_by_id("size")
wireframe_btn = select_element(".btn:nth-child(3)")
auto_rotate_btn = select_element(".btn:nth-child(2)")
animar_btn = select_element(".btn:nth-child(1)")


# 7. EVENTOS DE LOS SLIDERS Y BOTONES
# Cada función responde a la interacción del usuario con la interfaz.


def on_color_slider_input():
    # Cambia el color del material principal según el valor del slider.
    if main_mesh and main_mesh.material:
        h = color_slider.value / 360
        s, l = 0.7, 0.5
        color = Color.from_hsl(h, s, l)
        if isinstance(main_mesh.material, list):
            for mat in main_mesh.material:
                if hasattr(mat, "color"):
                    mat.color = color
        else:
            if hasattr(main_mesh.material, "color"):
                main_mesh.material.color = color


color_slider.on_input = on_color_slider_input


def on_size_slider_input():
    # Cambia la escala del modelo principal según el slider.
    if main_mesh:
        scale = size_slider.value / 100
        main_mesh.scale = (scale, scale, scale)


size_slider.on_input = on_size_slider_input


def on_wireframe_btn_click():
    # Alterna el modo wireframe del material principal.
    if main_mesh and main_mesh.material:
        if isinstance(main_mesh.material, list):
            for mat in main_mesh.material:
                if hasattr(mat, "wireframe"):
                    mat.wireframe = not mat.wireframe
        else:
            if hasattr(main_mesh.material, "wireframe"):
                main_mesh.material.wireframe = not main_mesh.material.wireframe


wireframe_btn.on_click = on_wireframe_btn_click


def on_auto_rotate_btn_click():
    # Activa o desactiva la auto rotación de la cámara.
    global auto_rotate
    auto_rotate = not auto_rotate
    controls.auto_rotate = auto_rotate
    controls.auto_rotate_speed = 2.0


auto_rotate_btn.on_click = on_auto_rotate_btn_click


def on_animar_btn_click():
    # Inicia o pausa la animación del modelo si existe.
    if animation_mixer and animation_action:
        if not animation_playing:
            animation_action.play()
            animation_playing = True
        else:
            animation_action.paused = not animation_action.paused


animar_btn.on_click = on_animar_btn_click


# 8. BUCLE PRINCIPAL DE ANIMACIÓN/RENDERIZADO
# Este bucle se ejecuta continuamente para actualizar la escena y renderizarla.
def animate():
    while True:
        controls.update()  # Actualiza los controles de cámara
        if animation_mixer and animation_playing:
            animation_mixer.update(0.016)  # Avanza la animación si está activa
        renderer.render(scene, camera)  # Renderiza la escena
        wait_next_frame()  # Espera al siguiente frame (simula requestAnimationFrame)


animate()


# 9. AJUSTE DE TAMAÑO AL REDIMENSIONAR LA VENTANA
# Permite que la escena se adapte al tamaño del contenedor cuando cambia la ventana.
def on_resize():
    width = escena_div.width
    height = escena_div.height
    camera.aspect = width / height
    camera.update_projection_matrix()
    renderer.set_size(width, height)


window.on_resize = on_resize


# 10. UTILIDADES PARA TEXTURAS PROCEDURALES
def generate_gradient_texture():
    # Crear un canvas y dibujar un gradiente (no se usa por defecto)
    pass


def generate_noise_texture():
    # Crear un canvas y dibujar ruido aleatorio (usado como bumpMap)
    pass


# 11. INTEGRACIÓN MIDI (CONTROL EXTERNO)
# Permite controlar sliders y parámetros desde un controlador MIDI externo.
if midi_access_available():
    midi_access = request_midi_access()
    for input in midi_access.inputs:
        input.on_midi_message = handle_midi_message


def handle_midi_message(event):
    status, cc, value = event.data
    if (status & 0xF0) == 0xB0:
        # Morph knobs: CC 110-115 (asigna a sliders de morph target)
        if 110 <= cc <= 115:
            idx = cc - 110
            morph_controls = select_all('#morph-controls input[type="range"]')
            if idx < len(morph_controls):
                v = value / 127
                morph_controls[idx].value = v
                morph_controls[idx].trigger_input()
        # Color: CC 116 (0-127 -> 0-360)
        if cc == 116:
            v = round((value / 127) * 360)
            color_slider.value = v
            color_slider.trigger_input()
        # Tamaño: CC 117 (0-127 -> 50-150)
        if cc == 117:
            v = round(50 + (value / 127) * 100)
            size_slider.value = v
            size_slider.trigger_input()


# ---------------------------------------------------------------
# FLUJO GENERAL DEL SCRIPT:
# 1. Se inicializan la escena, cámara, renderer y luces.
# 2. Se cargan los modelos 3D y se configuran materiales y animaciones.
# 3. Se crean controles de interfaz (sliders, botones) y se enlazan eventos.
# 4. Se ejecuta un bucle de animación/renderizado que mantiene la escena actualizada.
# 5. Se permite el control externo vía MIDI para manipular parámetros en tiempo real.
# ---------------------------------------------------------------
