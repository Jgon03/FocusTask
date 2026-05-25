# Entrega del proyecto FocusTask

## Datos generales

- Estudiante: Jhoiner Gonzalez Puerta
- Asignatura: Desarrollo Web
- Proyecto: FocusTask - Task Manager Web
- Tipo: Sistema de gestion de tareas con autenticacion

## Descripcion

FocusTask es una aplicacion web para organizar tareas personales. Permite registrar usuarios, iniciar sesion, crear tareas, editarlas, eliminarlas, marcarlas como completadas y filtrarlas por estado.

## Problema

Muchas personas gestionan sus actividades de forma desorganizada, lo que causa perdida de informacion, baja productividad, dificultad para priorizar y falta de seguimiento.

## Solucion

La aplicacion centraliza las tareas del usuario en una interfaz sencilla y segura. Cada usuario accede con sus credenciales y administra un tablero personal de tareas.

## Objetivo general

Desarrollar una aplicacion web de gestion de tareas que permita a los usuarios organizar sus actividades mediante autenticacion y operaciones CRUD.

## Objetivos especificos

- Implementar registro e inicio de sesion de usuarios.
- Crear una API para gestionar tareas.
- Permitir crear, listar, editar, completar y eliminar tareas.
- Disenar una interfaz responsive y facil de usar.
- Aplicar buenas practicas de organizacion del codigo.

## Requerimientos funcionales

- Registro de usuario.
- Inicio de sesion.
- Proteccion de rutas mediante token.
- Creacion de tareas.
- Edicion de tareas.
- Eliminacion de tareas.
- Marcado de tareas como completadas.
- Filtro de tareas por estado.

## Requerimientos no funcionales

- Interfaz intuitiva.
- Tiempo de respuesta rapido.
- Codigo organizado.
- Seguridad basica para contrasenas y sesiones.
- Estructura preparada para futuras mejoras.

## Tecnologias usadas

- HTML, CSS y JavaScript para la interfaz funcional.
- Node.js para el backend.
- API REST para la comunicacion cliente-servidor.
- Archivo JSON como almacenamiento local demostrativo.
- GitHub como repositorio sugerido.

## Nota sobre alcance tecnico

La propuesta academica inicial menciona React, TypeScript, Prisma y PostgreSQL. Para asegurar una entrega ejecutable en cualquier computador sin instalar paquetes adicionales, esta version usa Node.js, JavaScript local y almacenamiento JSON. La arquitectura conserva una API REST y puede migrarse despues a React, Prisma y PostgreSQL sin cambiar el flujo principal del usuario.

## Instrucciones de ejecucion

1. Abrir la carpeta del proyecto.
2. Ejecutar `node server.js` o `npm start`.
3. Abrir `http://localhost:3000`.
4. Crear una cuenta de usuario.
5. Crear y administrar tareas desde el tablero.

## Enlace del repositorio

Pendiente por agregar despues de subir el proyecto a GitHub:

```text
https://github.com/TU-USUARIO/focustask
```

## Enlace del proyecto funcionando

Pendiente por agregar despues del despliegue:

```text
https://TU-LINK-DE-DESPLIEGUE
```

## Recomendacion de despliegue

Para publicar rapidamente se puede usar Render, Railway o una maquina local con Node.js. Como el proyecto usa un servidor Node, debe desplegarse como servicio web y ejecutar:

```bash
node server.js
```
