// Load header and footer components
(function() {
    // Load header
    fetch('/components/header.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('site-header').innerHTML = html;
            initNav();
        });

    // Load footer
    fetch('/components/footer.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('site-footer').innerHTML = html;
            loadGoogleAnalytics();
        });

    // Google Analytics - deferred load
    function loadGoogleAnalytics() {
        var loaded = false;
        function loadGtag() {
            if (loaded) return;
            loaded = true;
            window.dataLayer = window.dataLayer || [];
            window.gtag = function(){dataLayer.push(arguments);};
            gtag('js', new Date());
            gtag('config', 'G-GP7RJG0PPJ');
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtag/js?id=G-GP7RJG0PPJ';
            document.head.appendChild(s);
        }
        ['scroll','click','mousemove','keydown','touchstart'].forEach(function(e){
            document.addEventListener(e, loadGtag, {passive:true, once:true});
        });
    }

    // Initialize navigation
    function initNav() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                const isOpen = navLinks.dataset.open === 'true';
                navLinks.dataset.open = !isOpen;
                menuToggle.setAttribute('aria-expanded', !isOpen);
            });
        }

        // Mobile dropdown toggle
        document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const dropdown = toggle.parentElement;
                    dropdown.classList.toggle('open');
                }
            });
        });
    }
})();
