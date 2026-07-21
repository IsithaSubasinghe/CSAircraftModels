const header = document.querySelector('header');
const mobileToggle = document.querySelector('.mobile-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-menu a');
const orderForm = document.getElementById('order-form');
const yearSpan = document.getElementById('year');

const WHATSAPP_NUMBER = '947759164002'; // Replace with your real WhatsApp phone number, including country code and no + or spaces.
const WHATSAPP_MESSAGE = 'Hello, I would like to request a custom aircraft model.';
const whatsappLinks = document.querySelectorAll('.whatsapp-icon, .whatsapp-float');

function getWhatsappUrl() {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}

whatsappLinks.forEach(link => {
    if (link instanceof HTMLAnchorElement) {
        link.href = getWhatsappUrl();
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }
});

function updateHeaderState() {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

function setMobileToggleState(isExpanded) {
    mobileToggle.setAttribute('aria-expanded', String(isExpanded));
    mobileToggle.setAttribute('aria-label', isExpanded ? 'Close navigation menu' : 'Open navigation menu');
}

window.addEventListener('scroll', updateHeaderState);

mobileToggle.addEventListener('click', function () {
    const isActive = navMenu.classList.toggle('active');
    setMobileToggleState(isActive);
});

navLinks.forEach(link => {
    link.addEventListener('click', function () {
        navMenu.classList.remove('active');
        setMobileToggleState(false);
    });
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100); // Stagger animation
        }
    });
}, observerOptions);

const animatedElements = document.querySelectorAll('.collection-item');
animatedElements.forEach(el => {
    observer.observe(el);
});

if (orderForm) {
    orderForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(orderForm);
        const name = formData.get('name')?.toString().trim() || 'Customer';
        const email = formData.get('email')?.toString().trim() || '';
        const country = formData.get('country')?.toString().trim() || 'Not specified';
        const whatsapp = formData.get('whatsapp')?.toString().trim() || 'Not specified';
        const model = formData.get('model')?.toString().trim() || 'Not specified';
        const custom = formData.get('custom')?.toString().trim() || 'No additional requests';
        const size = formData.get('size')?.toString().trim() || 'Not specified';

        // Try to submit via API first
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert('Thank you! Your custom order request has been submitted successfully.');
                orderForm.reset();
                console.log('Order saved:', result);
                return;
            }
        } catch (error) {
            console.warn('API submission failed, falling back to email:', error);
        }

        // Fallback to mailto
        const subject = `Custom Model Request from ${name}`;
        const body = `Name: ${name}\nEmail: ${email}\nCountry: ${country}\nWhatsApp: ${whatsapp}\nModel: ${model}\nPreferred size or scale: ${size}\nCustom requests: ${custom}`;
        const mailtoUrl = `mailto:csaircraftmodels@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoUrl;
        orderForm.reset();
    });
}

if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

/* Collection carousel: converts the collection grid to a horizontal carousel on wide screens
   Autoplays by scrolling every few seconds and pauses while the user hovers. */
function initCollectionCarousel() {
    const grid = document.querySelector('.collection-grid');
    if (!grid) return;

    const setupCarousel = () => {
        const items = grid.querySelectorAll('.collection-item');
        if (!items.length) return;

        if (window.innerWidth <= 768) {
            grid.classList.remove('carousel');
            grid.style.scrollBehavior = '';
            grid.scrollLeft = 0;
            return;
        }

        grid.classList.add('carousel');
        const gapStyle = window.getComputedStyle(grid).gap || '24px';
        const gap = parseInt(gapStyle, 10) || 24;
        let itemWidth = items[0].getBoundingClientRect().width + gap;
        let index = 0;
        let timer = null;

        const start = () => {
            stop();
            timer = setInterval(() => {
                index = (index + 1) % items.length;
                grid.scrollTo({ left: Math.round(index * itemWidth), behavior: 'smooth' });
            }, 3200);
        };

        const stop = () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        };

        // Pause on hover
        grid.addEventListener('mouseenter', stop);
        grid.addEventListener('mouseleave', start);

        // Recalculate sizes on resize
        window.addEventListener('resize', () => {
            itemWidth = items[0].getBoundingClientRect().width + gap;
        });

        // start
        start();
    };

    setupCarousel();
    // re-setup when orientation/size changes
    window.addEventListener('orientationchange', setupCarousel);
}

document.addEventListener('DOMContentLoaded', initCollectionCarousel);

// Editorial hero animations: fade in title, subtitle, artist name, badge and staggered text blocks
function initEditorialHero() {
    const title = document.querySelector('.hero-title');
    const sub = document.querySelector('.hero-sub');
    const artist = document.querySelector('.artist-name');
    const badge = document.querySelector('.badge');
    const blocks = Array.from(document.querySelectorAll('.hero-text .text-block'));
    if (!title) return;

    // IntersectionObserver to trigger animations when hero enters viewport
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                title.classList.add('in-view', 'animate-track');
                setTimeout(() => sub.classList && sub.classList.add('in-view'), 120);
                setTimeout(() => artist.classList && artist.classList.add('in-view'), 240);
                setTimeout(() => badge.classList && badge.classList.add('in-view'), 360);
                blocks.forEach((b, i) => setTimeout(() => b.classList.add('in-view'), 420 + i * 120));
                io.disconnect();
            }
        });
    }, { threshold: 0.12 });

    io.observe(title);
}

document.addEventListener('DOMContentLoaded', initEditorialHero);
