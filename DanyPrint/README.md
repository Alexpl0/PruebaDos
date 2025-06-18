# Mi Impresora Web

## Descripción
Mi Impresora Web es una aplicación web que permite a los usuarios cargar un archivo de Excel desde su computadora, visualizarlo en formato de tabla HTML y prepararlo para impresión, todo sin necesidad de un servidor backend. Utiliza JavaScript y la biblioteca SheetJS para procesar los archivos Excel directamente en el navegador.

## Estructura del Proyecto
El proyecto contiene los siguientes archivos:

- **index.html**: Contiene la estructura principal de la aplicación web, incluyendo el diseño HTML, referencias a los archivos CSS y JavaScript, y elementos para la entrada de archivos, selección de tamaño de papel y visualización de salida.
  
- **script.js**: Contiene la lógica de JavaScript para la aplicación. Maneja los cambios en la entrada de archivos, lee el archivo de Excel seleccionado utilizando la API FileReader, procesa el archivo con la biblioteca SheetJS, convierte los datos a una tabla HTML y gestiona la funcionalidad de impresión.

- **style.css**: Contiene los estilos para la aplicación web. Incluye estilos generales para el diseño, controles y área de salida, así como estilos específicos para impresión que formatean el contenido correctamente al imprimir.

## Instrucciones de Uso
1. Abre el archivo `index.html` en tu navegador.
2. Selecciona un archivo de Excel desde tu computadora utilizando el botón de carga.
3. El contenido del archivo se mostrará en una tabla HTML en la página.
4. Selecciona el tamaño de papel deseado (carta o tabloide).
5. Haz clic en el botón "Imprimir" para enviar la tabla a la impresora.

## Requisitos
- Un navegador moderno que soporte JavaScript y la API FileReader.
- La biblioteca SheetJS (xlsx.js) debe estar incluida en el proyecto para el procesamiento de archivos Excel.

## Contribuciones
Las contribuciones son bienvenidas. Si deseas mejorar esta aplicación, siéntete libre de hacer un fork del repositorio y enviar un pull request.