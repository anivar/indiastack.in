// Navigation init — replaces components.js (header/footer now pre-rendered in HTML)
(function() {
    var menuToggle = document.querySelector('.menu-toggle');
    var navLinks   = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            var isOpen = navLinks.dataset.open === 'true';
            navLinks.dataset.open = !isOpen;
            menuToggle.setAttribute('aria-expanded', !isOpen);
        });
    }

    document.querySelectorAll('.nav-dropdown-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                var dropdown = toggle.parentElement;
                var isOpen = dropdown.classList.toggle('open');
                toggle.setAttribute('aria-expanded', isOpen);
            }
        });
    });

    document.addEventListener('click', function(e) {
        if (navLinks && navLinks.dataset.open === 'true') {
            if (!e.target.closest('.nav-links') && !e.target.closest('.menu-toggle')) {
                navLinks.dataset.open = 'false';
                if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navLinks && navLinks.dataset.open === 'true') {
            navLinks.dataset.open = 'false';
            if (menuToggle) {
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.focus();
            }
        }
    });
})();
