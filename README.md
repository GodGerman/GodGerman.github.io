# Requerimientos del Proyecto: Calculadora IP (CIDR y VLSM)

Este README resume y completa los requerimientos extraidos de `Proyecto.pdf`. Esta enfocado en lo necesario para iniciar el desarrollo con HTML, CSS y JavaScript.

## Objetivo
Desarrollar una calculadora de redes IP que incluya:
- Calculos CIDR para una red/IP dada,
- Calculo de subredes con VLSM para una red base y requerimientos de hosts.

## Funcionalidades obligatorias

### 1) Calculadora IP CIDR
- Entrada:
  - Direccion IP con prefijo (ej. `192.168.1.0/24`) o IP + mascara,
  - La mascara puede ser en prefijo `/n` o en notacion decimal punteada.
- Salida:
  - Network address,
  - Rango de hosts (primer host y ultimo host),
  - Direccion broadcast,
  - Mascara en notacion decimal punteada,
  - Numero de hosts disponibles,
  - Representacion binaria (Opcional).
- Validar entradas y mostrar mensajes de error claros.

### 2) Calculadora VLSM
- Entrada:
  - Red base (ej. `10.0.0.0/16`),
  - Lista de subredes con nombre y hosts requeridos (ej. `DeptoA: 120`, `DeptoB: 50`, etc.).
- Reglas del algoritmo:
  - `needed_hosts = required_hosts + 2` (red y broadcast).
  - Ordenar subredes por `needed_hosts` de mayor a menor.
  - `mask_bits = 32 - ceil(log2(needed_hosts))`.
  - `block_size = 2^(32 - mask_bits)`.
  - Asignar bloques contiguos sin solapamientos dentro de la red base.
  - Validar que no se exceda el espacio disponible; si excede, error claro.
- Salida por subred:
  - Network,
  - Mascara,
  - Rango de hosts,
  - Broadcast,
  - Numero de hosts validos,
  - Espacio desperdiciado.
- Mostrar espacio restante en la red base (si aplica).

### 3) Validaciones y manejo de errores
- IP invalida, prefijo fuera de rango (0-32), mascara no valida.
- Requerimientos de hosts negativos o cero.
- Exceso de hosts respecto a la red base.
- Mensajes de error comprensibles y consistentes.

### 4) Interfaz y salida
- Salida legible; GUI.
- Para Web: formularios claros y resultados en tablas o tarjetas.

## Calculo CIDR
- Total de direcciones por red: `2^(32 - prefix)`.
- Hosts disponibles: `2^(32 - prefix) - 2` (red y broadcast).
- Network address: `ip AND mask`.
- Broadcast: `network OR (~mask)`.

## Calculo VLSM
1. Entrada: `network_base`, `prefix_base`, `subnets = [(name, required_hosts), ...]`.
2. Preparar lista: para cada subred, `needed_hosts = required_hosts + 2`.
3. Ordenar subredes por `needed_hosts` descendente.
4. Definir `current_network = network_base` (como entero de 32 bits).
5. Para cada subred:
   - `mask_bits = 32 - ceil(log2(needed_hosts))`.
   - `block_size = 2^(32 - mask_bits)`.
   - `network_address = current_network`.
   - `first_host = network_address + 1`.
   - `last_host = network_address + block_size - 2`.
   - `broadcast = network_address + block_size - 1`.
   - Guardar asignacion con `/mask_bits`.
   - `current_network = current_network + block_size`.
6. Validar que `current_network` no exceda `network_base + 2^(32 - prefix_base)`.
7. Si excede, devolver error: espacio insuficiente.
8. Nota tecnica: trabajar con IPs como enteros facilita sumas y alineacion; incluir funciones de conversion dotted <-> integer.

