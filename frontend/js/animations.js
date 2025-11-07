/**
 * MODERN ANIMATIONS & SCROLL EFFECTS
 * Enhanced user interactions and visual feedback
 */

// Animation Controller
class AnimationController {
    constructor() {
        this.init();
        this.setupScrollAnimations();
        this.setupInteractionAnimations();
        this.setupLoadingAnimation();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }

    start() {
        console.log('🎬 Animation Controller Started');
        
        // Hide loading spinner after a short delay
        setTimeout(() => {
            const spinner = document.getElementById('loading-spinner');
            if (spinner) {
                spinner.classList.add('hidden');
                setTimeout(() => {
                    spinner.style.display = 'none';
                }, 500);
            }
        }, 1500);

        // Initialize all animations
        this.initScrollObserver();
        this.initParallaxEffect();
        this.animateCounters();
        this.setupButtonEffects();
    }

    setupLoadingAnimation() {
        // Enhanced loading states for buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.classList.contains('loading')) return;
                
                // Add loading state
                const originalText = btn.innerHTML;
                btn.classList.add('loading');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                btn.style.pointerEvents = 'none';
                
                // Simulate async operation
                setTimeout(() => {
                    btn.classList.remove('loading');
                    btn.innerHTML = originalText;
                    btn.style.pointerEvents = 'auto';
                }, 2000);
            });
        });
    }

    setupScrollAnimations() {
        // Smooth scrolling for navigation links
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Navbar background on scroll
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;

            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.backdropFilter = 'blur(10px)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.background = 'transparent';
                navbar.style.backdropFilter = 'none';
                navbar.style.boxShadow = 'none';
            }

            // Hide/show navbar on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });
    }

    initScrollObserver() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    // Special handling for section headers
                    if (entry.target.classList.contains('section-header')) {
                        entry.target.classList.add('visible');
                    }
                    
                    // Animate garage cards with stagger
                    if (entry.target.classList.contains('garage-grid')) {
                        const cards = entry.target.querySelectorAll('.garage-card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                card.style.animationDelay = `${index * 0.1}s`;
                                card.classList.add('animate');
                            }, index * 100);
                        });
                    }
                    
                    // Animate service cards with stagger
                    if (entry.target.classList.contains('services-grid')) {
                        const cards = entry.target.querySelectorAll('.service-card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                card.style.animationDelay = `${index * 0.1}s`;
                                card.classList.add('animate');
                            }, index * 100);
                        });
                    }
                }
            });
        }, observerOptions);

        // Observe elements for scroll animations
        const elementsToObserve = [
            '.section-header',
            '.garage-grid',
            '.services-grid',
            '.search-filters',
            '.results-header',
            '.scroll-reveal'
        ];

        elementsToObserve.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                observer.observe(el);
            });
        });
    }

    initParallaxEffect() {
        // Simple parallax effect for hero section
        const hero = document.querySelector('.hero');
        if (!hero) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            const heroImage = hero.querySelector('.hero-image');
            if (heroImage) {
                heroImage.style.transform = `translateY(${rate}px)`;
            }
        });
    }

    animateCounters() {
        // Animate numbers when they come into view
        const counters = document.querySelectorAll('[data-counter]');
        
        const animateCounter = (counter) => {
            const target = parseInt(counter.getAttribute('data-counter'));
            const increment = target / 50;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                counter.textContent = Math.floor(current);
                
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                }
            }, 30);
        };

        // Observer for counters
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    entry.target.classList.add('counted');
                    animateCounter(entry.target);
                }
            });
        });

        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }

    setupButtonEffects() {
        // Enhanced button interactions
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            // Ripple effect on click
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });

            // Magnetic effect on mouse move
            button.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                this.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) translateY(-3px)`;
            });

            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translate(0px, 0px) translateY(0px)';
            });
        });
    }

    setupInteractionAnimations() {
        // Form field animations
        const formInputs = document.querySelectorAll('.form-input, .filter-select');
        formInputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                if (!this.value) {
                    this.parentElement.classList.remove('focused');
                }
            });
        });

        // Card hover effects with 3D tilt
        const cards = document.querySelectorAll('.service-card, .garage-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            });
        });

        // GPS button special effects
        const gpsBtn = document.getElementById('gps-btn');
        if (gpsBtn) {
            gpsBtn.addEventListener('click', () => {
                gpsBtn.classList.add('loading');
                gpsBtn.innerHTML = '<i class="fas fa-satellite-dish fa-spin"></i> Getting Location...';
                
                // Add pulsing animation
                gpsBtn.style.animation = 'pulse 2s infinite';
                
                setTimeout(() => {
                    gpsBtn.classList.remove('loading');
                    gpsBtn.innerHTML = '<i class="fas fa-location-dot"></i> Use GPS';
                    gpsBtn.style.animation = '';
                }, 3000);
            });
        }

        // Search results animation
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const resultsSection = document.querySelector('.search-results');
                if (resultsSection) {
                    resultsSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // Animate results appearance
                    setTimeout(() => {
                        const cards = resultsSection.querySelectorAll('.garage-card');
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                card.style.animation = `fadeInUp 0.5s ease-out both`;
                            }, index * 100);
                        });
                    }, 500);
                }
            });
        }
    }
}

// Utility Functions
const AnimationUtils = {
    // Smooth scroll to element
    scrollTo: (element, duration = 1000) => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (!target) return;

        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        };

        requestAnimationFrame(animation);
    },

    // Easing function
    easeInOutQuad: (t, b, c, d) => {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    },

    // Add CSS animation class with cleanup
    animate: (element, animationName, duration = 1000) => {
        const node = typeof element === 'string' ? document.querySelector(element) : element;
        if (!node) return;

        node.style.animationDuration = `${duration}ms`;
        node.classList.add('animated', animationName);

        const handleAnimationEnd = () => {
            node.classList.remove('animated', animationName);
            node.removeEventListener('animationend', handleAnimationEnd);
        };

        node.addEventListener('animationend', handleAnimationEnd);
    },

    // Show toast notification with animation
    showToast: (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;

        // Set background color based on type
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }
};

// CSS for additional animations
const additionalCSS = `
<style>
/* Ripple Effect */
.btn {
    position: relative;
    overflow: hidden;
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
}

@keyframes ripple-animation {
    to {
        transform: scale(2);
        opacity: 0;
    }
}

/* Enhanced Form Focus */
.form-group.focused label {
    color: #667eea;
    transform: translateY(-5px) scale(0.9);
}

/* Loading States */
.btn.loading {
    pointer-events: none;
    opacity: 0.7;
}

/* Toast Notifications */
.toast {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
}

/* Enhanced 3D Card Effects */
.service-card,
.garage-card {
    transform-style: preserve-3d;
    transition: transform 0.2s ease;
}

/* Improved Navbar Transition */
.navbar {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scroll Reveal Base State */
.scroll-reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s ease;
}

.scroll-reveal.visible {
    opacity: 1;
    transform: translateY(0);
}
</style>
`;

// Inject additional CSS
if (!document.querySelector('#additional-animations-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'additional-animations-css';
    styleElement.innerHTML = additionalCSS;
    document.head.appendChild(styleElement);
}

// Initialize Animation Controller when script loads
const animationController = new AnimationController();

// Export for global access
window.AnimationController = AnimationController;
window.AnimationUtils = AnimationUtils;

// Debug info
console.log('🎨 Modern Animations Loaded Successfully');