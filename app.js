// ============================================================
// MY MEDICAL DRAWER - app.js
// ============================================================

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


// ================= FIREBASE CONFIG =================

const firebaseConfig = {
  apiKey: "AIzaSyBrOYuu6HPbe4VFinShhU_v__qpbfupBkk",
  authDomain: "medicine-drower.firebaseapp.com",
  projectId: "medicine-drower",
  storageBucket: "medicine-drower.firebasestorage.app",
  messagingSenderId: "829676157004",
  appId: "1:829676157004:web:5125cbda36e278bed89ce9",
  measurementId: "G-6NZ2L038K5"
};


// ================= INITIALIZE =================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


// ================= HTML ELEMENTS =================

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


// ================= APP STATE =================

let currentUser = null;
let drawers = [];
let medicines = [];

let editingDrawerId = null;
let editingMedicineId = null;
let medicineDrawerId = null;

let selectedMedicineImage = "";


// ================= HELPERS =================

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(modal) {
  modal?.classList.remove("hidden");
}

function closeModal(modal) {
  modal?.classList.add("hidden");
}


// ================= MEDICINE NAME INPUT =================

function getMedicineNameInput() {
  let input = document.getElementById("medicineName");

  if (!input && medicineModal) {
    input = document.createElement("input");
    input.type = "text";
    input.id = "medicineName";
    input.placeholder = "Medicine name";
    input.maxLength = 100;
    input.autocomplete = "off";

    const box = medicineModal.querySelector(".modal-box");
    const company = document.getElementById("medicineCompany");

    if (box) {
      box.insertBefore(input, company || box.firstChild);
    }
  }

  return input;
}


// ================= FIRESTORE PATHS =================

function drawersCollection() {
  return collection(db, "users", currentUser.uid, "drawers");
}

function medicinesCollection() {
  return collection(db, "users", currentUser.uid, "medicines");
}


// ================= GOOGLE LOGIN =================

loginBtn?.addEventListener("click", async () => {
  if (currentUser) return;

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "⏳ Signing in...";

    await setPersistence(auth, browserLocalPersistence);

    // IMPORTANT:
    // Popup login only.
    // NO signInWithRedirect.
    await signInWithPopup(auth, provider);

  } catch (error) {
    console.error("Google login error:", error);

    let message = error?.message || "Google login failed.";

    if (error?.code === "auth/popup-closed-by-user") {
      message = "Google login popup was closed.";
    }

    if (error?.code === "auth/popup-blocked") {
      message = "Google login popup was blocked. Please allow popups.";
    }

    if (error?.code === "auth/cancelled-popup-request") {
      message = "Another login request is already running.";
    }

    alert(message);

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "🔐 Sign in with Google";
  }
});


// ================= LOGOUT =================

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("Logout error: " + error.message);
  }
});


// ================= AUTH STATE =================

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");

    console.log("Logged in:", user.email);

    try {
      await loadData();
    } catch (error) {
      console.error("Load error:", error);
      alert("Login successful, but data could not be loaded.");
    }

  } else {
    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");

    drawers = [];
    medicines = [];

    renderDrawers();

    if (searchResults) {
      searchResults.innerHTML = "";
    }
  }
});

// ============================================================
// PART 2 - LOAD DATA + DRAWERS
// ============================================================


// ================= LOAD ALL DATA =================

async function loadData() {
  if (!currentUser) return;

  await Promise.all([
    loadDrawers(),
    loadMedicines()
  ]);

  renderDrawers();

  if (searchInput?.value.trim()) {
    renderSearchResults(searchInput.value);
  }
}


// ================= LOAD DRAWERS =================

async function loadDrawers() {
  if (!currentUser) return;

  const snapshot = await getDocs(drawersCollection());

  drawers = [];

  snapshot.forEach(item => {
    drawers.push({
      id: item.id,
      ...item.data()
    });
  });

  drawers.sort((a, b) =>
    normalizeText(a.name).localeCompare(normalizeText(b.name))
  );
}


