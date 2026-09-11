// ===============================
// MEDICINE DRAWER - CLEAN APP.JS
// Login + Drawer + Medicine + Search + Photo
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyBrOYuu6HPbe4VFinShhU_v__qpbfupBkk",
  authDomain: "medicine-drower.firebaseapp.com",
  projectId: "medicine-drower",
  storageBucket: "medicine-drower.firebasestorage.app",
  messagingSenderId: "829676157004",
  appId: "1:829676157004:web:5125cbda36e278bed89ce9",
  measurementId: "G-6NZ2L038K5"
};


// ===============================
// FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


// ===============================
// ELEMENTS
// ===============================

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const addDrawerBtn = document.getElementById("addDrawerBtn");
const drawerContainer = document.getElementById("drawerContainer");

const drawerModal = document.getElementById("drawerModal");
const closeDrawerModal = document.getElementById("closeDrawerModal");
const drawerNameInput = document.getElementById("drawerName");
const saveDrawerBtn = document.getElementById("saveDrawerBtn");

const medicineModal = document.getElementById("medicineModal");
const closeMedicineModal = document.getElementById("closeMedicineModal");

const medicineIdInput = document.getElementById("medicineId");
const medicineCompanyInput = document.getElementById("medicineCompany");
const medicineSaltInput = document.getElementById("medicineSalt");

const medicineImageInput = document.getElementById("medicineImage");
const imagePreview = document.getElementById("imagePreview");

const saveMedicineBtn = document.getElementById("saveMedicineBtn");

const imageViewer = document.getElementById("imageViewer");
const closeImageViewer = document.getElementById("closeImageViewer");
const zoomedImage = document.getElementById("zoomedImage");


// ===============================
// DATA
// ===============================

let currentUser = null;

let drawers = [];
let medicines = [];

let editingDrawer = null;
let editingMedicine = null;
let medicineDrawerId = null;


// ===============================
// HELPERS
// ===============================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function openModal(modal) {
  if (modal) {
    modal.classList.remove("hidden");
  }
}


function closeModal(modal) {
  if (modal) {
    modal.classList.add("hidden");
  }
}


// ===============================
// MEDICINE NAME INPUT
// ===============================

function getMedicineNameInput() {
  let input = document.getElementById("medicineName");

  if (!input && medicineModal) {

    input = document.createElement("input");

    input.type = "text";
    input.id = "medicineName";
    input.placeholder = "Medicine name";
    input.maxLength = 100;

    const box = medicineModal.querySelector(".modal-box");
    const company = document.getElementById("medicineCompany");

    if (box) {
      box.insertBefore(input, company || box.firstChild);
    }
  }

  return input;
}


// ===============================
// REMOVE DUPLICATE PHOTO INPUTS
// ===============================

document.querySelectorAll("#medicineImage").forEach((el, index) => {
  if (index > 0) {
    el.remove();
  }
});

document.querySelectorAll("#imagePreview").forEach((el, index) => {
  if (index > 0) {
    el.remove();
  }
});


// ===============================
// AUTH PERSISTENCE
// ===============================

setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Persistence error:", error);
  });


// ===============================
// GOOGLE LOGIN
// ===============================

loginBtn?.addEventListener("click", async () => {

  if (currentUser) {
    return;
  }

  try {

    loginBtn.disabled = true;
    loginBtn.textContent = "⏳ Signing in...";

    await setPersistence(
      auth,
     
