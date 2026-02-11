(() => {
    const doc = document;
    const win = window;
    const prefersReducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initMobileNav() {
        const toggle = doc.querySelector(".menu-toggle");
        const nav = doc.querySelector(".nav-right");
        if (!toggle || !nav) return;

        function closeNav() {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        }

        toggle.addEventListener("click", () => {
            const isOpen = nav.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(isOpen));
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                if (win.innerWidth <= 900) closeNav();
            });
        });

        doc.addEventListener("click", (event) => {
            if (!nav.classList.contains("open")) return;
            if (nav.contains(event.target) || toggle.contains(event.target)) return;
            closeNav();
        });

        doc.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeNav();
        });

        win.addEventListener("resize", () => {
            if (win.innerWidth > 900) closeNav();
        });
    }

    function initReveals() {
        const revealNodes = [...doc.querySelectorAll(".reveal")];
        if (!revealNodes.length) return;

        revealNodes.forEach((node, index) => {
            node.style.setProperty("--reveal-delay", `${Math.min(index * 60, 320)}ms`);
        });

        if (prefersReducedMotion || !("IntersectionObserver" in win)) {
            revealNodes.forEach((node) => node.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
        );

        revealNodes.forEach((node) => observer.observe(node));
    }

    function initActiveNav() {
        const links = [...doc.querySelectorAll(".nav-links a[href^='#']")];
        const sections = links
            .map((link) => doc.querySelector(link.getAttribute("href")))
            .filter(Boolean);

        if (!links.length || !sections.length || !("IntersectionObserver" in win)) return;

        const byId = new Map(
            links.map((link) => [link.getAttribute("href")?.slice(1), link])
        );

        const sectionObserver = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (!visible.length) return;
                const activeId = visible[0].target.id;
                links.forEach((link) => link.classList.remove("active"));
                const activeLink = byId.get(activeId);
                if (activeLink) activeLink.classList.add("active");
            },
            { threshold: [0.2, 0.45, 0.7], rootMargin: "-15% 0px -60% 0px" }
        );

        sections.forEach((section) => sectionObserver.observe(section));
    }

    function initTiltCards() {
        const tiltCards = [...doc.querySelectorAll("[data-tilt]")];
        if (!tiltCards.length || prefersReducedMotion) return;

        tiltCards.forEach((card) => {
            let rafId = null;

            function setTilt(clientX, clientY) {
                const rect = card.getBoundingClientRect();
                const x = (clientX - rect.left) / rect.width;
                const y = (clientY - rect.top) / rect.height;
                const tiltY = (x - 0.5) * 10;
                const tiltX = (0.5 - y) * 8;
                card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
                card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
            }

            function onMove(event) {
                if (rafId) win.cancelAnimationFrame(rafId);
                rafId = win.requestAnimationFrame(() => setTilt(event.clientX, event.clientY));
            }

            function resetTilt() {
                card.style.setProperty("--tilt-x", "0deg");
                card.style.setProperty("--tilt-y", "0deg");
            }

            card.addEventListener("pointermove", onMove);
            card.addEventListener("pointerleave", resetTilt);
            card.addEventListener("blur", resetTilt, true);
        });
    }

    function initHeroShowcase() {
        const hero = doc.querySelector("#hero");
        const stage = hero?.querySelector("[data-hero-stage]");
        if (!hero || !stage) return;

        function setProgress(value) {
            stage.style.setProperty("--hero-progress", String(value));
        }

        if (prefersReducedMotion) {
            setProgress(0);
            return;
        }

        if (win.gsap && win.ScrollTrigger) {
            win.gsap.registerPlugin(win.ScrollTrigger);
            win.gsap.fromTo(
                stage,
                { "--hero-progress": 0 },
                {
                    "--hero-progress": 1,
                    ease: "none",
                    scrollTrigger: {
                        trigger: hero,
                        start: "top top",
                        end: "bottom top",
                        scrub: 0.8
                    }
                }
            );
            return;
        }

        let rafId = null;
        function update() {
            rafId = null;
            const rect = hero.getBoundingClientRect();
            const travel = Math.max(1, hero.offsetHeight + win.innerHeight * 0.25);
            const raw = (win.innerHeight - rect.top) / travel;
            const progress = Math.max(0, Math.min(1, raw));
            setProgress(progress.toFixed(4));
        }

        function requestUpdate() {
            if (rafId !== null) return;
            rafId = win.requestAnimationFrame(update);
        }

        requestUpdate();
        win.addEventListener("scroll", requestUpdate, { passive: true });
        win.addEventListener("resize", requestUpdate);
    }

    function initStackCarousel() {
        const gallery = doc.querySelector("[data-carousel]");
        const track = gallery?.querySelector("[data-carousel-track]");
        const cards = track ? [...track.querySelectorAll("[data-carousel-card]")] : [];
        if (!gallery || !track || cards.length < 2) return;

        let index = 0;
        let autoplayId = null;
        let animationId = null;
        let isAnimating = false;
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        let deltaX = 0;

        const swipeThreshold = 50;
        const autoplayDelay = 4200;
        const animationDuration = prefersReducedMotion ? 0 : 720;
        const maxVisibleSlots = 3;

        function wrap(value) {
            const len = cards.length;
            return ((value % len) + len) % len;
        }

        function circularDelta(cardIndex, activeIndex) {
            const len = cards.length;
            let delta = cardIndex - activeIndex;
            if (delta > len / 2) delta -= len;
            if (delta < -len / 2) delta += len;
            return delta;
        }

        function updatePositions() {
            cards.forEach((card, cardIndex) => {
                const delta = circularDelta(cardIndex, index);
                const abs = Math.abs(delta);
                const boundedAbs = Math.min(abs, maxVisibleSlots + 1);
                const hidden = abs > maxVisibleSlots;

                card.style.setProperty("--slot", String(delta));
                card.style.setProperty("--slot-abs", String(boundedAbs));
                card.style.setProperty("--z", String(100 - boundedAbs));
                card.style.setProperty("--card-opacity", hidden ? "0" : String(1 - boundedAbs * 0.16));

                card.classList.toggle("is-active", delta === 0);
                card.setAttribute("aria-hidden", String(delta !== 0));
                card.tabIndex = delta === 0 ? 0 : -1;
                card.style.pointerEvents = abs <= 1 ? "auto" : "none";
            });
        }

        function endAnimationAfterDelay() {
            if (animationId) {
                win.clearTimeout(animationId);
                animationId = null;
            }
            if (animationDuration === 0) {
                isAnimating = false;
                return;
            }
            animationId = win.setTimeout(() => {
                isAnimating = false;
            }, animationDuration);
        }

        function goTo(nextIndex, options = {}) {
            const { restart = true } = options;
            const target = wrap(nextIndex);
            if (target === index || isAnimating) return;

            index = target;
            isAnimating = true;
            updatePositions();
            endAnimationAfterDelay();
            if (restart) restartAutoplay();
        }

        function next(options) {
            goTo(index + 1, options);
        }

        function previous(options) {
            goTo(index - 1, options);
        }

        function stopAutoplay() {
            if (!autoplayId) return;
            win.clearInterval(autoplayId);
            autoplayId = null;
        }

        function startAutoplay() {
            if (prefersReducedMotion) return;
            stopAutoplay();
            autoplayId = win.setInterval(() => {
                if (!isAnimating && pointerId === null) next({ restart: false });
            }, autoplayDelay);
        }

        function restartAutoplay() {
            stopAutoplay();
            startAutoplay();
        }

        function onPointerDown(event) {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            deltaX = 0;
            gallery.classList.add("is-dragging");
            stopAutoplay();
            if (gallery.setPointerCapture) gallery.setPointerCapture(pointerId);
        }

        function onPointerMove(event) {
            if (event.pointerId !== pointerId) return;
            deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            if (Math.abs(deltaY) > Math.abs(deltaX)) return;
            const eased = Math.max(-38, Math.min(38, deltaX * 0.18));
            gallery.style.setProperty("--drag-offset", `${eased}px`);
        }

        function onPointerEnd(event) {
            if (event.pointerId !== pointerId) return;
            gallery.classList.remove("is-dragging");
            gallery.style.setProperty("--drag-offset", "0px");

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) next({ restart: false });
                if (dx > 0) previous({ restart: false });
            }

            if (gallery.releasePointerCapture && pointerId !== null) {
                try {
                    gallery.releasePointerCapture(pointerId);
                } catch (_) {
                    // Ignore invalid pointer capture releases.
                }
            }
            pointerId = null;
            startAutoplay();
        }

        cards.forEach((card, cardIndex) => {
            card.addEventListener("click", () => {
                const delta = circularDelta(cardIndex, index);
                if (delta === 0) return;
                goTo(index + (delta > 0 ? 1 : -1));
            });
        });

        gallery.addEventListener("pointerdown", onPointerDown);
        gallery.addEventListener("pointermove", onPointerMove);
        gallery.addEventListener("pointerup", onPointerEnd);
        gallery.addEventListener("pointercancel", onPointerEnd);
        gallery.addEventListener("mouseenter", stopAutoplay);
        gallery.addEventListener("mouseleave", startAutoplay);
        gallery.addEventListener("focusin", stopAutoplay);
        gallery.addEventListener("focusout", (event) => {
            if (gallery.contains(event.relatedTarget)) return;
            startAutoplay();
        });
        gallery.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight") {
                event.preventDefault();
                next();
                restartAutoplay();
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                previous();
                restartAutoplay();
            }
        });

        doc.addEventListener("visibilitychange", () => {
            if (doc.hidden) stopAutoplay();
            else startAutoplay();
        });

        win.addEventListener("resize", () => {
            gallery.style.setProperty("--drag-offset", "0px");
            updatePositions();
        });

        updatePositions();
        startAutoplay();
    }

    function init() {
        initMobileNav();
        initReveals();
        initActiveNav();
        initHeroShowcase();
        initTiltCards();
        initStackCarousel();
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
