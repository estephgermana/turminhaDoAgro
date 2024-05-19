
document.addEventListener('DOMContentLoaded', function () {
    let nomeUsuario = localStorage.getItem('nomeUsuario');
    if (nomeUsuario) {
        document.getElementById('welcomeMessage').textContent = 'Bom te ver por aqui, ' + nomeUsuario;
        document.getElementById('nomeUsuario').textContent = 'Olá, ' + nomeUsuario;
        document.getElementById('loginButton').classList.add('d-none');
        document.getElementById('btnLogout').classList.remove('d-none');
    } else {
        document.getElementById('loginButton').classList.remove('d-none');
        document.getElementById('btnLogout').classList.add('d-none');
    }

    // Logout
    document.getElementById('btnLogout').addEventListener('click', function () {
        localStorage.removeItem('nomeUsuario');
        window.location.href = 'index.html';
    });

    // Comprar button click
    document.getElementById('btnFinalizarCompra').addEventListener('click', function () {
        if (nomeUsuario) {
            // Usuário está logado, redirecionar para carrinho.html
            window.location.href = 'carrinho.html';
        } else {
            // Usuário não está logado, redirecionar para avisoLogin.html
            window.location.href = 'avisoLogin.html';
        }
    });
});
