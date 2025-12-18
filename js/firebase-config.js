// Firebase Config - Using Placeholder keys
// User must update this with actual values from Firebase Console
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjuOt2sbuClx1fS7N0Yapr0AM4H3yfyXU",
  authDomain: "web15-8065b.firebaseapp.com",
  projectId: "web15-8065b",
  storageBucket: "web15-8065b.firebasestorage.app",
  messagingSenderId: "826095508137",
  appId: "1:826095508137:web:ddc11799f33efb8b4167b8",
  measurementId: "G-590WD0SQ0H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, collection, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc, doc, setDoc, signInWithEmailAndPassword, onAuthStateChanged, signOut };