// ================= LOAD MEDICINES =================

async function loadMedicines() {
  if (!currentUser) return;

  const snapshot = await getDocs(medicinesCollection());

  medicines = [];

  snapshot.forEach(item => {
    medicines.push({
      id: item.id,
      ...item.data()
    });
  });

  medicines.sort((a, b) =>
    normalizeText(a.name).localeCompare(normalizeText(b.name))
  );
}


// ================= RENDER DRAWERS =================

function renderDrawers() {
  if (!drawerContainer) return;

  if (!currentUser) {
    drawerContainer.innerHTML = `
      <div class="empty-state">
        🔐 Please sign in with Google to use your Medical Drawer.
      </div>
    `;
    return;
  }

  if (drawers.length === 0) {
    drawerContainer.innerHTML = `
      <div class="empty-state">
        🗄️ No drawers yet.<br>
        Tap <b>➕ Add Drawer</b> to create your first drawer.
      </div>
    `;
    return;
  }

  drawerContainer.innerHTML = "";

  drawers.forEach(drawer => {
    const drawerMedicines = medicines.filter(
      medicine => medicine.drawerId === drawer.id
    );

    const card = document.createElement("div");
    card.className = "drawer-card";

    card.innerHTML = `
      <div class="drawer-card-header">
        <div>
          <h3>🗄️ ${escapeHtml(drawer.name)}</h3>
          <small>
            ${drawerMedicines.length}
            ${drawerMedicines.length === 1 ? "medicine" : "medicines"}
          </small>
        </div>

        <div class="drawer-actions">
          <button
            type="button"
            class="edit-drawer-btn"
            data-id="${escapeHtml(drawer.id)}">
            ✏️
          </button>

          <button
            type="button"
            class="delete-drawer-btn"
            data-id="${escapeHtml(drawer.id)}">
            🗑️
          </button>
        </div>
      </div>

      <div class="drawer-medicines">
        ${
          drawerMedicines.length === 0
            ? `<div class="empty-medicine">
                 No medicines in this drawer.
               </div>`
            : drawerMedicines.map(medicineCard).join("")
        }
      </div>

      <button
        type="button"
        class="add-medicine-btn"
        data-drawer-id="${escapeHtml(drawer.id)}">
        ➕ Add Medicine
      </button>
    `;

    drawerContainer.appendChild(card);
  });
}


// ================= MEDICINE CARD =================

function medicineCard(medicine) {
  const photo = medicine.image || "";

  return `
    <div class="medicine-card">

      ${
        photo
          ? `
            <img
              src="${photo}"
              alt="${escapeHtml(medicine.name)}"
              class="medicine-thumb"
              data-image="${photo}">
          `
          : `
            <div class="medicine-no-photo">💊</div>
          `
      }

      <div class="medicine-info">
        <h4>
          ${escapeHtml(medicine.name || "Unnamed medicine")}
        </h4>

        ${
          medicine.company
            ? `<p><b>Company:</b>
                ${escapeHtml(medicine.company)}
               </p>`
            : ""
        }

        ${
          medicine.salt
            ? `<p><b>Salt:</b>
                ${escapeHtml(medicine.salt)}
               </p>`
            : ""
        }
      </div>

      <div class="medicine-actions">
        <button
          type="button"
          class="edit-medicine-btn"
          data-id="${escapeHtml(medicine.id)}">
          ✏️
        </button>

        <button
          type="button"
          class="delete-medicine-btn"
          data-id="${escapeHtml(medicine.id)}">
          🗑️
        </button>
      </div>

    </div>
  `;
}


// ================= ADD DRAWER =================

addDrawerBtn?.addEventListener("click", () => {
  if (!currentUser) {
    alert("Please sign in with Google first.");
    return;
  }

  editingDrawerId = null;

  if (drawerNameInput) {
    drawerNameInput.value = "";
  }

  openModal(drawerModal);

  setTimeout(() => drawerNameInput?.focus(), 100);
});


