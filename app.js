// ===============================
// FIREBASE IMPORTS
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyBrOYuu6HPbe4VFinShhU_v__qpbfupBkk",
  authDomain: "medicine-drower.firebaseapp.com",
  databaseURL: "https://medicine-drower-default-rtdb.firebaseio.com",
  projectId: "medicine-drower",
  storageBucket: "medicine-drower.firebasestorage.app",
  messagingSenderId: "829676157004",
  appId: "1:829676157004:web:5125cbda36e278bed89ce9",
  measurementId: "G-6NZ2L038K5"
};


// ===============================
// INITIALIZE FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();


// ===============================
// APP STATE
// ===============================

let currentUser = null;
let drawers = [];
let medicines = [];
let editingDrawerId = null;
let editingMedicineId = null;
let selectedDrawerId = null;
let selectedImageData = null;


// ===============================
// ELEMENTS
// ===============================

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const drawerContainer = document.getElementById("drawerContainer");
const addDrawerBtn = document.getElementById("addDrawerBtn");

const drawerModal = document.getElementById("drawerModal");
const drawerName = document.getElementById("drawerName");
const saveDrawerBtn = document.getElementById("saveDrawerBtn");
const closeDrawerModal = document.getElementById("closeDrawerModal");

const medicineModal = document.getElementById("medicineModal");
const medicineId = document.getElementById("medicineId");
const medicineName = document.getElementById("medicineName");
const medicineCompany = document.getElementById("medicineCompany");
const medicineSalt = document.getElementById("medicineSalt");
const medicineImage = document.getElementById("medicineImage");
const imagePreview = document.getElementById("imagePreview");
const saveMedicineBtn = document.getElementById("saveMedicineBtn");
const closeMedicineModal = document.getElementById("closeMedicineModal");

const imageViewer = document.getElementById("imageViewer");
const zoomedImage = document.getElementById("zoomedImage");
const closeImageViewer = document.getElementById("closeImageViewer");


// ===============================
// GOOGLE LOGIN
// ===============================

loginBtn.addEventListener("click", async () => {

  try {

    await signInWithPopup(auth, provider);

  } catch (error) {

    console.error(error);

    alert("Login failed: " + error.message);

  }

});


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener("click", async () => {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(error);

    alert("Logout failed.");

  }

});


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (user) {

    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    await loadAllData();

  } else {

    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    drawers = [];
    medicines = [];

    renderDrawers();

    searchResults.innerHTML = `
      <div class="empty-message">
        🔐 Sign in to see your medicine drawers.
      </div>
    `;

  }

});


// ===============================
// FIRESTORE COLLECTIONS
// ===============================

function drawersCollection() {

  return collection(
    db,
    "users",
    currentUser.uid,
    "drawers"
  );

}

function medicinesCollection() {

  return collection(
    db,
    "users",
    currentUser.uid,
    "medicines"
  );

}


// ===============================
// LOAD DATA
// ===============================

async function loadAllData() {

  if (!currentUser) return;

  try {

    const drawerSnapshot = await getDocs(
      query(drawersCollection(), orderBy("createdAt"))
    );

    drawers = drawerSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

  } catch (error) {

    console.error(error);

    drawers = [];

  }


  try {

    const medicineSnapshot = await getDocs(
      query(medicinesCollection(), orderBy("createdAt"))
    );

    medicines = medicineSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

  } catch (error) {

    console.error(error);

    medicines = [];

  }


  renderDrawers();

}


// ===============================
// ADD DRAWER
// ===============================

addDrawerBtn.addEventListener("click", () => {

  if (!currentUser) {

    alert("पहले Google से Sign in करो।");

    return;

  }

  editingDrawerId = null;

  drawerName.value = "";

  drawerModal.classList.remove("hidden");

});


// ===============================
// CLOSE DRAWER MODAL
// ===============================

closeDrawerModal.addEventListener("click", () => {

  drawerModal.classList.add("hidden");

});


// ===============================
// SAVE DRAWER
// ===============================

