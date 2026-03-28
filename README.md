# Proyecto: Árbol Genealógico Familiar Interactivo

## Descripción General
Aplicación web *Frontend-only* alojada en **GitHub Pages**. Permite visualizar y editar un árbol genealógico. La persistencia de datos se logra mediante una API REST personalizada en **Google Apps Script** que interactúa con **Google Sheets**.

## Arquitectura y Stack Tecnológico
* **Frontend:** HTML5, CSS3, JavaScript.
* **Librería de Renderizado:** Se requiere el uso de una librería especializada en visualización de grafos/organigramas (ej. D3.js, Treant.js, vis-network, o GoJS) para facilitar el dibujo complejo de los nodos y sus conexiones.
* **Hosting:** GitHub Pages.
* **Backend / DB:** Google Sheets + Google Apps Script (Endpoints `GET` y `POST`).

## Estructura de Datos (Esquema)
Cada individuo se representa como un objeto JSON. Observa la separación de nombre/apellido, las claves de relación y la lógica condicional para el estado vital:

* `id` (String/UUID) - Identificador único.
* `nombre` (String) - Nombre(s).
* `apellido` (String) - Apellido(s).
* `sexo` (String) - "M", "F", u otro.
* `fechaNacimiento` (String/Date) - Fecha de nacimiento.
* `fallecido` (Boolean) - Estado vital (true/false).
* `fechaFallecimiento` (String/Date/null) - Fecha de defunción (requerido únicamente si `fallecido` es `true`).
* `idPadre` (String/null) - ID del padre biológico/adoptivo.
* `idMadre` (String/null) - ID de la madre.
* `idPareja` (String/Array/null) - ID de la pareja o cónyuge.

## Lógica de Renderizado y Jerarquía (¡Importante!)
El script de renderizado debe procesar el arreglo plano de JSONs y construir la jerarquía visual respetando estas reglas:

1.  **Cálculo de la Raíz (Top-Level):** El algoritmo debe identificar automáticamente los nodos "raíz". Estos son los individuos más antiguos registrados (aquellos que no tienen `idPadre` ni `idMadre` definidos en la base de datos). Desde ellos fluye la jerarquía hacia abajo (descendientes).
2.  **Manejo de Parejas (Nodos Laterales):** Las parejas que no tienen ascendencia dentro del árbol original no deben renderizarse como nodos flotantes ni alterar el nivel jerárquico de las generaciones.
    * Cuando un nodo tiene un `idPareja`, ese individuo (la pareja) debe renderizarse en el **mismo nivel horizontal** (misma generación) que su cónyuge, conectado por una línea de relación especial (ej. línea horizontal directa, distinta a la línea vertical de descendencia).
    * Si de esa unión hay hijos, las líneas de descendencia para los hijos deben partir visualmente de la conexión entre ambos miembros de la pareja.
3.  **Generaciones (Niveles Y):** Los hijos siempre deben ubicarse un nivel jerárquico por debajo de sus padres, calculando la profundidad del árbol de manera dinámica.

## Instrucciones de Desarrollo para Antigravity
Actúa como un desarrollador web experto:

1.  **Cero Backend Local:** Todo el código debe ser estático para GitHub Pages. No Node.js, no SQL.
2.  **API Handler:** Crea una clase/módulo JS para encapsular el `fetch` (GET/POST) hacia la URL de Apps Script. Implementa un estado de "Carga" en la UI durante las peticiones asíncronas.
3.  **Implementación de la Librería:** Configura la librería de grafos elegida para que acepte nuestra estructura de datos plana, la parsee y aplique la lógica de renderizado jerárquico descrita arriba.
4.  **UI/UX y Formulario Condicional:** * Crea un modal interactivo con un formulario para que los usuarios puedan dar de alta un nuevo miembro. 
    * El formulario debe incluir lógica condicional: el campo "Fecha de fallecimiento" debe estar oculto o deshabilitado por defecto, y solo debe mostrarse/habilitarse si el usuario marca la casilla de verificación `fallecido`.
    * El formulario debe permitir seleccionar parentescos (quién es su padre, madre o pareja en base a los datos existentes en el estado de la aplicación).