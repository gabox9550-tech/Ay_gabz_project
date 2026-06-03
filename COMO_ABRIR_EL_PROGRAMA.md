# Guía Paso a Paso: Cómo Abrir el Programa Tú Mismo

¡Hola! Esta guía está diseñada para que cualquier persona pueda iniciar el programa fácilmente, sin importar su nivel de experiencia. 

El programa se divide en dos partes que necesitan estar encendidas al mismo tiempo:
1. **El Servidor (Backend)**: Que conecta con la base de datos (SQL Server) y maneja la información.
2. **La Interfaz (Frontend)**: Las pantallas y ventanas que tú ves y utilizas en el navegador.

A continuación, te explico cómo encender ambas partes.

---

## 🛠️ Paso 1: Abrir la carpeta del proyecto en Visual Studio Code

1. Abre el programa **Visual Studio Code (VS Code)** en tu computadora.
2. En la parte superior izquierda, haz clic en **Archivo** (File) > **Abrir Carpeta** (Open Folder).
3. Busca la ruta donde está guardado el programa:
   `Escritorio > Gabz Tareas > AY GABZ SQL SERVER`
4. Selecciona esa carpeta y haz clic en "Seleccionar carpeta".

---

## 🖥️ Paso 2: Encender el Servidor (Backend)

Necesitamos abrir una "Terminal" (una ventana de comandos) para decirle a la computadora que encienda el servidor.

1. En Visual Studio Code, ve al menú superior y haz clic en **Terminal** > **Nueva Terminal**.
2. Verás que se abre un panel en la parte inferior de la pantalla.
3. En esa terminal, escribe el siguiente comando exactamente como está aquí y presiona la tecla **Enter**:
   ```bash
   npm run server
   ```
4. Verás unos mensajes aparecer. Si todo sale bien, dirá algo como *"Server is running"* o *"Conectado a la base de datos"*. ¡Déjalo ahí! **No cierres esta terminal.**

---

## 🌐 Paso 3: Encender la Interfaz (Frontend)

Ahora necesitamos encender la parte visual. Para esto, abriremos *otra* terminal para no interrumpir el servidor que ya está encendido.

1. En Visual Studio Code, busca un icono de un símbolo de **más (+)** en la parte superior derecha del panel de la terminal (abajo). Al pasar el ratón dirá "Nueva Terminal". Haz clic en él.
   *(También puedes ir al menú superior: **Terminal** > **Nueva Terminal** nuevamente).*
2. Ahora tendrás una segunda ventana de terminal en blanco.
3. Escribe el siguiente comando y presiona **Enter**:
   ```bash
   npm run dev
   ```
4. Después de unos segundos, aparecerá un mensaje en la terminal que dice algo así como:
   `➜  Local:   http://localhost:5173/`

---

## 🎉 Paso 4: Abrir el programa en tu navegador

1. En esa segunda terminal, donde dice `http://localhost:5173/`, pon el cursor de tu ratón sobre ese enlace.
2. Mantén presionada la tecla **Ctrl** en tu teclado y haz **clic izquierdo** con el ratón sobre el enlace.
3. ¡Y listo! Tu navegador web de preferencia (Chrome, Edge, etc.) se abrirá automáticamente mostrando tu programa.

---

### 🛑 ¿Cómo apagar el programa cuando termines?

Cuando ya no quieras usar el programa, es una buena práctica apagarlo correctamente:
1. Ve a la terminal de Visual Studio Code.
2. Haz clic dentro de la terminal.
3. Presiona las teclas **Ctrl** + **C** al mismo tiempo. Te preguntará si deseas terminar el proceso de por lotes (S/N). Escribe la letra **S** y presiona **Enter**.
4. Haz lo mismo en las dos terminales que abriste. 
5. Ya puedes cerrar Visual Studio Code con seguridad.