import { createResourceCard, createElement, debounce } from './utils.js';

/* =========================================
   Global/Shared State
   ========================================= */
let auth, signInWithEmailAndPassword, db, collection, getDocs, query, where;
let firebaseLoaded = false;

// Mock Data
// Mock Data Removed - Now fetching from Firestore

/* =========================================
   1. "Avnish" Protocol (Hidden Admin Access)
   ========================================= */
const SECRET_CODE = "avnish";
let inputSequence = [];

document.addEventListener('keydown', (e) => {
    inputSequence.push(e.key.toLowerCase());
    if (inputSequence.length > SECRET_CODE.length) {
        inputSequence.shift();
    }
    if (inputSequence.join('') === SECRET_CODE) {
        console.log("Access Granted: Protocol Avnish");
        const adminModal = document.getElementById('admin-modal');
        if (adminModal) adminModal.classList.remove('hidden');
    }
});

const closeModalBtn = document.querySelector('.close-modal');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        document.getElementById('admin-modal').classList.add('hidden');
    });
}

/* =========================================
   2. Custom Cursor Logic
   ========================================= */
const cursor = document.getElementById('cursor');

document.addEventListener('mousemove', (e) => {
    // Detect touch device - disable custom cursor if touch is being used
    if (window.matchMedia("(pointer: coarse)").matches) {
        if (cursor) cursor.style.display = 'none';
        return;
    }
    
    if (cursor) {
        cursor.style.display = 'block';
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

const addHoverEffects = () => {
    const clickables = document.querySelectorAll('a, button, .resource-card, input');
    clickables.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    });
};

/* =========================================
   3. Content Fetching & Rendering
   ========================================= */
async function loadResources() {
    const grid = document.getElementById('content-grid');
    
    // Skeleton State to prevent CLS
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="resource-card skeleton" style="height: 350px; opacity: 0.1; background: var(--bg-card); border: 1px solid var(--glass-border);"></div>
    `).join('');

    // Try to load Firebase
    try {
        const fbModule = await import('./firebase-config.js');
        db = fbModule.db;
        collection = fbModule.collection;
        getDocs = fbModule.getDocs;
        query = fbModule.query;
        where = fbModule.where;
        auth = fbModule.auth;
        signInWithEmailAndPassword = fbModule.signInWithEmailAndPassword;
        firebaseLoaded = true;
    } catch (e) {
        console.warn("Firebase failed to load.", e);
        grid.innerHTML = '<p>Offline mode not supported for live data.</p>';
        return;
    }

    // Fetch Public Resources
    try {
        const q = query(collection(db, "resources"), where("isPublic", "==", true));
        const querySnapshot = await getDocs(q);
        
        grid.innerHTML = '';
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p class="empty-state">No resources available at the moment.</p>';
            return;
        }

        let resources = [];
        querySnapshot.forEach((doc) => {
            resources.push({ id: doc.id, ...doc.data() });
        });

        // Store globally for filtering
        window.allResources = resources;

        renderGrid(resources);

    } catch (error) {
        console.error("Error fetching resources:", error);
        grid.innerHTML = '<p>Error loading content.</p>';
    }
}

function renderGrid(resources) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    
    if (resources.length === 0) {
        grid.innerHTML = '<p class="empty-state">No matching resources found.</p>';
        return;
    }

    resources.forEach((res, index) => {
        grid.innerHTML += createResourceCard(res, index + 1);
    });
    
    addHoverEffects();
    attachCardListeners();
}

/* =========================================
   Search Logic
   ========================================= */
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
        const term = e.target.value.toLowerCase().trim();
        const all = window.allResources || [];
        
        if (!term) {
            renderGrid(all);
            return;
        }

        const filtered = all.filter(r => 
            (r.title && r.title.toLowerCase().includes(term)) || 
            (r.description && r.description.toLowerCase().includes(term)) ||
            (r.category && r.category.toLowerCase().includes(term))
        );

        // Switch to grid view if not already
        const categoryView = document.getElementById('category-view');
        const contentGrid = document.getElementById('content-grid');
        if (categoryView && !categoryView.classList.contains('hidden')) {
            categoryView.classList.add('hidden');
            contentGrid.classList.remove('hidden');
        }

        renderGrid(filtered);
    }, 300));
}

/* =========================================
   4. Admin Login Logic
   ========================================= */
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!firebaseLoaded) {
            alert("Cannot log in: Backend connection failed (Offline Mode).");
            return;
        }

        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Login Successful", user);
                window.location.href = 'admin.html';
            })
            .catch((error) => {
                alert(`Login Failed: ${error.message}`);
            });
    });
}

/* =========================================
   5. Interactive Features (Lightbox, FAQ, Nav)
   ========================================= */

// Lightbox
function attachCardListeners() {
    document.querySelectorAll('.resource-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const type = card.dataset.type;
            const url = card.dataset.url;
            const title = card.querySelector('.card-title').innerText;
            
            if (type === 'image') {
                const imgSrc = card.querySelector('img').src;
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightbox-img');
                
                if (lightbox && lightboxImg) {
                    lightboxImg.src = imgSrc; // Use thumb as full image for now if no separate URL
                    // If real url is provided and unique, could use that:
                    if (url) lightboxImg.src = url;
                    lightbox.classList.remove('hidden');
                }
            } else if (url) {
                // Open Link/PDF/Video in new tab
                window.open(url, '_blank');
            } else {
                console.warn(`No URL found for ${title} (${type})`);
                alert("This resource has no attached link.");
            }
        });
    });
}

const lightbox = document.getElementById('lightbox');
if (lightbox) {
    const closeBtn = lightbox.querySelector('.close-lightbox');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            lightbox.classList.add('hidden');
        });
    }
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.classList.add('hidden');
    });
}

// FAQ Accordion Setup
const faqData = [
    { q: "Is this platform free?", a: "Yes, all resources are completely free to access." },
    { q: "How do I contribute?", a: "Currently, only admins can upload resources." },
    { q: "Can I download videos?", a: "Videos are streamed, but PDFs are downloadable." }
];

function initFAQ() {
    const faqContainer = document.getElementById('faq-accordion');
    if (!faqContainer) return;

    faqContainer.innerHTML = '';
    faqData.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.classList.add('faq-item');
        itemEl.innerHTML = `
            <button class="faq-question">${item.q} <span class="arrow">▼</span></button>
            <div class="faq-answer"><p>${item.a}</p></div>
        `;
        faqContainer.appendChild(itemEl);

        const btn = itemEl.querySelector('.faq-question');
        btn.addEventListener('click', () => {
            const isActive = btn.classList.contains('active');
            // Close all
            document.querySelectorAll('.faq-question').forEach(b => {
                b.classList.remove('active');
                if (b.nextElementSibling) {
                    b.nextElementSibling.style.maxHeight = null;
                }
            });
            // Open clicked if wasn't active
            if (!isActive && btn.nextElementSibling) {
                btn.classList.add('active');
                btn.nextElementSibling.style.maxHeight = btn.nextElementSibling.scrollHeight + "px";
            }
        });
    });
}

// Navigation & Filtering
const navItems = document.querySelectorAll('.nav-item');
const categoryView = document.getElementById('category-view');
const contentGrid = document.getElementById('content-grid');
const categoryFeed = document.getElementById('category-feed');
const categoryTitle = document.getElementById('category-title');
const backBtn = document.getElementById('back-to-home');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const filter = item.dataset.filter;
        
        if (filter === 'all') {
            categoryView.classList.add('hidden');
            contentGrid.classList.remove('hidden');
        } else {
            // Switch to Stacked Feed
            contentGrid.classList.add('hidden');
            categoryView.classList.remove('hidden');
            if (categoryTitle) categoryTitle.innerText = filter.charAt(0).toUpperCase() + filter.slice(1) + 's';
            
            // Filter and Render Feed
            const allResources = window.allResources || [];
            const filtered = allResources.filter(r => r.type === filter);
            renderFeed(filtered);
        }
    });
});

function renderFeed(items) {
    if (!categoryFeed) return;
    categoryFeed.innerHTML = '';
    if (items.length === 0) {
        categoryFeed.innerHTML = '<p>No resources found in this category.</p>';
        return;
    }
    items.forEach((res, index) => {
        const cardWrapper = document.createElement('div');
        cardWrapper.innerHTML = createResourceCard(res, index + 1);
        const card = cardWrapper.firstElementChild;
        card.classList.remove('featured'); // No grid spans in feed
        card.classList.add('wide-feed-card');
        categoryFeed.appendChild(card);
    });
    attachCardListeners(); // Re-attach click events
}

if (backBtn) {
    backBtn.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        const homeNav = document.querySelector('[data-filter="all"]');
        if (homeNav) homeNav.classList.add('active');
        
        categoryView.classList.add('hidden');
        contentGrid.classList.remove('hidden');
    });
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadResources();
    initFAQ();
});