// ================= CLOSE DRAWER =================

closeDrawerModal?.addEventListener("click", () => {
  editingDrawerId = null;
  closeModal(drawerModal);
});

drawerModal?.addEventListener("click", event => {
  if (event.target === drawerModal) {
    closeModal(drawerModal);
  }
});


// ================= SAVE DRAWER =================

saveDrawerBtn?.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const name = drawerNameInput?.value.trim();

  if (!name) {
    alert("Please enter drawer name.");
    return;
  }

  if (name.length > 50) {
    alert("Drawer name is too long.");
    return;
  }

  saveDrawerBtn.disabled = true;
  saveDrawerBtn.textContent = "⏳ Saving...";

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
          name,
          updatedAt: Date.now()
        },
        { merge: true }
      );

    } else {

      await addDoc(
        drawersCollection(),
        {
          name,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      );
    }

    closeModal(drawerModal);
    editingDrawerId = null;

    await loadDrawers();
    renderDrawers();

  } catch (error) {
    console.error("Save drawer error:", error);
    alert("Could not save drawer:\n" + error.message);

  } finally {
    saveDrawerBtn.disabled = false;
    saveDrawerBtn.textContent = "💾 Save Drawer";
   }
 });

// ============================================================
// PART 3 - DRAWER ACTIONS + MEDICINE MODALS
// ============================================================


// ================= DRAWER CONTAINER ACTIONS =================

drawerContainer?.addEventListener("click", async event => {

  const editDrawerButton =
    event.target.closest(".edit-drawer-btn");

  const deleteDrawerButton =
    event.target.closest(".delete-drawer-btn");

  const addMedicineButton =
    event.target.closest(".add-medicine-btn");

  const editMedicineButton =
    event.target.closest(".edit-medicine-btn");

  const deleteMedicineButton =
    event.target.closest(".delete-medicine-btn");

  const image =
    event.target.closest(".medicine-thumb");


  // ================= EDIT DRAWER =================

  if (editDrawerButton) {
    const id = editDrawerButton.dataset.id;

    const drawer =
      drawers.find(item => item.id === id);

    if (!drawer) return;

    editingDrawerId = id;

    if (drawerNameInput) {
      drawerNameInput.value = drawer.name || "";
    }

    openModal(drawerModal);

    setTimeout(() => drawerNameInput?.focus(), 100);

    return;
  }


  // ================= DELETE DRAWER =================

  if (deleteDrawerButton) {
    const id = deleteDrawerButton.dataset.id;

    const drawer =
      drawers.find(item => item.id === id);

    if (!drawer) return;

    const drawerMedicines =
      medicines.filter(item => item.drawerId === id);

    let message =
      `Delete drawer "${drawer.name}"?`;

    if (drawerMedicines.length > 0) {
      message +=
        `\n\nThis drawer contains ${drawerMedicines.length} medicine(s).` +
        `\nThey will also be deleted.`;
    }

    if (!confirm(message)) return;

    try {

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

      await loadData();

    } catch (error) {
      console.error(error);
      alert(
        "Could not delete drawer:\n" +
        error.message
      );
    }

    return;
  }


  // ================= ADD MEDICINE =================

  if (addMedicineButton) {
    openAddMedicineModal(
      addMedicineButton.dataset.drawerId
    );
    return;
  }


  // ================= EDIT MEDICINE =================

  if (editMedicineButton) {
    openEditMedicineModal(
      editMedicineButton.dataset.id
    );
    return;
  }


  // ================= DELETE MEDICINE =================

  if (deleteMedicineButton) {
    const id = deleteMedicineButton.dataset.id;

    const medicine =
      medicines.find(item => item.id === id);

    if (!medicine) return;

    if (
      !confirm(
        `Delete medicine "${medicine.name}"?`
      )
    ) {
      return;
    }

    try {

      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "medicines",
          id
        )
      );

      await loadMedicines();
      renderDrawers();

      if (searchInput?.value.trim()) {
        renderSearchResults(searchInput.value);
      }

    } catch (error) {
      console.error(error);
      alert(
        "Could not delete medicine:\n" +
        error.message
      );
    }

    return;
  }


  // ================= OPEN PHOTO =================

  if (image) {
    openImageViewer(image.dataset.image);
  }
});


