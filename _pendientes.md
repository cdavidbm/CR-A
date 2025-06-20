# Lista de Tareas del Proyecto


## Adaptación para versión web pública y móvil

-  Usar `entorno.html` como página principal, no `index.html`.
-  Transformar el contenido de `index.html` en un menú desplegable o ventana modal accesible con un botón.
-  Mostrar los controles de morphing como *sliders*.
-  Agrupar las manipulaciones junto con los sliders morph-controls.
-  Ubicar la sección de transformación de la criatura (sliders y controles) en la parte inferior de la ventana.
-  Mostrar la escena principal en la parte superior.
-  Adaptar completamente la interfaz para móviles.


## Música y sonido

### Efectos sonoros

-  `index.html`:  
  -  Controles  
  -  Modo autorrotación  
  -  Modo animación  
  -  Click de envío de criatura

-  `entorno.html`:  
  -  Aparición de criatura  
  -  Colisiones  

### Música ambiental

-  Incluir música ambiental general para ambas escenas.

## Implementación de MediaPipe

### Seguimiento de mano

-  Usar la mano como cursor.

### Gestos a implementar

-  Agarre y liberación de criaturas.
-  Apuntar para crear puntos de comida que atraigan criaturas.
-  Arrastrar la mano para simular viento y mover criaturas o puntos rojos.

## Conversión y recombinación de modelos (Blender → Python)

1.  Descargar el modelo desde Blender.
2.  Abrir el modelo en Blender.
3.  Convertir el modelo a código Python.
4.  Probar el script para verificar la recreación de la figura.
5.  Integrar el script en el proyecto, reemplazando una criatura existente.
6.  Traer el modelo al proyecto y hacer pruebas.
7.  Recombinarlos para formar un nuevo set de criaturas.


## Actualizar Script análitico de python

- actualizar archivo de `main.js` y crear uno nuevo para `entorno.js`