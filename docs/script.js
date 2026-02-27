// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards, step cards, and doc cards
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.feature-card, .step-card, .doc-card, .faq-item'
    );

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
});

// Add navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    } else {
        navbar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    }
});

// Copy to clipboard functionality for code snippets
document.querySelectorAll('.code-snippet code, .terminal-line .command').forEach(element => {
    element.style.cursor = 'pointer';
    element.title = 'Click to copy';

    element.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(element.textContent);

            // Show feedback
            const originalText = element.textContent;
            element.textContent = '✓ Copied!';
            element.style.color = '#057642';

            setTimeout(() => {
                element.textContent = originalText;
                element.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
});

// Terminal typing animation
const terminalLines = document.querySelectorAll('.terminal-line');
let delay = 0;

terminalLines.forEach((line, index) => {
    line.style.opacity = '0';

    setTimeout(() => {
        line.style.transition = 'opacity 0.3s';
        line.style.opacity = '1';
    }, delay);

    delay += 600;
});

// FAQ toggle animation
document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
        if (item.open) {
            const content = item.querySelector('p');
            content.style.animation = 'fadeIn 0.3s ease';
        }
    });
});

// Add CSS animation for FAQ
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Stats counter animation
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Observe stats for counter animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const numbers = entry.target.querySelectorAll('.stat-number');
            numbers.forEach(num => {
                const text = num.textContent;
                const match = text.match(/\d+/);
                if (match) {
                    const value = parseInt(match[0]);
                    animateCounter(num, value);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Add hover effect to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#0A66C2';
    });

    card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#E0E0E0';
    });
});

// Mobile menu toggle (for responsive design)
const createMobileMenu = () => {
    const nav = document.querySelector('.nav-links');
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '☰';
        menuBtn.style.cssText = `
            display: block;
            background: none;
            border: none;
            font-size: 24px;
            color: #0A66C2;
            cursor: pointer;
            padding: 8px;
        `;

        menuBtn.addEventListener('click', () => {
            nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
            nav.style.flexDirection = 'column';
            nav.style.position = 'absolute';
            nav.style.top = '60px';
            nav.style.right = '24px';
            nav.style.background = 'white';
            nav.style.padding = '16px';
            nav.style.borderRadius = '8px';
            nav.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });

        document.querySelector('.nav-content').appendChild(menuBtn);
    }
};

window.addEventListener('resize', createMobileMenu);
createMobileMenu();

console.log('LinkedIn Auto-Apply - Page loaded successfully');
