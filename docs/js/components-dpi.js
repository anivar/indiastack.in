// Load DPI-specific header and standard footer
(function() {
    // Load DPI header
    fetch('/components/header-dpi.html')
        .then(r => {
            if (!r.ok) throw new Error('DPI Header load failed');
            return r.text();
        })
        .then(html => {
            const header = document.getElementById('site-header');
            if (header) {
                header.innerHTML = html;
                initNav();
            }
        })
        .catch(err => {
            console.warn('DPI Header failed, falling back to standard:', err);
            // Fallback to standard header
            fetch('/components/header.html')
                .then(r => r.text())
                .then(html => {
                    const header = document.getElementById('site-header');
                    if (header) {
                        header.innerHTML = html;
                        initNav();
                    }
                });
        });

    // Load footer (same as main site)
    fetch('/components/footer.html')
        .then(r => {
            if (!r.ok) throw new Error('Footer load failed');
            return r.text();
        })
        .then(html => {
            const footer = document.getElementById('site-footer');
            if (footer) {
                footer.innerHTML = html;
                loadGoogleAnalytics();
            }
        })
        .catch(err => {
            console.warn('Footer component failed to load:', err);
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

        // Dropdown toggle (mobile: click, desktop: CSS hover)
        document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const dropdown = toggle.parentElement;
                    const isOpen = dropdown.classList.toggle('open');
                    toggle.setAttribute('aria-expanded', isOpen);
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks && navLinks.dataset.open === 'true') {
                if (!e.target.closest('.nav-links') && !e.target.closest('.menu-toggle')) {
                    navLinks.dataset.open = 'false';
                    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks && navLinks.dataset.open === 'true') {
                navLinks.dataset.open = 'false';
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                    menuToggle.focus();
                }
            }
        });
    }
})();
