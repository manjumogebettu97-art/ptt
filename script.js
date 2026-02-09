const menuToggle = document.querySelector('.menu-toggle');
const navRight = document.querySelector('.nav-right');

function closeMenu() {
    if (!menuToggle || !navRight) {
        return;
    }
    navRight.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
}

if (menuToggle && navRight) {
    menuToggle.addEventListener('click', () => {
        const isOpen = navRight.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
        const clickedInsideMenu = navRight.contains(event.target) || menuToggle.contains(event.target);
        if (!clickedInsideMenu) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    navRight.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll('.reveal');

revealElements.forEach((element, index) => {
    const delay = Math.min(index * 40, 280);
    element.style.setProperty('--reveal-delay', `${delay}ms`);
});

function revealNow(element) {
    element.classList.add('is-visible');
}

if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                revealNow(entry.target);
                currentObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.16 });

    revealElements.forEach((element) => revealObserver.observe(element));
} else {
    revealElements.forEach(revealNow);
}

const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
const sectionElements = navLinks
    .map((link) => link.getAttribute('href'))
    .filter((href) => href && href.length > 1)
    .map((id) => document.querySelector(id))
    .filter(Boolean);

if (sectionElements.length > 0 && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            navLinks.forEach((link) => {
                const isActive = link.getAttribute('href') === `#${entry.target.id}`;
                link.classList.toggle('active', isActive);
            });
        });
    }, {
        rootMargin: '-26% 0px -55% 0px',
        threshold: 0
    });

    sectionElements.forEach((section) => sectionObserver.observe(section));
}

if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo('.hero-gallery',
        { y: 24, rotate: -1 },
        {
            y: -24,
            rotate: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        }
    );

    gsap.fromTo('.hero-copy',
        { y: 16, opacity: 0.94 },
        {
            y: -12,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        }
    );

    gsap.from('.navbar', {
        y: -20,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out'
    });
}

const tiltCards = document.querySelectorAll('[data-tilt]');

if (tiltCards.length > 0 && !prefersReducedMotion) {
    tiltCards.forEach((card) => {
        let rafId = null;

        const updateTilt = (event) => {
            const rect = card.getBoundingClientRect();
            const positionX = (event.clientX - rect.left) / rect.width;
            const positionY = (event.clientY - rect.top) / rect.height;
            const tiltX = (0.5 - positionY) * 10;
            const tiltY = (positionX - 0.5) * 12;

            card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
            card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        };

        const handleMove = (event) => {
            if (rafId) {
                return;
            }
            rafId = window.requestAnimationFrame(() => {
                updateTilt(event);
                rafId = null;
            });
        };

        const resetTilt = () => {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        };

        card.addEventListener('pointermove', handleMove);
        card.addEventListener('pointerleave', resetTilt);
        card.addEventListener('pointercancel', resetTilt);
    });
}

const carousel = document.querySelector('[data-carousel]');
const carouselTrack = document.querySelector('[data-carousel-track]');

if (carousel && carouselTrack) {
    const carouselCards = Array.from(carouselTrack.querySelectorAll('[data-carousel-card]'));

    if (carouselCards.length > 0) {
        const cardCount = carouselCards.length;
        const half = Math.floor(cardCount / 2);
        let activeIndex = 0;
        let positions = new Array(cardCount).fill(0);
        let isDragging = false;
        let isPaused = false;
        let lastX = 0;
        let dragDelta = 0;
        let autoTimer = null;
        let autoResumeTimeout = null;
        const dragStep = 42;
        const autoInterval = 2400;
        const autoResumeDelay = 1400;

        const computePosition = (index, active) => {
            let pos = index - active;
            if (pos > half) {
                pos -= cardCount;
            }
            if (pos < -half) {
                pos += cardCount;
            }
            return pos;
        };

        const applyPositions = (prevPositions = []) => {
            const jumpIndices = new Set();
            carouselCards.forEach((card, index) => {
                const pos = positions[index];
                if (prevPositions[index] !== undefined && Math.abs(pos - prevPositions[index]) > 1) {
                    jumpIndices.add(index);
                }
                if (jumpIndices.has(index)) {
                    card.classList.add('is-jumping');
                } else {
                    card.classList.remove('is-jumping');
                }
                card.style.setProperty('--pos', pos);
                card.style.setProperty('--pos-abs', Math.abs(pos));
            });

            if (jumpIndices.size > 0) {
                requestAnimationFrame(() => {
                    jumpIndices.forEach((index) => carouselCards[index].classList.remove('is-jumping'));
                });
            }
        };

        const updatePositions = () => {
            const previous = positions.slice();
            positions = positions.map((_, index) => computePosition(index, activeIndex));
            applyPositions(previous);
        };

        const step = (direction = 1) => {
            activeIndex = (activeIndex + direction + cardCount) % cardCount;
            updatePositions();
        };

        const stopAuto = () => {
            if (autoTimer) {
                clearInterval(autoTimer);
                autoTimer = null;
            }
        };

        const startAuto = () => {
            if (prefersReducedMotion) {
                return;
            }
            stopAuto();
            autoTimer = setInterval(() => {
                if (!isPaused && !isDragging && !document.hidden) {
                    step(1);
                }
            }, autoInterval);
        };

        const pauseAuto = () => {
            isPaused = true;
            if (autoResumeTimeout) {
                clearTimeout(autoResumeTimeout);
                autoResumeTimeout = null;
            }
        };

        const resumeAuto = (delay = 0) => {
            if (autoResumeTimeout) {
                clearTimeout(autoResumeTimeout);
            }
            autoResumeTimeout = window.setTimeout(() => {
                isPaused = false;
            }, delay);
        };

        const handlePointerDown = (event) => {
            if (event.button !== 0 && event.pointerType !== 'touch') {
                return;
            }
            isDragging = true;
            dragDelta = 0;
            carousel.classList.add('is-dragging');
            pauseAuto();
            lastX = event.clientX;
            carousel.setPointerCapture?.(event.pointerId);
        };

        const handlePointerMove = (event) => {
            if (!isDragging) {
                return;
            }
            const deltaX = event.clientX - lastX;
            dragDelta += deltaX;
            lastX = event.clientX;

            if (Math.abs(dragDelta) >= dragStep) {
                const direction = dragDelta > 0 ? -1 : 1;
                step(direction);
                dragDelta = 0;
            }
        };

        const handlePointerUp = (event) => {
            if (!isDragging) {
                return;
            }
            isDragging = false;
            carousel.classList.remove('is-dragging');
            carousel.releasePointerCapture?.(event.pointerId);
            resumeAuto(autoResumeDelay);
        };

        updatePositions();
        startAuto();

        carousel.addEventListener('pointerdown', handlePointerDown);
        carousel.addEventListener('pointermove', handlePointerMove);
        carousel.addEventListener('pointerup', handlePointerUp);
        carousel.addEventListener('pointerleave', handlePointerUp);
        carousel.addEventListener('pointercancel', handlePointerUp);

        carousel.addEventListener('wheel', (event) => {
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (delta > 0) {
                step(1);
            } else if (delta < 0) {
                step(-1);
            }
            pauseAuto();
            resumeAuto(autoResumeDelay);
        }, { passive: true });

        carousel.addEventListener('mouseenter', pauseAuto);
        carousel.addEventListener('mouseleave', () => resumeAuto(800));
        carousel.addEventListener('focusin', pauseAuto);
        carousel.addEventListener('focusout', () => resumeAuto(autoResumeDelay));

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseAuto();
            } else {
                resumeAuto(0);
            }
        });
    }
}