// ================= OPEN ADD MEDICINE =================

function openAddMedicineModal(drawerId) {

  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  medicineDrawerId = drawerId;
  editingMedicineId = null;

  const nameInput =
    getMedicineNameInput();

  if (nameInput) {
    nameInput.value = "";
  }

  if (medicineCompanyInput) {
    medicineCompanyInput.value = "";
  }

  if (medicineSaltInput) {
    medicineSaltInput.value = "";
  }

  if (medicineIdInput) {
    medicineIdInput.value = "";
  }

  selectedMedicineImage = "";

  if (medicineImageInput) {
    medicineImageInput.value = "";
  }

  resetImagePreview();

  openModal(medicineModal);

  setTimeout(() => nameInput?.focus(), 100);
}


// ================= OPEN EDIT MEDICINE =================

function openEditMedicineModal(id) {

  const medicine =
    medicines.find(item => item.id === id);

  if (!medicine) return;

  editingMedicineId = id;
  medicineDrawerId = medicine.drawerId;

  const nameInput =
    getMedicineNameInput();

  if (nameInput) {
    nameInput.value =
      medicine.name || "";
  }

  if (medicineCompanyInput) {
    medicineCompanyInput.value =
      medicine.company || "";
  }

  if (medicineSaltInput) {
    medicineSaltInput.value =
      medicine.salt || "";
  }

  if (medicineIdInput) {
    medicineIdInput.value = id;
  }

  selectedMedicineImage =
    medicine.image || "";

  if (medicineImageInput) {
    medicineImageInput.value = "";
  }

  if (selectedMedicineImage) {
    showImagePreview(
      selectedMedicineImage
    );
  } else {
    resetImagePreview();
  }

  openModal(medicineModal);
}


// ================= CLOSE MEDICINE MODAL =================

closeMedicineModal?.addEventListener("click", () => {

  editingMedicineId = null;
  medicineDrawerId = null;

  closeModal(medicineModal);
});

medicineModal?.addEventListener("click", event => {

  if (event.target === medicineModal) {
    closeModal(medicineModal);
  }
});


// ================= ESC KEY =================

document.addEventListener("keydown", event => {

  if (event.key !== "Escape") return;

  closeModal(drawerModal);
  closeModal(medicineModal);
  closeModal(imageViewer);
});

// ============================================================
// PART 4 - PHOTO + SAVE MEDICINE
// Firebase Storage is NOT USED.
// Photo is compressed and saved in Firestore.
// ============================================================


// ================= COMPRESS IMAGE =================

