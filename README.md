# AutoFlow Pro

Por favor, actúa como un Ingeniero de Software Principal y Desarrollador Full-Stack Experto. Construye una aplicación web progresiva (PWA) avanzada, móvil-primero, para la gestión de un Taller Automotriz y Centro de Mantenimiento de Vehículos (Motos y Carros). La aplicación debe ser altamente estética, modular y completamente funcional utilizando CONEXIONES DIRECTAS Y NATIVAS DESDE LA APP, SIN EL USO DE WEBHOOKS NI INTERMEDIARIOS COMO MAKE.

1. ARQUITECTURA DE CONEXIÓN DIRECTA Y CONTROL DE GOOGLE CALENDAR
El backend y la lógica de la aplicación deben comunicarse directamente con cada servicio mediante sus respectivas APIs o SDKs nativos:
- Capa de Texto (Conexión Directa a Supabase): Almacena y lee registros estructurados relacionales utilizando el cliente nativo de Supabase (`@supabase/supabase-js`). Tablas a crear: Clientes, Vehiculos, Documentos_Vencimiento, Historial_Mantenimientos y Personal_Presente.
- Capa de Almacenamiento (Conexión Directa a Google Drive API): Las fotos de evidencia de la app se suben directamente a tu cuenta vinculada de Google Drive mediante peticiones REST, organizándolas en una estructura de carpetas por placa (`/Mantenimientos/PLACA_VEHICULO/`). 
- Capa de Agendamiento Bidireccional y Notificaciones (Conexión Directa a Google Calendar API):
  * Guardado Automático: El sistema calcula la fecha del próximo servicio preventivo o alertas de vencimiento de documentos y ejecuta un fetch directo a la API de Google Calendar utilizando las credenciales del proyecto. Añade obligatoriamente el email del cliente como invitado (attendee) e inyecta en la descripción del evento los enlaces públicos de las fotos que se acaban de subir directamente a Google Drive.
  * Opción de Borrado Físico: Cada mantenimiento o alerta de documento en la app debe mostrar un botón interactivo para "Eliminar del Calendario". Al presionarlo, la app debe realizar una petición DELETE directa a la API de Google Calendar usando el 'calendar_event_id' almacenado en Supabase, removiendo el evento tanto de tu calendario como del calendario personal del cliente de forma simultánea.
  * Botón de Envío / Alerta Forzada: Añade un botón específico junto a cada alerta de vencimiento (SOAT, Técnico-Mecánica, etc.) o mantenimiento programado que permita "Enviar Invitación por Calendario". Al hacer clic, la app forzará una actualización o reenvío del evento a través de la API de Google Calendar usando el parámetro `sendUpdates=all` para gatillar una notificación inmediata en la bandeja de entrada del correo del cliente, obligándolo a visualizar el recordatorio.

2. MÓDULO DE FORMULARIOS TOTALMENTE ESPECIFICADOS (CAMPOS OBLIGATORIOS)
Diseña la base de datos y las vistas de captura asegurando el registro estricto de los siguientes campos estructurados sin omitir ninguno:

A) Ficha del Vehículo (Inspirado en Licencia de Tránsito / Tarjeta de Propiedad):
- Placa (Clave primaria única con máscara alfanumérica obligatoria en mayúsculas).
- Tipo de Vehículo (Menú desplegable: Motocicleta, Carro, Camioneta).
- Marca, Modelo (Año), Cilindrada (cc) y Color.
- Número de Chasis (VIN) y Número de Motor.
- Tipo de Carrocería y Tipo de Combustible (Gasolina, Diésel, Eléctrico, Híbrido).
- Fecha de Matrícula Inicial y Organismo de Tránsito donde está registrado.
- Componente de Foto del Vehículo: Carga directa y visualización fluida de la fotografía real del automotor en su ficha técnica.

B) Ficha de Control de Vencimiento de Documentos del Vehículo:
Añade una sección crítica para registrar las fechas de expedición y, obligatoriamente, la Fecha de Vencimiento de:
- SOAT (Seguro Obligatorio de Accidentes de Tránsito).
- Revisión Técnico-Mecánica y de Emisiones Contaminantes.
- Licencia de Conducción del Propietario (Categorías y vigencia).
- Tarjeta de Operación o Permisos Especiales de Movilización (si aplica).
- Alertas Visuales: El sistema pintará en el dashboard indicadores de color (Verde: Vigente, Amarillo: Vence en menos de 30 días, Rojo: Vencido) y agendará automáticamente un recordatorio directo en Google Calendar 7 días antes de cada vencimiento, invitando al correo del cliente.

C) Ficha del Dueño / Cliente:
- Nombre Completo, Nombre de la Empresa o Razón Social.
- Tipo de Documento (Cédula de Ciudadanía, Cédula de Extranjería, Pasaporte, NIT).
- Número de Identificación (Validación numérica exacta).
- Teléfono Celular Principal (Con código de país para WhatsApp) y Teléfono Secundario.
- Correo Electrónico (Campo obligatorio y validado para invitaciones de Calendar).
- Dirección de Residencia/Correspondencia, Ciudad y Departamento.

