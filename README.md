# Requerimientos del proyecto: Calculadora IP (CIDR y VLSM)

Este README resume y completa los requerimientos extraidos de `Proyecto.pdf`. Esta enfocado en lo necesario para iniciar el desarrollo con HTML, CSS y JavaScript.

## Objetivo
Desarrollar una calculadora de redes IP que incluya:
- Calculos CIDR para una red/IP dada,
- Calculo de subredes con VLSM para una red base y requerimientos de hosts.

## Funcionalidades obligatorias

### 1) Calculadora IP CIDR
- Entrada:
  - direccion IP con prefijo (ej. `192.168.1.0/24`) o IP + mascara,
  - la mascara puede ser en prefijo `/n` o en notacion decimal punteada.
- Salida (obligatoria):
  - network address,
  - rango de hosts (primer host y ultimo host),
  - direccion broadcast,
  - mascara en notacion decimal punteada y prefijo `/n`,
  - numero de hosts disponibles,
  - representacion binaria (opcional).
- Validar entradas y mostrar mensajes de error claros.

### 2) Calculadora VLSM
- Entrada:
  - red base (ej. `10.0.0.0/16`),
  - lista de subredes con nombre y hosts requeridos (ej. `DeptoA: 120`, `DeptoB: 50`, etc.).
- Reglas del algoritmo:
  - `needed_hosts = required_hosts + 2` (red y broadcast).
  - ordenar subredes por `needed_hosts` de mayor a menor.
  - `mask_bits = 32 - ceil(log2(needed_hosts))`.
  - `block_size = 2^(32 - mask_bits)`.
  - asignar bloques contiguos sin solapamientos dentro de la red base.
  - validar que no se exceda el espacio disponible; si excede, error claro.
- Salida por subred:
  - network,
  - mascara (prefijo y dotted),
  - rango de hosts,
  - broadcast,
  - numero de hosts validos,
  - espacio desperdiciado.
- Mostrar espacio restante en la red base (si aplica).

### 3) Validaciones y manejo de errores
- IP invalida, prefijo fuera de rango (0-32), mascara no valida.
- Requerimientos de hosts negativos o cero.
- Exceso de hosts respecto a la red base.
- Mensajes de error comprensibles y consistentes.

### 4) Interfaz y salida
- Salida legible; GUI opcional.
- Para web: formularios claros y resultados en tablas o tarjetas.
- Prioridad: calculo correcto y salida entendible.

## Algoritmo VLSM (pasos base)
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
   - guardar asignacion con `/mask_bits`.
   - `current_network = current_network + block_size`.
6. Validar que `current_network` no exceda `network_base + 2^(32 - prefix_base)`.
7. Si excede, devolver error: espacio insuficiente.
8. Nota tecnica: trabajar con IPs como enteros facilita sumas y alineacion; incluir funciones de conversion dotted <-> integer.

## Reglas de calculo CIDR (referencia)
- total de direcciones por red: `2^(32 - prefix)`.
- hosts disponibles: `2^(32 - prefix) - 2` (red y broadcast).
- network address: `ip AND mask`.
- broadcast: `network OR (~mask)`.

## Requisitos de presentacion de resultados
- Mostrar resultados de forma clara y consistente.
- Para VLSM, presentar cada subred con sus campos completos.
- Incluir mensajes de error visibles y no ambiguos.

## Casos de prueba requeridos
- CIDR: `192.168.10.0/24` -> network `192.168.10.0`, host range `192.168.10.1-192.168.10.254`, broadcast `192.168.10.255`.
- VLSM: base `192.168.0.0/24`, requerimientos `A=100`, `B=50`, `C=25`, `D=10`; mostrar asignacion de subredes y espacio restante.
- Caso limite: pedir mas hosts de los disponibles debe producir un error claro.

## Requisitos tecnicos del codigo
- Estructura modular: separar logica de calculo, UI y utilidades.
- Comentarios claros en funciones criticas.
- Pruebas unitarias basicas para funciones criticas (mascara, broadcast).
- README con pasos de ejecucion y pruebas.
- Licencia o atribucion si se usan librerias externas.

## Pruebas unitarias (minimo esperado)
- pruebas de calculo de mascara y broadcast.
- pruebas de conversion IP dotted <-> integer.
- pruebas de VLSM con los casos requeridos.