## Casos de prueba requeridos
- CIDR: `192.168.10.0/24` -> network `192.168.10.0`, host range `192.168.10.1-192.168.10.254`, broadcast `192.168.10.255`.
- VLSM: base `192.168.0.0/24`, requerimientos `A=100`, `B=50`, `C=25`, `D=10`; mostrar asignacion de subredes y espacio restante.
- Caso limite: pedir mas hosts de los disponibles debe producir un error claro.

# Documentacion del Sistema

## Vision general
Calculadora web estatica para IPv4 con dos vistas:
- **CIDR/FLSM** en `index.html`.
- **VLSM** en `vlsm.html`.

El proyecto usa JavaScript modular nativo y separa la logica de calculo del renderizado.

## Capas y responsabilidades
- **Presentacion**: `index.html`, `vlsm.html` definen formularios y contenedores de resultados.
- **Estilos**: `css/main.css` y modulos CSS (base, layout, components) definen la identidad visual.
- **Orquestacion**: `js/main.js` detecta la pagina y activa los modulos necesarios.
- **UI/DOM**: `js/ui.js` valida entradas, muestra errores y renderiza tablas/tarjetas.
- **Calculo CIDR/FLSM**: `js/cidr.js` implementa operaciones de red y subredes fijas.
- **Calculo VLSM**: `js/vlsm.js` asigna bloques variables con verificacion de espacio.
- **Utilidades IPv4**: `js/ip-utils.js` parsea, valida y convierte IPs/marascaras.
- **Pruebas**: `js/tests.js` ejecuta pruebas unitarias basicas sin dependencias externas.

## Modelo de datos y conversiones
- **IPv4 como arreglo**: `[a, b, c, d]` para lectura humana y salida.
- **IPv4 como entero**: `0..2^32-1` para operaciones bitwise y calculos de rangos.
- **Prefijo CIDR**: Entero `0..32` con conversion a mascara decimal punteada.

## Flujo principal
1. El usuario ingresa datos en el formulario.
2. `js/ui.js` valida y normaliza entradas con `js/ip-utils.js`.
3. Se ejecuta la logica en `js/cidr.js` o `js/vlsm.js`.
4. La UI renderiza resultados y/o mensajes de error.

## Algoritmos implementados
- **CIDR**: `network = ip AND mask`, `broadcast = network OR (~mask)`, `total = 2^(32 - prefix)`.
- **FLSM**: Calcula bits prestados `ceil(log2(subredes))`, nuevo prefijo y salto por bloque.
- **VLSM**: Suma 2 hosts (red/broadcast), ordena desc, asigna bloques contiguos y valida limite.

## Validaciones clave
- IP invalida, prefijo fuera de rango, mascara no contigua.
- Red base no alineada al prefijo.
- Hosts requeridos menores o iguales a cero.
- Exceso de espacio respecto a la red base.

## Estructura de proyecto
- `index.html`: pagina principal con secciones CIDR y VLSM.
- `css/main.css`: estilos, grid, tablas, componentes y animaciones.
- `js/main.js`: punto de entrada.
- `js/ui.js`: control de interfaz, formularios y render.
- `js/ip-utils.js`: parseo y conversion IP/prefijo/mascara.
- `js/cidr.js`: calculos CIDR.
- `js/vlsm.js`: calculos VLSM.
- `js/tests.js`: pruebas unitarias.

## Estructura de archivos
```
.
|-- Proyecto.pdf
|-- README.md
|-- index.html
|-- vlsm.html
|-- css
|   |-- main.css
|   |-- base
|   |   |-- reset.css
|   |   `-- variables.css
|   |-- components
|   |   |-- buttons.css
|   |   |-- cards.css
|   |   |-- forms.css
|   |   |-- hero.css
|   |   |-- status.css
|   |   `-- tables.css
|   `-- layout
|       |-- footer.css
|       |-- grid.css
|       `-- header.css
|-- img
|   |-- icono.ico
|   `-- logo.png
`-- js
    |-- cidr.js
    |-- ip-utils.js
    |-- main.js
    |-- tests.js
    |-- ui.js
    `-- vlsm.js