function compressImage(file) {

  return new Promise((resolve, reject) => {

    if (!file) {
      reject(new Error("No image selected."));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select an image."));
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {

      const img = new Image();

      img.onload = () => {

        const maxWidth = 1000;
        const maxHeight = 1000;

        let width = img.width;
        let height = img.height;

        const scale = Math.min(
          1,
          maxWidth / width,
          maxHeight / height
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        context.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        let quality = 0.75;

        let result =
          canvas.toDataURL(
            "image/jpeg",
            quality
          );

        while (
          result.length > 450000 &&
          quality > 0.35
        ) {

          quality -= 0.05;

          result =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );
        }

        if (result.length > 700000) {
          reject(
            new Error(
              "Image is too large. Please choose a smaller photo."
            )
          );
          return;
        }

        resolve(result);
      };

      img.onerror = () => {
        reject(
          new Error("Could not read image.")
        );
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(
        new Error("Could not read selected file.")
      );
    };

    reader.readAsDataURL(file);
  });
}


// ================= PHOTO INPUT =================

medicineImageInput?.addEventListener(
  "change",
  async () => {

    const file =
      medicineImageInput.files?.[0];

    if (!file) return;

    try {

      saveMedicineBtn.disabled = true;
      saveMedicineBtn.textContent =
        "⏳ Preparing photo...";

      const compressed =
        await compressImage(file);

      selectedMedicineImage =
        compressed;

      showImagePreview(compressed);

    } catch (error) {

      console.error(error);

      alert(
        error.message ||
        "Could not process image."
      );

      medicineImageInput.value = "";
      selectedMedicineImage = "";

      resetImagePreview();

    } finally {

      saveMedicineBtn.disabled = false;
      saveMedicineBtn.textContent =
        "💾 Save Medicine";
    }
  }
);


// ================= IMAGE PREVIEW =================

function showImagePreview(src) {

  if (!imagePreview) return;

  imagePreview.src = src;
  imagePreview.classList.remove("hidden");
}


function resetImagePreview() {

  if (!imagePreview) return;

  imagePreview.src = "";
  imagePreview.classList.add("hidden");
}


// ================= SAVE MEDICINE =================

saveMedicineBtn?.addEventListener(
  "click",
  async () => {

    if (!currentUser) {
      alert(
        "Please sign in with Google first."
      );
      return;
    }

    const nameInput =
      getMedicineNameInput();

    const name =
      nameInput?.value.trim() || "";

    const company =
      medicineCompanyInput?.value.trim() || "";

    const salt =
      medicineSaltInput?.value.trim() || "";


    if (!medicineDrawerId) {
      alert("Please select a drawer.");
      return;
    }

    if (!name) {
      alert("Please enter medicine name.");
      nameInput?.focus();
      return;
    }

    if (name.length > 100) {
      alert("Medicine name is too long.");
      return;
    }


    saveMedicineBtn.disabled = true;
    saveMedicineBtn.textContent =
      "⏳ Saving...";


    try {

      const medicineData = {

        name,
        nameLower: normalizeText(name),

        company,
        companyLower:
          normalizeText(company),

        salt,
        saltLower:
          normalizeText(salt),

        drawerId:
          medicineDrawerId,

        // Compressed Base64 image.
        // Firebase Storage is NOT used.
        image:
          selectedMedicineImage || "",

        updatedAt:
          Date.now()
      };


      if (editingMedicineId) {

        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "medicines",
            editingMedicineId
          ),
          medicineData,
          { merge: true }
        );

      } else {

        await addDoc(
          medicinesCollection(),
          {
            ...medicineData,
            createdAt: Date.now()
          }
        );
      }


      closeModal(medicineModal);

      editingMedicineId = null;
      medicineDrawerId = null;
      selectedMedicineImage = "";

      await loadMedicines();

      renderDrawers();

      if (searchInput?.value.trim()) {
        renderSearchResults(
          searchInput.value
        );
      }

    } catch (error) {

      console.error(
        "Save medicine error:",
        error
      );

      alert(
        "Could not save medicine:\n" +
        error.message
      );

    } finally {

      saveMedicineBtn.disabled = false;
      saveMedicineBtn.textContent =
        "💾 Save Medicine";
    }
  }
);

// ============================================================
// PART 5 - SEARCH + IMAGE VIEWER + BACKUP
// ============================================================


// ================= SEARCH =================

searchInput?.addEventListener(
  "input",
  () => {

    const query =
      searchInput.value.trim();

    if (!query) {

      if (searchResults) {
        searchResults.innerHTML = "";
      }

      return;
    }

    renderSearchResults(query);
  }
);


// ================= RENDER SEARCH =================