## Entregables obligatorios (segun PDF)
- Documento PDF con portada, introduccion, desarrollo (incluye algoritmo), fragmentos de codigo y explicacion, conclusiones y pruebas.
- README con pasos de ejecucion y pruebas.
- Video demostrativo (mp4) con presentacion, explicacion del VLSM, demo en vivo y pruebas.
- Codigo fuente en ZIP o link a repositorio.
- Ejecutable o instrucciones claras de ejecucion (incluir `.bat`/`.sh` si aplica).
- Lista de integrantes y roles (firma electronica o texto).
- Formato de nombres: `EquipoX_CalculadoraIP.zip`, `EquipoX_CalculadoraIP.pdf`, `EquipoX_CalculadoraIP.mp4`.

## Referencias (ejemplos de calculadoras)
- CIDR: `https://www.aprendaredes.com/calculadora-ip/`
- CIDR CGI: `https://aprendaredes.com/cgi-bin/ipcalc/ipcalc_cgi1`
- VLSM: `https://arcadio.gq/calculadora-subredes-vlsm.html`

# Documentacion del sistema

## Arquitectura
- **UI**: `index.html` define estructura, formularios y contenedores de resultados.
- **Estilos**: `css/styles.css` contiene la identidad visual, layout responsive y animaciones.
- **Orquestacion**: `js/main.js` inicializa modulos en `DOMContentLoaded`.
- **Logica CIDR**: `js/cidr.js` resuelve red, broadcast y rangos.
- **Logica VLSM**: `js/vlsm.js` asigna bloques contiguos y valida espacio.
- **Utilidades**: `js/ip-utils.js` conversiones y validaciones IPv4.
- **Pruebas**: `js/tests.js` ejecuta pruebas unitarias basicas.
- **Capa UI JS**: `js/ui.js` enlaza formularios, renderiza resultados y muestra errores.

## Estructura de proyecto
- `index.html`: pagina principal con secciones CIDR, VLSM, pruebas y guia.
- `css/styles.css`: estilos, grid, tablas, componentes y animaciones.
- `js/main.js`: punto de entrada.
- `js/ui.js`: control de interfaz, formularios y render.
- `js/ip-utils.js`: parseo y conversion IP/prefijo/mascara.
- `js/cidr.js`: calculos CIDR.
- `js/vlsm.js`: calculos VLSM.
- `js/tests.js`: pruebas unitarias.

## Flujo de ejecucion
1. El navegador carga `index.html` y `css/styles.css`.
2. `js/main.js` registra los inicializadores.
3. `js/ui.js` enlaza eventos de formularios CIDR y VLSM.
4. Al enviar un formulario, se valida entrada con `js/ip-utils.js`.
5. Si es valido, se ejecuta la logica en `js/cidr.js` o `js/vlsm.js`.
6. Se renderizan tablas y tarjetas de resultados en la UI.
7. El boton de pruebas ejecuta `js/tests.js` y muestra el reporte.

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
Las pruebas unitarias cubren:
- Conversion IP <-> entero.
- Conversion prefijo <-> mascara.
- Caso CIDR `192.168.10.0/24`.
- Caso VLSM base `192.168.0.0/24` con `A=100`, `B=50`, `C=25`, `D=10`.

Para ejecutarlas:
1. Abrir el sitio en un servidor local.
2. Ir a la seccion **Pruebas unitarias**.
3. Pulsar **Ejecutar pruebas**.

## Decisiones tecnicas
- **Sin framework**: JavaScript modular nativo para mantener el proyecto ligero.
- **Separacion de capas**: logica, utilidades y UI en archivos independientes.
- **Render dinamico**: resultados se generan en tablas con DOM limpio.
- **Accesibilidad**: etiquetas, mensajes con `aria-live` y controles claros.

## Ejecucion local
Por el uso de ES modules, es recomendable levantar un servidor local:

```bash
python3 -m http.server 8000
```

Luego abrir `http://localhost:8000` en el navegador.

Alternativas:

```bash
python -m http.server 8000
```

```bash
php -S localhost:8000
```

## Atribuciones
- Fuentes de Google Fonts: Space Grotesk, IBM Plex Mono.