saveDrawerBtn.addEventListener("click", async () => {

  const name = drawerName.value.trim();

  if (!name) {

    alert("Drawer का नाम लिखो।");

    return;

  }

  if (!currentUser) return;


  try {

    if (editingDrawerId) {

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "drawers",
          editingDrawerId
        ),
        {
          name: name,
          updatedAt: Date.now()
        },
        {
          merge: true
        }
      );

    } else {

      await addDoc(
        drawersCollection(),
        {
          name: name,
          createdAt: Date.now()
        }
      );

    }


    drawerModal.classList.add("hidden");

    await loadAllData();

  } catch (error) {

    console.error(error);

    alert("Drawer save नहीं हुआ: " + error.message);

  }

});


// ===============================
// EDIT DRAWER
// ===============================

window.editDrawer = function(id) {

  const drawer = drawers.find(item => item.id === id);

  if (!drawer) return;

  editingDrawerId = id;

  drawerName.value = drawer.name;

  drawerModal.classList.remove("hidden");

};


// ===============================
// DELETE DRAWER
// ===============================

window.deleteDrawer = async function(id) {

  const drawer = drawers.find(item => item.id === id);

  if (!drawer) return;


  const ok = confirm(
    `क्या "${drawer.name}" drawer delete करना है?\n\nइस drawer की medicines भी delete हो जाएंगी।`
  );

  if (!ok) return;


  try {

    const drawerMedicines =
      medicines.filter(item => item.drawerId === id);


    for (const medicine of drawerMedicines) {

      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "medicines",
          medicine.id
        )
      );

    }


    await deleteDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "drawers",
        id
      )
    );


    await loadAllData();

  } catch (error) {

    console.error(error);

    alert("Delete नहीं हुआ: " + error.message);

  }

};


// ===============================
// ADD MEDICINE
// ===============================

window.addMedicine = function(drawerId) {

  if (!currentUser) {

    alert("पहले Google से Sign in करो।");

    return;

  }


  selectedDrawerId = drawerId;

  editingMedicineId = null;

  medicineId.value = "";

  medicineName.value = "";
  medicineCompany.value = "";
  medicineSalt.value = "";

  medicineImage.value = "";

  selectedImageData = null;

  imagePreview.src = "";
  imagePreview.classList.add("hidden");

  medicineModal.classList.remove("hidden");

};


// ===============================
// CLOSE MEDICINE MODAL
// ===============================

closeMedicineModal.addEventListener("click", () => {

  medicineModal.classList.add("hidden");

});


// ===============================
// IMAGE COMPRESSION
// ===============================

medicineImage.addEventListener("change", async (event) => {

  const file = event.target.files[0];

  if (!file) return;


  try {

    selectedImageData = await compressImage(file);

    imagePreview.src = selectedImageData;

    imagePreview.classList.remove("hidden");

  } catch (error) {

    console.error(error);

    alert("Photo process नहीं हो सकी।");

  }

});


// ===============================
// COMPRESS PHOTO
// ===============================

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      const img = new Image();

      img.onload = () => {

        let width = img.width;
        let height = img.height;

        const maxSize = 1000;


        if (width > maxSize || height > maxSize) {

          if (width > height) {

            height = Math.round(
              height * maxSize / width
            );

            width = maxSize;

          } else {

            width = Math.round(
              width * maxSize / height
            );

            height = maxSize;

          }

        }


        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;


        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );


        const dataUrl = canvas.toDataURL(
          "image/jpeg",
          0.70
        );


        // Firestore document size safety check
        if (dataUrl.length > 700000) {

          reject(
            new Error("Image is too large.")
          );

          return;

        }


        resolve(dataUrl);

      };


      img.onerror = reject;

      img.src = reader.result;

    };


    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}


// ===============================
// SAVE MEDICINE
// ===============================

saveMedicineBtn.addEventListener("click", async () => {

  const name = medicineName.value.trim();

  if (!name) {

    alert("Medicine का नाम लिखो।");

    return;

  }

  if (!currentUser) return;


  try {

    const medicineData = {

      name: name,

      company: medicineCompany.value.trim(),

      salt: medicineSalt.value.trim(),

      drawerId: selectedDrawerId,

      updatedAt: Date.now()

    };


    if (
