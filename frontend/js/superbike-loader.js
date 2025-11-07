// Superbike Stunt Loading Animation Controller
class SuperbikeLoader {
    constructor() {
        this.loader = document.getElementById('superbike-loader');
        this.progressText = document.querySelector('.loading-percentage');
        this.loadingSteps = [
            'Starting engines...',
            'Checking tire pressure...',
            'Warming up brakes...',
            'Loading garage data...',
            'Connecting to services...',
            'Preparing dashboard...',
            'Ready to ride!'
        ];
        this.currentStep = 0;
        this.progress = 0;
        
        this.init();
    }
    
    init() {
        if (!this.loader) return;
        
        // Start the loading sequence
        this.startLoading();
        
        // Listen for page load completion
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
        
        // Listen for window load completion (all resources loaded)
        window.addEventListener('load', () => this.onPageFullyLoaded());
    }
    
    startLoading() {
        // Update progress and loading text
        this.updateProgress();
        
        // Simulate loading steps
        this.progressInterval = setInterval(() => {
            this.progress += Math.random() * 15 + 5; // Random increment between 5-20
            
            if (this.progress >= 100) {
                this.progress = 100;
                this.completeLoading();
                return;
            }
            
            this.updateProgress();
        }, 300 + Math.random() * 200); // Random interval between 300-500ms
    }
    
    updateProgress() {
        if (this.progressText) {
            this.progressText.textContent = `${Math.floor(this.progress)}%`;
        }
        
        // Update loading step text
        const stepIndex = Math.floor((this.progress / 100) * (this.loadingSteps.length - 1));
        if (stepIndex !== this.currentStep && stepIndex < this.loadingSteps.length) {
            this.currentStep = stepIndex;
            const loadingText = document.querySelector('.loading-text p');
            if (loadingText) {
                loadingText.style.animation = 'none';
                loadingText.textContent = this.loadingSteps[this.currentStep];
                // Trigger reflow
                loadingText.offsetHeight;
                loadingText.style.animation = 'fadeInOut 0.5s ease-in-out';
            }
        }
        
        // Add some visual feedback
        this.addVisualEffects();
    }
    
    addVisualEffects() {
        // Add random particle bursts at certain progress milestones
        const milestones = [25, 50, 75, 90];
        const currentMilestone = milestones.find(m => 
            Math.abs(this.progress - m) < 2 && !this[`milestone${m}`]
        );
        
        if (currentMilestone) {
            this[`milestone${currentMilestone}`] = true;
            this.createParticleBurst();
        }
    }
    
    createParticleBurst() {
        const container = document.querySelector('.animation-container');
        if (!container) return;
        
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: radial-gradient(circle, #ffa502, #ff6348);
                border-radius: 50%;
                pointer-events: none;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: burstParticle 2s ease-out forwards;
                z-index: 1000;
            `;
            
            container.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 2000);
        }
    }
    
    onDOMReady() {
        console.log('🏍️ DOM ready - Superbike animation in progress...');
        // Ensure minimum loading time for animation appreciation
        this.domReady = true;
    }
    
    onPageFullyLoaded() {
        console.log('🏁 Page fully loaded - Completing superbike animation...');
        this.pageLoaded = true;
        
        // Complete loading if not already completed
        if (this.progress < 100) {
            setTimeout(() => {
                this.progress = 100;
                this.completeLoading();
            }, 500);
        }
    }
    
    completeLoading() {
        if (this.completed) return;
        this.completed = true;
        
        // Clear the progress interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        // Update final progress
        if (this.progressText) {
            this.progressText.textContent = '100%';
        }
        
        // Final loading message
        const loadingText = document.querySelector('.loading-text p');
        if (loadingText) {
            loadingText.textContent = 'Ready to ride!';
        }
        
        console.log('🎯 Loading complete - Hiding superbike animation...');
        
        // Wait a bit to show completion, then fade out
        setTimeout(() => {
            this.hideLoader();
        }, 800);
    }
    
    hideLoader() {
        if (!this.loader) return;
        
        // Add fade out class
        this.loader.classList.add('fade-out');
        
        // Remove loader from DOM after animation
        setTimeout(() => {
            if (this.loader && this.loader.parentNode) {
                this.loader.style.display = 'none';
                
                // Show main content and reset page position
                document.body.style.overflow = 'auto';
                
                // Add a small delay to ensure DOM is updated, then scroll to top
                setTimeout(() => {
                    // Force immediate scroll to top
                    window.scrollTo(0, 0);
                    
                    // Then smooth scroll to ensure hero section is visible
                    setTimeout(() => {
                        const heroSection = document.getElementById('home');
                        if (heroSection) {
                            heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);
                }, 50);
                
                console.log('✅ Superbike animation complete - Welcome to Service Point!');
                
                // Fire custom event for other scripts
                window.dispatchEvent(new CustomEvent('superbikeLoadingComplete'));
            }
        }, 1000);
    }
    
    // Emergency fallback - force complete loading after maximum time
    setMaxLoadingTime(maxTime = 8000) {
        setTimeout(() => {
            if (!this.completed) {
                console.log('⚡ Force completing superbike animation after timeout...');
                this.completeLoading();
            }
        }, maxTime);
    }
}

// Additional CSS animations for dynamic effects
const additionalStyles = `
<style>
@keyframes fadeInOut {
    0% { opacity: 1; transform: translateY(0); }
    50% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
}

@keyframes burstParticle {
    0% { 
        transform: scale(0) rotate(0deg);
        opacity: 1;
    }
    50% {
        transform: scale(1.5) rotate(180deg);
        opacity: 0.8;
    }
    100% { 
        transform: scale(0) rotate(360deg);
        opacity: 0;
    }
}

/* Hide main content initially */
body.loading nav,
body.loading section,
body.loading footer {
    display: none !important;
    visibility: hidden;
}

body.loading {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
}

body.loading-complete {
    overflow: auto;
    position: static;
}

body.loading-complete nav,
body.loading-complete section,
body.loading-complete footer {
    display: block !important;
    visibility: visible;
}
</style>
`;

// Add additional styles immediately
document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Initialize the superbike loader immediately
const initLoader = () => {
    // Start the superbike loader
    const loader = new SuperbikeLoader();
    
    // Set maximum loading time as fallback
    loader.setMaxLoadingTime(6000); // 6 seconds max
    
    // Listen for completion to show main content
    window.addEventListener('superbikeLoadingComplete', () => {
        document.body.classList.remove('loading');
        document.body.classList.add('loading-complete');
    });
};

// Start immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoader);
} else {
    initLoader();
}

// Export for potential external use
window.SuperbikeLoader = SuperbikeLoader;