function renderSearchResults(query) {

  if (!searchResults) return;

  const search =
    normalizeText(query);

  if (!search) {
    searchResults.innerHTML = "";
    return;
  }


  const results =
    medicines.filter(medicine => {

      const name =
        normalizeText(medicine.name);

      const company =
        normalizeText(medicine.company);

      const salt =
        normalizeText(medicine.salt);

      return (
        name.includes(search) ||
        company.includes(search) ||
        salt.includes(search)
      );
    });


  if (results.length === 0) {

    searchResults.innerHTML = `
      <div class="search-empty">
        🔍 No medicine found for
        "<b>${escapeHtml(query)}</b>"
      </div>
    `;

    return;
  }


  searchResults.innerHTML = `
    <div class="search-title">
      🔎 Search results
    </div>

    ${results.map(medicine => {

      const drawer =
        drawers.find(
          item =>
            item.id === medicine.drawerId
        );

      const drawerName =
        drawer?.name || "Unknown drawer";


      return `
        <div
          class="search-result-item"
          data-medicine-id="${escapeHtml(medicine.id)}">

          ${
            medicine.image
              ? `
                <img
                  src="${medicine.image}"
                  alt="${escapeHtml(medicine.name)}"
                  class="search-result-image">
              `
              : `
                <div class="search-result-placeholder">
                  💊
                </div>
              `
          }

          <div class="search-result-info">

            <strong>
              ${escapeHtml(medicine.name)}
            </strong>

            ${
              medicine.company
                ? `
                  <span>
                    ${escapeHtml(medicine.company)}
                  </span>
                `
                : ""
            }

            <small>
              🗄️ ${escapeHtml(drawerName)}
            </small>

          </div>
        </div>
      `;

    }).join("")}
  `;
}


// ================= SEARCH RESULT CLICK =================

searchResults?.addEventListener(
  "click",
  event => {

    const item =
      event.target.closest(
        ".search-result-item"
      );

    if (!item) return;

    const id =
      item.dataset.medicineId;

    const medicine =
      medicines.find(
        medicine => medicine.id === id
      );

    if (!medicine) return;


    const drawer =
      drawers.find(
        drawer =>
          drawer.id === medicine.drawerId
      );


    if (drawer) {

      const drawerElement =
        [...document.querySelectorAll(
          ".drawer-card"
        )].find(card => {

          const button =
            card.querySelector(
              `.add-medicine-btn[data-drawer-id="${drawer.id}"]`
            );

          return !!button;
        });


      drawerElement?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }


    openEditMedicineModal(
      medicine.id
    );
  }
);


// ================= IMAGE VIEWER =================

function openImageViewer(src) {

  if (!imageViewer || !zoomedImage) {
    return;
  }

  zoomedImage.src = src;

  openModal(imageViewer);
}


closeImageViewer?.addEventListener(
  "click",
  () => {

    closeModal(imageViewer);

    if (zoomedImage) {
      zoomedImage.src = "";
    }
  }
);


imageViewer?.addEventListener(
  "click",
  event => {

    if (event.target === imageViewer) {

      closeModal(imageViewer);

      if (zoomedImage) {
        zoomedImage.src = "";
      }
    }
  }
);


// ================= EXPORT BACKUP =================

function exportBackup() {

  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }


  const backup = {

    app: "My Medical Drawer",

    version: 1,

    exportedAt:
      new Date().toISOString(),

    user: {
      uid: currentUser.uid,
      email:
        currentUser.email || ""
    },

    drawers,

    medicines
  };


  const json =
    JSON.stringify(
      backup,
      null,
      2
    );


  const blob =
    new Blob(
      [json],
      {
        type: "application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `my-medical-drawer-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;


  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


// ================= OPTIONAL EXPORT BUTTON =================

const exportBtn =
  document.getElementById("exportBtn");

exportBtn?.addEventListener(
  "click",
  exportBackup
);


// ================= INITIAL UI =================

renderDrawers();

console.log(
  "My Medical Drawer loaded successfully."
);

console.log(
  "Google Auth: signInWithPopup"
);

console.log(
  "Persistence: browserLocalPersistence"
);

console.log(
  "Firebase Storage: NOT USED"
);