```

## Flujo de ejecucion
1. El navegador carga `index.html` y `css/main.css`.
2. `js/main.js` registra los inicializadores.
3. `js/ui.js` enlaza eventos de formularios CIDR y VLSM.
4. Al enviar un formulario, se valida entrada con `js/ip-utils.js`.
5. Si es valido, se ejecuta la logica en `js/cidr.js` o `js/vlsm.js`.
6. Se renderizan tablas y tarjetas de resultados en la UI.

## Logica principal

### CIDR
- **Entrada**: IP/prefijo o IP + mascara.
- **Pasos**:
  1. Parsear IP y prefijo.
  2. Calcular mascara en decimal.
  3. Network = IP AND mascara.
  4. Broadcast = Network OR (~mascara).
  5. Hosts disponibles = 2^(32 - prefijo) - 2.
- **Salida**: network, rango de hosts, broadcast, mascara, prefijo, wildcard y binario opcional.

### VLSM
- **Entrada**: red base con prefijo y lista de subredes con hosts requeridos.
- **Pasos**:
  1. `needed_hosts = required_hosts + 2`.
  2. Ordenar subredes por `needed_hosts` de mayor a menor.
  3. Para cada subred: `hostBits = ceil(log2(needed_hosts))`.
  4. `prefix = 32 - hostBits` y `block_size = 2^hostBits`.
  5. Asignar bloques contiguos desde la red base.
  6. Validar que el final de cada bloque no exceda la red base.
- **Salida**: red, mascara, rango de hosts, broadcast, hosts validos y desperdicio.

## Validaciones y errores
- IP invalida, prefijo fuera de rango o mascara no valida.
- Hosts requeridos menores o iguales a cero.
- Exceso de hosts respecto a la red base.
- Mensajes claros y consistentes en cada formulario.

## Pruebas
- CIDR: `192.168.10.0/24` -> network `192.168.10.0`, host range `192.168.10.1-192.168.10.254`, broadcast `192.168.10.255`.
- CIDR con mascara decimal: `10.0.0.1` + `255.255.255.0` -> network `10.0.0.0`, broadcast `10.0.0.255`.
- CIDR /31 y /32: verificar que el rango de hosts sea `N/A` y `usableHosts = 0`.
- FLSM: base `192.168.10.0/24` con `4` subredes -> nuevo prefijo `/26`, saltos de 64 direcciones.
- FLSM no potencia de 2: base `192.168.10.0/24` con `3` subredes -> prefijo `/26` y solo 3 subredes generadas.
- VLSM: base `192.168.0.0/24`, requerimientos `A=100`, `B=50`, `C=25`, `D=10`; mostrar asignacion de subredes y espacio restante.
- Binario: Activar representacion binaria y comprobar coherencia entre IP, mascara, network y broadcast.

Casos con error (validaciones):
- Error CIDR: IP invalida `300.1.1.1/24` debe mostrar mensaje claro.
- Error CIDR: Prefijo fuera de rango `/33` debe mostrar mensaje claro.
- Error Mascara: `255.0.255.0` (no contigua) debe ser rechazada.
- Error VLSM: Red base no alineada `192.168.1.10/24` debe indicar que no es direccion de red.
- Error VLSM: Hosts `0` o negativos deben rechazarse.
- Error VLSM: Suma de hosts que excede la red base (ej. `192.168.0.0/24` con `A=200`, `B=200`) debe mostrar “espacio insuficiente”.
- Error FLSM: Subredes excesivas que superen el limite de UI (ej. `5000`) deben mostrar error de limite.

## Ejecucion local
El proyecto se ejecuta con XAMPP usando Apache:

1. Coloca el proyecto dentro de la carpeta `htdocs` de XAMPP.
2. Inicia Apache desde el panel de control de XAMPP.
3. Abre el navegador y carga el archivo `index.html` desde el servidor local.

## Ejecucion en la web
El proyecto ya esta desplegado. Puedes acceder aqui:
- https://godgerman.github.io/