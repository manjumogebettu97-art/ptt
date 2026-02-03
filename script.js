document.addEventListener("DOMContentLoaded", function () {

// --- 1. PRELOADER EXIT ---
// Waits 2.2 seconds then fades out the black loading screen
setTimeout(() => {
const preloader = document.querySelector('.preloader');
preloader.style.opacity = '0';
preloader.style.pointerEvents = 'none';
document.body.style.overflowY = 'auto'; // Re-enable scrolling
}, 2200);


// --- 2. CUSTOM CURSOR LOGIC ---
const cursorDot = document.querySelector("[data-cursor-dot]");
const cursorOutline = document.querySelector("[data-cursor-outline]");

// Only enable custom cursor on non-touch devices
if (window.matchMedia("(pointer: fine)").matches) {
window.addEventListener("mousemove", function (e) {
const posX = e.clientX;
const posY = e.clientY;

// Animate dot immediately (follows mouse perfectly)
cursorDot.style.left = `${posX}px`;
cursorDot.style.top = `${posY}px`;

// Animate outline with slight delay/lag for fluid "physics" feel
cursorOutline.animate({
left: `${posX}px`,
top: `${posY}px`
}, { duration: 500, fill: "forwards" });
});

// Hover Effect: Expand cursor when hovering over interactive elements
const triggers = document.querySelectorAll('.hover-trigger');
triggers.forEach(trigger => {
trigger.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
trigger.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});
}


// --- 3. SCROLL REVEAL ENGINE (Intersection Observer) ---
// Triggers the slide-up animation when elements enter the screen
const revealElements = document.querySelectorAll('.reveal-up');

const revealCallback = (entries, observer) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
entry.target.classList.add('active');
observer.unobserve(entry.target); // Run animation only once
}
});
};

const revealOptions = {
threshold: 0.15, // Trigger when 15% of the element is visible
rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
revealElements.forEach(el => revealObserver.observe(el));


// --- 4. PARALLAX EFFECT FOR HERO SECTION ---
// Moves the video background slower than the text to create 3D depth
window.addEventListener('scroll', () => {
const scrollY = window.scrollY;
const heroVideo = document.querySelector('.video-bg');
const heroContent = document.querySelector('.hero-content');

// Only run calculation if we are near the top of the page
if (scrollY < window.innerHeight) {
heroVideo.style.transform = `scale(1.1) translateY(${scrollY * 0.5}px)`;
heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
heroContent.style.opacity = 1 - (scrollY / 700);
}
});

});