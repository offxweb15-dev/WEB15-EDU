/**
 * Utility functions for DOM manipulation and component creation
 */

// Create a DOM element with classes and content
export function createElement(tag, classes = [], content = '') {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes);
    if (content) el.innerHTML = content;
    return el;
}

// Helper to get artistic placeholder SVG/HTML based on type
function getPlaceholderArt(type) {
    let icon = '';
    let bgColorClass = '';

    switch(type) {
        case 'video':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            bgColorClass = 'placeholder-video';
            break;
        case 'pdf':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
            bgColorClass = 'placeholder-pdf';
            break;
        case 'link':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
            bgColorClass = 'placeholder-link';
            break;
        case 'image':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            bgColorClass = 'placeholder-image';
            break;
        default:
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            bgColorClass = 'placeholder-default';
    }

    return `
        <div class="placeholder-art ${bgColorClass}">
            ${icon}
        </div>
    `;
}

// Helper to optimize Cloudinary URLs dynamically
function optimizeCloudinaryUrl(url, width = 800) {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    // Insert transformation after /upload/
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    
    // q_auto: quality, f_auto: format, c_fill: crop, w_width: sizing
    const transformation = `q_auto,f_auto,c_fill,w_${width}/`;
    return `${parts[0]}/upload/${transformation}${parts[1]}`;
}

// Generate HTML for a resource card based on type
export function createResourceCard(resource, index = 1) {
    const colSpan = resource.featured ? 'featured' : '';
    
    // Adaptive sizing: larger for desktop (800px), smaller for mobile/grid (400px)
    // We'll use 800 as a safe high-quality default that's still compressed
    const optimizedThumb = optimizeCloudinaryUrl(resource.thumbnail, 800);
    
    // Performance: First 2 cards get fetchpriority="high" for LCP optimization
    const priorityAttr = index <= 2 ? 'fetchpriority="high"' : 'loading="lazy"';
    
    const cardMedia = resource.thumbnail 
        ? `<img src="${optimizedThumb}" alt="${resource.title}" class="card-thumb" ${priorityAttr}>`
        : getPlaceholderArt(resource.type);
    
    let actionBtnsHtml = '';
    
    switch(resource.type) {
        case 'video':
            actionBtnsHtml = '<button class="btn-primary small">▶ Play Video</button>';
            break;
        case 'pdf':
            actionBtnsHtml = `
                <button class="btn-primary small">👁 View</button>
                <button class="btn-ghost small">↓ Download</button>
            `;
            break;
        case 'link':
            actionBtnsHtml = '<button class="btn-primary small">🔗 Visit Link</button>';
            break;
        case 'image':
            actionBtnsHtml = '<button class="btn-primary small">🖼 Expand</button>';
            break;
        default:
            actionBtnsHtml = '<button class="btn-primary small">View</button>';
    }

    return `
        <article class="resource-card ${colSpan}" data-type="${resource.type}" data-id="${resource.id}" data-url="${resource.url || ''}">
            ${cardMedia}
            <div class="card-content">
                <h3 class="card-title">${resource.title}</h3>
                <p class="card-meta">${resource.category || 'General'}</p>
                <div class="card-actions">
                    ${actionBtnsHtml}
                </div>
            </div>
        </article>
    `;
}

// Debounce function for optimizations
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
