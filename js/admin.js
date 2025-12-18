import { db, auth, onAuthStateChanged, signOut, collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc } from './firebase-config.js';

// Auth Protection
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Redirect to home if not logged in
        window.location.href = 'index.html';
    } else {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().isAdmin === true) {
                console.log("Admin Logged In:", user.email);
                loadAdminResources(); // Load resources upon successful admin verification
            } else {
                alert("Access Denied: Admins only.");
                await signOut(auth);
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Error verifying admin:", error);
            // If checking fails (e.g. network), deny access to be safe or allow if just testing? 
            // Better to deny for security.
            window.location.href = 'index.html';
        }
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// Cloudinary Config (Placeholder)
const cloudName = "dxpfmotzr"; 
const uploadPreset = "web15_uploads";
const cloudApiKey = "812318366513114"; 
const cloudApiSecret = "X943Y8WFyOxgeVZCnD3_lv93QR0"; 

let uploadedFileInfo = {
    url: "",
    publicId: "",
    resourceType: ""
};

// Mock Cloudinary Widget Setup
const myWidget = cloudinary.createUploadWidget({
    cloudName: cloudName, 
    uploadPreset: uploadPreset}, (error, result) => { 
        if (!error && result && result.event === "success") { 
            console.log('Done! Here is the image info: ', result.info); 
            uploadedFileInfo = {
                url: result.info.secure_url,
                publicId: result.info.public_id,
                resourceType: result.info.resource_type
            };
            document.querySelector('.file-drop-zone p').textContent = `File Uploaded: ${result.info.original_filename}`;
            document.querySelector('.file-drop-zone').style.borderColor = '#00E5FF';
        }
    }
);

document.getElementById('file-drop').addEventListener('click', () => {
    myWidget.open();
}, false);

// Form Submission
document.getElementById('resource-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('res-title').value;
    const category = document.getElementById('res-category').value;
    const type = document.getElementById('res-type').value;
    const url = document.getElementById('res-url').value;
    const desc = document.getElementById('res-desc').value;
    const featured = document.getElementById('res-featured').checked;

    const resourceData = {
        title,
        category,
        type,
        url: url || uploadedFileInfo.url, 
        publicId: uploadedFileInfo.publicId || null,
        resourceType: uploadedFileInfo.resourceType || type, // Use detected type or selected type
        description: desc,
        featured,
        createdAt: new Date()
    };

    try {
        const docRef = await addDoc(collection(db, "resources"), resourceData);
        alert(`Resource added successfully! ID: ${docRef.id}`);
        e.target.reset();
        uploadedFileInfo = { url: "", publicId: "", resourceType: "" };
        document.querySelector('.file-drop-zone p').textContent = "Drag & Drop files here or click to upload";
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error saving resource. Check console.");
    }
});

/* =========================================
   Resource Management Logic
   ========================================= */

async function loadAdminResources() {
    const listContainer = document.getElementById('resources-list');
    listContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "resources"));
        listContainer.innerHTML = ''; // Clear loading text

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p>No resources found.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            listContainer.appendChild(renderResourceRow(doc.id, data));
        });
    } catch (error) {
        console.error("Error loading resources:", error);
        listContainer.innerHTML = '<p style="color: #ff4d4d;">Error loading resources.</p>';
    }
}

function renderResourceRow(docId, data) {
    const row = document.createElement('div');
    row.className = 'resource-row';
    
    // Status Badge Logic
    const isPublic = data.isPublic !== false; // Default to true if undefined
    const statusText = isPublic ? 'Public' : 'Locked';
    const statusClass = isPublic ? 'public' : 'private';

    row.innerHTML = `
        <div class="row-title" title="${data.title}">${data.title}</div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">${data.type || 'N/A'}</div>
        <div><span class="status-badge ${statusClass}">${statusText}</span></div>
        <div style="display: flex; gap: 8px;">
            <button class="action-btn edit-btn" data-id="${docId}">Edit</button>
            <button class="action-btn toggle-btn" data-id="${docId}">${isPublic ? 'Lock' : 'Unlock'}</button>
            <button class="action-btn delete-btn" data-id="${docId}" style="border-color: #ff4d4d; color: #ff4d4d;">Delete</button>
        </div>
    `;

    // Attach Event Listeners
    row.querySelector('.edit-btn').addEventListener('click', () => openEditModal(docId, data));
    row.querySelector('.toggle-btn').addEventListener('click', () => toggleVisibility(docId, !isPublic));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteResource(docId, data));

    return row;
}

