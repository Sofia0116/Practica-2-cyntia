document.addEventListener('DOMContentLoaded', () => {
    const contenedorNotif = document.getElementById('contenedor-notificaciones');

    function notificar(mensaje, titulo = '✦ Aviso ✦', duracion = 4000) {
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

    // Botones informativos
    document.querySelectorAll('.caja-links .btn-retro[data-info]').forEach(btn => {
        btn.addEventListener('click', () => {
            notificar(btn.getAttribute('data-info'), '✦ Información ✦', 5000);
        });
    });

    // Música de fondo
    const musicaFondo = document.getElementById('musica-fondo');
    const btnIngresar = document.getElementById('btn-ingresar');
    const btnIrOceano = document.getElementById('btn-ir-oceano');

        function prepararMusica() {
        if (musicaFondo) {
            musicaFondo.volume = 0.5;
            // El .play() se ejecuta justo en el clic, por lo que el navegador SÍ lo permite
            musicaFondo.play().catch(error => {
                console.log("El navegador bloqueó la música hasta que haya un clic.", error);
            });
        }
    }

    // Forzar la música al hacer clic en CUALQUIER parte de la página (opcional pero recomendado)
    document.body.addEventListener('click', prepararMusica, { once: true });

    if (btnIngresar) {
        btnIngresar.addEventListener('click', prepararMusica);
    }
    if (btnIrOceano) {
        btnIrOceano.addEventListener('click', prepararMusica);
    }
});