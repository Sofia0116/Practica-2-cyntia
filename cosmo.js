document.addEventListener('DOMContentLoaded', () => {
    let fotosGuardadas = JSON.parse(localStorage.getItem('fotosOceano')) || [];
    let comentariosGlobales = JSON.parse(localStorage.getItem('comentariosOceano')) || {};
    let urlFotoActual = '';
    
    const TIEMPO_EXPIRACION = 6 * 60 * 60 * 1000;
    const TAMANO_MUNDO = 5000;
    let iconoBase64 = null;
    let imagenBase64 = null;

    // ==========================================
    // SISTEMA DE NOTIFICACIONES Y CONFIRMACIÓN
    // ==========================================
    const contenedorNotif = document.getElementById('contenedor-notificaciones');
    
    function notificar(mensaje, titulo = '✦ Aviso ✦', duracion = 4000) {
        if (!contenedorNotif) return;
        const notif = document.createElement('div');
        notif.className = 'notificacion';
        notif.innerHTML = `
            <button class="notificacion-cerrar" aria-label="Cerrar">&times;</button>
            <div class="notificacion-titulo">${titulo}</div>
            <div class="notificacion-texto">${mensaje}</div>
        `;
        contenedorNotif.appendChild(notif);
        const cerrar = () => { notif.classList.add('cerrando'); setTimeout(() => notif.remove(), 300); };
        notif.querySelector('.notificacion-cerrar').addEventListener('click', cerrar);
        if (duracion > 0) setTimeout(cerrar, duracion);
    }

    function confirmarAccion(mensaje, alAceptar) {
        if (!contenedorNotif) return;
        const notif = document.createElement('div');
        notif.className = 'notificacion';
        notif.style.maxWidth = '380px'; 
        notif.innerHTML = `
            <div class="notificacion-titulo">✦ Confirmación ✦</div>
            <div class="notificacion-texto" style="margin-bottom: 12px;">${mensaje}</div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-retro btn-pequeno btn-cancelar">Cancelar</button>
                <button class="btn-retro btn-pequeno btn-aceptar" style="background: #FFA3BE; color: white; border-color: #A57352;">Aceptar</button>
            </div>
        `;
        contenedorNotif.appendChild(notif);

        const cerrar = () => { notif.classList.add('cerrando'); setTimeout(() => notif.remove(), 300); };
        notif.querySelector('.btn-cancelar').addEventListener('click', cerrar);
        notif.querySelector('.btn-aceptar').addEventListener('click', () => {
            cerrar();
            alAceptar();
        });
    }

    // ==========================================
    // FUNCIÓN PARA COMPRIMIR IMÁGENES (Evita que el navegador colapse)
    // ==========================================
    function comprimirImagen(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Calidad de 0.8 para que pese menos pero se vea bien
                callback(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    }

    // ==========================================
    // TEMPORALIDAD
    // ==========================================
    function limpiarExpirados() {
        const ahora = Date.now();
        const antes = fotosGuardadas.length;
        fotosGuardadas = fotosGuardadas.filter(foto => {
            const expirado = foto.fechaExpiracion < ahora;
            if (expirado) delete comentariosGlobales[foto.id];
            return !expirado;
        });
        if (fotosGuardadas.length !== antes) {
            localStorage.setItem('fotosOceano', JSON.stringify(fotosGuardadas));
            localStorage.setItem('comentariosOceano', JSON.stringify(comentariosGlobales));
        }
    }

    // ==========================================
    // CANVAS NAVEGABLE Y CONTROL DE CLICS
    // ==========================================
    const board = document.getElementById('oceanoBoard');
    const world = document.getElementById('oceanoWorld');
    let isDragging = false, startX = 0, startY = 0, currentX = 0, currentY = 0, scale = 0.5;
    let mouseMoved = false; // Variable para saber si el usuario movió el mouse

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    function updateWorldTransform(withTransition = false) {
        if (!board || !world) return;
        const boardW = board.clientWidth || 800;
        const boardH = board.clientHeight || 600;
        const scaledW = TAMANO_MUNDO * scale;
        const scaledH = TAMANO_MUNDO * scale;
        const maxX = Math.max(0, (scaledW - boardW) / 2);
        const maxY = Math.max(0, (scaledH - boardH) / 2);

        currentX = clamp(currentX, -maxX, maxX);
        currentY = clamp(currentY, -maxY, maxY);

        world.style.transition = withTransition ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        world.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(${scale})`;
    }

    if (board) {
        board.addEventListener('mousedown', (e) => {
            if (e.target.closest('.oceano-controls') || e.target.closest('.btn-subir-flotante')) return;
            isDragging = true;
            mouseMoved = false;
            startX = e.clientX - currentX;
            startY = e.clientY - currentY;
            world.style.transition = 'none';
        });

        board.addEventListener('touchstart', (e) => {
            if (e.target.closest('.oceano-controls') || e.target.closest('.btn-subir-flotante')) return;
            isDragging = true;
            mouseMoved = false;
            startX = e.touches[0].clientX - currentX;
            startY = e.touches[0].clientY - currentY;
            world.style.transition = 'none';
        }, { passive: true });

        board.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0 && scale < 2) scale += 0.08;
            else if (e.deltaY > 0 && scale > 0.2) scale -= 0.08;
            updateWorldTransform(false);
        }, { passive: false });
    }

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        if (Math.abs(currentX) > 5 || Math.abs(currentY) > 5) mouseMoved = true;
        updateWorldTransform(false);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX - startX;
        currentY = e.touches[0].clientY - startY;
        mouseMoved = true;
        updateWorldTransform(false);
    }, { passive: true });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('touchend', () => { isDragging = false; });

    // ==========================================
    // CONTROLES
    // ==========================================
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { if (scale < 2) { scale += 0.2; updateWorldTransform(true); } });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { if (scale > 0.2) { scale -= 0.2; updateWorldTransform(true); } });
    if (resetBtn) resetBtn.addEventListener('click', () => { currentX = 0; currentY = 0; scale = 0.5; updateWorldTransform(true); });
    
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const iconos = world.querySelectorAll('.icono-flotante');
            if (iconos.length === 0) return notificar('Todavía no hay recuerdos en el océano.', '✦ Vacío ✦');
            const target = iconos[Math.floor(Math.random() * iconos.length)];
            const top = parseFloat(target.style.top);
            const left = parseFloat(target.style.left);
            currentX = -(left - TAMANO_MUNDO / 2) * 0.9;
            currentY = -(top - TAMANO_MUNDO / 2) * 0.9;
            scale = 0.9;
            updateWorldTransform(true);
            target.classList.add('destacado');
            setTimeout(() => target.classList.remove('destacado'), 2000);
        });
    }

    // ==========================================
    // RENDERIZAR GALERÍA
    // ==========================================
    let intervaloActualizacion = null;
    function iniciarOceano() {
        limpiarExpirados();
        cargarGaleria();
        updateWorldTransform(false);
        if (intervaloActualizacion) clearInterval(intervaloActualizacion);
        intervaloActualizacion = setInterval(() => { limpiarExpirados(); cargarGaleria(); }, 60000);
    }

    function cargarGaleria() {
        if (!world) return;
        world.innerHTML = '';
        fotosGuardadas.forEach((foto) => {
            if (foto.posX == null || foto.posY == null) {
                foto.posX = (TAMANO_MUNDO / 2) + (Math.random() * 1500 - 750);
                foto.posY = (TAMANO_MUNDO / 2) + (Math.random() * 1500 - 750);
            }
            const div = document.createElement('div');
            div.className = 'icono-flotante';
            div.style.left = `${foto.posX}px`;
            div.style.top = `${foto.posY}px`;
            div.style.animationDelay = `${Math.random() * 5}s`;
            const img = document.createElement('img');
            img.src = foto.iconoUrl;
            img.alt = 'Recuerdo Oculto';
            
            // Abrir modal SOLO si no se movió el mouse (no fue un arrastre)
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!mouseMoved) abrirModal(foto);
            });
            
            div.appendChild(img);
            world.appendChild(div);
        });
        localStorage.setItem('fotosOceano', JSON.stringify(fotosGuardadas));
    }

    // ==========================================
    // FLUJO DE SUBIDA CON COMPRESIÓN
    // ==========================================
    const modalSubida = document.getElementById('modal-subida');
    const paso1 = document.getElementById('paso-1');
    const paso2 = document.getElementById('paso-2');
    const pasoFinal = document.getElementById('paso-final');
    const btnElegirIcono = document.getElementById('btn-elegir-icono');
    const btnElegirImagen = document.getElementById('btn-elegir-imagen');
    const btnLanzar = document.getElementById('btn-lanzar');
    const inputIcono = document.getElementById('input-icono');
    const inputImagen = document.getElementById('input-imagen');
    const previewIcono = document.getElementById('preview-icono');
    const previewImagen = document.getElementById('preview-imagen');

    const btnSubir = document.getElementById('btn-subir-recuerdo');
    if (btnSubir) {
        btnSubir.addEventListener('click', () => {
            modalSubida.classList.remove('oculto');
            paso1.classList.remove('oculto');
            paso2.classList.add('oculto');
            pasoFinal.classList.add('oculto');
            previewIcono.innerHTML = ''; 
            previewImagen.innerHTML = '';
            iconoBase64 = null; 
            imagenBase64 = null;
        });
    }

    const btnCancelar = document.getElementById('btn-cancelar-subida');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => modalSubida.classList.add('oculto'));
    }

        if (btnElegirIcono) {
        btnElegirIcono.addEventListener('click', () => inputIcono.click());
        inputIcono.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;
            if (archivo.type !== 'image/png') {
                return notificar('Por favor, selecciona un archivo .PNG', '✦ Formato inválido ✦');
            }
            
            // Leemos el PNG directamente para conservar su transparencia
            const reader = new FileReader();
            reader.onload = (event) => {
                iconoBase64 = event.target.result;
                previewIcono.innerHTML = `<img src="${iconoBase64}" alt="Icono">`;
                paso1.classList.add('oculto');
                paso2.classList.remove('oculto');
            };
            reader.readAsDataURL(archivo);
            
            inputIcono.value = '';
        });
    }

    if (btnElegirImagen) {
        btnElegirImagen.addEventListener('click', () => inputImagen.click());
        inputImagen.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;
            
            // Comprimimos la foto principal (maximo 800x800)
            comprimirImagen(archivo, 800, 800, (base64) => {
                imagenBase64 = base64;
                previewImagen.innerHTML = `<img src="${imagenBase64}" alt="Imagen">`;
                paso2.classList.add('oculto');
                pasoFinal.classList.remove('oculto');
            });
            inputImagen.value = '';
        });
    }

    if (btnLanzar) {
        btnLanzar.addEventListener('click', () => {
            if (!iconoBase64 || !imagenBase64) {
                return notificar('Faltan datos. Vuelve a elegir las imágenes.', '✦ Error ✦');
            }
            
            const id = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            
            fotosGuardadas.push({
                id: id, 
                url: imagenBase64, 
                iconoUrl: iconoBase64, 
                fechaExpiracion: Date.now() + TIEMPO_EXPIRACION,
                posX: (TAMANO_MUNDO / 2) + (Math.random() * 1500 - 750), 
                posY: (TAMANO_MUNDO / 2) + (Math.random() * 1500 - 750)
            });
            
            localStorage.setItem('fotosOceano', JSON.stringify(fotosGuardadas));
            modalSubida.classList.add('oculto');
            cargarGaleria();
            
            currentX = 0;
            currentY = 0;
            scale = 0.5;
            updateWorldTransform(true);
            
            notificar('¡Recuerdo lanzado al océano! Se desvanecerá en 6 horas.', '✦ Lanzado ✦', 5000);
        });
    }

    // ==========================================
    // MODAL DE FOTO Y LIBRETA
    // ==========================================
    const modalFoto = document.getElementById('modal-foto');
    const imgGrande = document.getElementById('img-grande');
    const tarjetaFoto = document.getElementById('tarjeta-foto');
    const modalContenido = document.getElementById('modal-contenido-tarjeta');
    const listaComentarios = document.getElementById('lista-comentarios');
    const nuevoComentario = document.getElementById('nuevo-comentario');

    function abrirModal(foto) {
        urlFotoActual = foto.id;
        imgGrande.src = foto.url;

        tarjetaFoto.style.width = '380px';
        tarjetaFoto.style.height = '380px';
        modalContenido.style.width = '380px';
        modalContenido.style.height = '380px';

        imgGrande.onload = () => {
            const ancho = imgGrande.naturalWidth;
            const alto = imgGrande.naturalHeight;
            const maxAncho = window.innerWidth * 0.8;
            const maxAlto = window.innerHeight * 0.8;
            let esc = 1;
            
            if (ancho > maxAncho || alto > maxAlto) {
                esc = Math.min(maxAncho / ancho, maxAlto / alto);
            }
            
            const anchoFinal = Math.max(ancho * esc, 380);
            const altoFinal = Math.max(alto * esc, 380);
            
            modalContenido.style.width = `${anchoFinal}px`;
            modalContenido.style.height = `${altoFinal}px`;
            tarjetaFoto.style.width = `${anchoFinal}px`;
            tarjetaFoto.style.height = `${altoFinal}px`;
        };

        modalFoto.classList.remove('oculto');
        tarjetaFoto.classList.remove('volteada');
        cargarComentarios(foto.id);
    }

    const cerrarModal = document.getElementById('cerrar-modal');
    if (cerrarModal) {
        cerrarModal.addEventListener('click', () => modalFoto.classList.add('oculto'));
    }

    if (tarjetaFoto) {
        tarjetaFoto.addEventListener('dblclick', (e) => {
            if (e.target.closest('textarea') || e.target.closest('button')) return;
            tarjetaFoto.classList.toggle('volteada');
        });
    }

    // ==========================================
    // SISTEMA DE COMENTARIOS
    // ==========================================
    function guardarComentarios() { 
        localStorage.setItem('comentariosOceano', JSON.stringify(comentariosGlobales)); 
    }

    function cargarComentarios(fotoId) {
        if (!listaComentarios) return;
        listaComentarios.innerHTML = '';
        const comentarios = comentariosGlobales[fotoId] || [];
        
        if (comentarios.length === 0) {
            const vacio = document.createElement('div');
            vacio.style.cssText = 'font-style: italic; opacity: 0.5; font-size: 0.85rem; padding: 5px 0;';
            vacio.textContent = 'Aún no hay notas...';
            listaComentarios.appendChild(vacio);
            return;
        }
        
        comentarios.forEach((texto, index) => {
            const item = document.createElement('div');
            item.className = 'comentario-item';
            
            const span = document.createElement('span');
            span.className = 'comentario-texto';
            span.textContent = texto;
            
            const acciones = document.createElement('div');
            acciones.className = 'comentario-acciones';

            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-accion-comentario';
            btnEditar.innerHTML = '✎';
            btnEditar.title = 'Editar nota';
            btnEditar.addEventListener('click', () => editarComentario(item, texto, index, fotoId));

            const btnEliminar = document.createElement('button');
            btnEliminar.className = 'btn-accion-comentario';
            btnEliminar.innerHTML = '🗑';
            btnEliminar.title = 'Eliminar nota';
            btnEliminar.addEventListener('click', () => eliminarComentario(index, fotoId));

            acciones.appendChild(btnEditar);
            acciones.appendChild(btnEliminar);
            item.appendChild(span);
            item.appendChild(acciones);
            listaComentarios.appendChild(item);
        });
    }

    function editarComentario(item, textoViejo, index, fotoId) {
        item.innerHTML = '';
        const contenedor = document.createElement('div');
        contenedor.className = 'comentario-editando';
        
        const textarea = document.createElement('textarea');
        textarea.value = textoViejo;
        
        const botones = document.createElement('div');
        botones.className = 'comentario-editando-botones';

        const btnGuardar = document.createElement('button');
        btnGuardar.textContent = 'Guardar';
        btnGuardar.addEventListener('click', () => {
            const nuevo = textarea.value.trim();
            if (!nuevo) return notificar('La nota no puede estar vacía.', '✦ Nota vacía ✦');
            comentariosGlobales[fotoId][index] = nuevo;
            guardarComentarios();
            cargarComentarios(fotoId);
            notificar('Nota actualizada.', '✦ Editada ✦', 2500);
        });

        const btnCancelarEdit = document.createElement('button');
        btnCancelarEdit.textContent = 'Cancelar';
        btnCancelarEdit.addEventListener('click', () => cargarComentarios(fotoId));

        botones.appendChild(btnGuardar);
        botones.appendChild(btnCancelarEdit);
        contenedor.appendChild(textarea);
        contenedor.appendChild(botones);
        item.appendChild(contenedor);
        
        textarea.focus();
        textarea.select();
    }

    function eliminarComentario(index, fotoId) {
        const comentarios = comentariosGlobales[fotoId];
        if (!comentarios) return;
        
        confirmarAccion('¿Seguro que quieres eliminar esta nota?', () => {
            comentarios.splice(index, 1);
            if (comentarios.length === 0) delete comentariosGlobales[fotoId];
            guardarComentarios();
            cargarComentarios(fotoId);
            notificar('Nota eliminada.', '✦ Eliminada ✦', 2500);
        });
    }

    const btnGuardarComentario = document.getElementById('btn-guardar-comentario');
    if (btnGuardarComentario) {
        btnGuardarComentario.addEventListener('click', () => {
            const texto = nuevoComentario.value.trim();
            if (!texto) return;
            
            if (!comentariosGlobales[urlFotoActual]) {
                comentariosGlobales[urlFotoActual] = [];
            }
            comentariosGlobales[urlFotoActual].push(texto);
            guardarComentarios();
            
            nuevoComentario.value = '';
            cargarComentarios(urlFotoActual);
            notificar('Nota añadida.', '✦ Guardada ✦', 2000);
        });
    }

    if (nuevoComentario) {
        nuevoComentario.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (btnGuardarComentario) btnGuardarComentario.click();
            }
        });
    }

    // ==========================================
    // INICIO FINAL
    // ==========================================
    iniciarOceano();

});