async function deleteFromCloudinary(publicId, resourceType) {
    if (!cloudApiSecret) {
        console.warn("Cloudinary API Secret missing. Cannot generate signature.");
        return { success: false, error: "Missing API Secret" };
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${cloudApiSecret}`;
    const signature = CryptoJS.SHA1(signatureStr).toString();

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp);
    formData.append("api_key", cloudApiKey);
    formData.append("signature", signature);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        return { success: result.result === "ok", result };
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
        return { success: false, error };
    }
}

async function deleteResource(docId, data) {
    if (!confirm(`Are you sure you want to delete "${data.title}"?\nThis cannot be undone.`)) return;

    try {
        // 1. Delete from Cloudinary if publicId exists
        if (data.publicId) {
            console.log(`Attempting to delete Cloudinary asset: ${data.publicId}`);
            const clResult = await deleteFromCloudinary(data.publicId, data.resourceType || 'image');
            
            if (clResult.success) {
                console.log("Cloudinary asset deleted successfully.");
            } else {
                console.warn("Cloudinary deletion unsuccessful:", clResult.error || "Unknown error");
                if (!cloudApiSecret) {
                    alert(`Resource metadata deleted from Firestore.\n\nNOTE: The Cloudinary file (${data.publicId}) was NOT deleted because the API Secret is missing in admin.js. Please update cloudApiSecret to enable automatic cleanup.`);
                } else {
                    alert(`Firestore entry deleted, but Cloudinary asset removal failed: ${JSON.stringify(clResult.result)}`);
                }
            }
        }

        // 2. Delete from Firestore
        await deleteDoc(doc(db, "resources", docId));
        
        if (!data.publicId || (data.publicId && !cloudApiSecret)) {
             // Already alerted above or no file to delete
        } else {
            alert("Resource and associated media deleted successfully.");
        }
        
        loadAdminResources();
    } catch (error) {
        console.error("Error deleting resource:", error);
        alert("Failed to delete resource.");
    }
}

async function toggleVisibility(docId, newStatus) {
    try {
        const resourceRef = doc(db, "resources", docId);
        await updateDoc(resourceRef, {
            isPublic: newStatus
        });
        // Reload list to reflect changes (or update DOM directly for speed)
        loadAdminResources(); 
    } catch (error) {
        console.error("Error updating visibility:", error);
        alert("Failed to update status.");
    }
}

/* =========================================
   Edit Modal Logic
   ========================================= */
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-resource-form');
const closeModal = document.querySelector('#edit-modal .close-modal');

if (closeModal) {
    closeModal.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });
}

function openEditModal(docId, data) {
    document.getElementById('edit-doc-id').value = docId;
    document.getElementById('edit-title').value = data.title || '';
    document.getElementById('edit-category').value = data.category || '';
    document.getElementById('edit-type').value = data.type || 'link';
    document.getElementById('edit-url').value = data.url || '';
    document.getElementById('edit-desc').value = data.description || '';
    document.getElementById('edit-isPublic').value = (data.isPublic !== false).toString();
    document.getElementById('edit-featured').checked = data.featured === true;
    
    editModal.classList.remove('hidden');
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = document.getElementById('edit-doc-id').value;
    const newTitle = document.getElementById('edit-title').value;
    const newCategory = document.getElementById('edit-category').value;
    const newType = document.getElementById('edit-type').value;
    const newUrl = document.getElementById('edit-url').value;
    const newDesc = document.getElementById('edit-desc').value;
    const newIsPublic = document.getElementById('edit-isPublic').value === 'true';
    const newFeatured = document.getElementById('edit-featured').checked;

    try {
        const resourceRef = doc(db, "resources", docId);
        await updateDoc(resourceRef, {
            title: newTitle,
            category: newCategory,
            type: newType,
            url: newUrl,
            description: newDesc,
            isPublic: newIsPublic,
            featured: newFeatured,
            updatedAt: new Date() // Add update timestamp
        });
        
        editModal.classList.add('hidden');
        loadAdminResources(); // Refresh list
        alert("Resource updated successfully!");
    } catch (error) {
        console.error("Error updating resource:", error);
        alert("Failed to update resource.");
    }
});