D) Registro de Mantenimiento, Lubricación y Entrada:
- Fecha del Servicio y Hora de Entrada del vehículo.
- Kilometraje Actual (Odómetro de entrada).
- Tipo de Servicio (Menú parametrizado multiselección: Cambio de Aceite de Motor, Cambio de Aceite de Transmisión/Caja, Pastillas/Bandas de Freno, Kit de Arrastre/Correa de Distribución, Sincronización de Motor, Mantenimiento General, Líquido de Frenos/Embrague, Suspensión).
- Descripción técnica detallada del diagnóstico y del procedimiento ejecutado.
- Desglose Económico: Repuestos/Insumos Cambiados, Costo de Mano de Obra, Costo de los Repuestos, Valor del IVA (Establecido por defecto en 0% con opción de modificar de manera manual), y Valor Total Neto Calculado Automáticamente.
- Módulo de Control de Personal Interno: Sección independiente dentro del registro donde se guarde en Supabase un arreglo de los operarios presentes mediante casillas de verificación (Mecánico Líder, Técnico Auxiliar, Supervisor de Calidad).

3. MOTOR DE TELEMETRÍA Y CONTROL PREDICTIVO DE KILOMETRAJE
Implementa un algoritmo matemático de analítica de datos para calcular el desgaste y uso del vehículo de manera local:
- Cálculo de Consumo Diario: Cada vez que se registre un nuevo mantenimiento, el sistema tomará la fecha y el kilometraje del registro actual y los comparará con la fecha y el kilometraje del registro inmediatamente anterior de esa misma placa en Supabase. Dividirá la diferencia de kilómetros entre los días transcurridos para obtener el "Promedio de Kilómetros por Día".
- Proyecciones de Desgaste: Multiplicando el promedio diario, la aplicación calculará e imprimirá automáticamente en la ficha del vehículo las métricas de uso estimadas: Kilómetros subidos por Semana, Kilómetros subidos por Mes y Kilómetros subidos por Año.
- Alertas de Próximos Cambios Inteligentes: Al guardar un mantenimiento de "Cambio de Aceite de Motor", el sistema establecerá un límite preventivo por defecto de +3,000 Km (o el número que el usuario parametrice) y una vigencia por tiempo (ej. 3 meses). Utilizando el promedio de consumo diario calculado, la aplicación predecirá la fecha exacta en el calendario en la que el cliente alcanzará ese kilometraje. El sistema agendará automáticamente la cita en Google Calendar eligiendo el límite que ocurra primero (Vencimiento por Tiempo o Vencimiento por Kilometraje Proyectado).

4. DETALLES VISUALES Y DE FUNCIONALIDAD COMPLEMENTARIA (ESTILO "MEDULAR")
Aplica los siguientes estándares de interacción y microdiseño que garantizan la estabilidad y usabilidad de la plataforma:
- Buscador en Tiempo Real Ultra-Receptivo (Live Search): Implementa un input de búsqueda con el evento 'input' en la pantalla de inicio. Debe filtrar la lista de vehículos, clientes y mantenimientos de Supabase instantáneamente a medida que el usuario escribe, siendo insensible a mayúsculas/minúsculas (case-insensitive) y capaz de identificar coincidencias parciales con solo ingresar una letra o número de la placa, nombre del cliente, NIT o modelo del vehículo.
- Formato de Cadenas y Datos Estructurados: Al leer, restaurar o empaquetar información múltiple para los componentes visuales o integraciones, asegúrate de procesar las colecciones encapsuladas en arreglos limpios estructurados bajo el formato de corchetes `[ ]` alrededor de las variables de cadena de texto (JSON string), evitando textos pegados y parseando las variables de manera que los nombres, apellidos y descripciones mantengan estrictamente sus espacios en blanco originales (ej: "Yuli Murillo", "Conjunto Residencial").
- Persistencia Local de Predatos: Al navegar hacia atrás o volver a la pantalla de inicio, la aplicación debe almacenar temporalmente los predatos del formulario actual en la memoria local (`localStorage`). Si el usuario inicia un mantenimiento, el formulario debe recuperar esos datos previos para ahorrar tiempo de escritura.
- Modales de Confirmación y Enfoque Visual: Todos los botones de eliminación de registros, limpieza de formularios o acciones críticas de guardado directo (incluyendo "Eliminar del Calendario") deben desplegar ventanas modales flotantes centrales en el frente de la interfaz, aplicando un desenfoque profundo al fondo de la pantalla mediante estilos avanzados de diseño (Glassmorphism con `backdrop-filter: blur(8px)`). El botón de borrar formulario solo limpiará los cambios locales y regresará al inicio de forma segura sin alterar registros existentes en la base de datos.
- Enlaces de Comunicación Directa (CRM): Cada ficha del cliente debe incorporar botones estilizados con accesos directos y dinámicos para abrir chats nativos de WhatsApp (`https://wa.me`) con textos pre-redactados que incluyan los datos del vehículo y la fecha proyectada de su próximo mantenimiento o vencimiento de SOAT/Técnico-mecánica, así como enlaces de correo electrónico mediante el protocolo `mailto:`.
- Bloqueo de Acciones Duplicadas: Al guardar con éxito un mantenimiento, los botones de acción principal en la interfaz deben deshabilitarse de inmediato (`disabled`) y cambiar su etiqueta visual para indicar que el proceso ya fue guardado en Supabase, el archivo fue subido a Drive y el evento en Calendar ya fue emitido, previniendo peticiones directas duplicadas o basura en el sistema.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://motormedular.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/69f51f96-68ac-48fb-810a-6be4f3ee078f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
