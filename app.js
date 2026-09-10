// ===============================
// MEDICINE DRAWER - FIREBASE APP
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
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Persistence error:", error);
  });

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


// ===============================
// APP DATA
// ===============================

let currentUser = null;
let drawers = [];
let medicines = [];


// ===============================
// GOOGLE LOGIN
// ===============================

loginBtn?.addEventListener("click", async () => {

  try {

    await signInWithRedirect(auth, provider);

  } catch (error) {

    console.error(error);

    alert("Login error: " + error.message);

  }

});


// ===============================
// LOGOUT
// ===============================

loginBtn?.addEventListener("click", async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google login error:", error);
    alert("Google login error: " + error.message);
  }
});


// ===============================
// REDIRECT LOGIN RESULT
// ===============================
// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (user) {

    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");

    await loadData();

  } else {

    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");

    drawers = [];
    medicines = [];

    renderDrawers();

  }

});


// ===============================
// FIRESTORE REFERENCES
// ===============================

function drawersRef() {

  return collection(db, "users", currentUser.uid, "drawers");

}


function medicinesRef() {

  return collection(db, "users", currentUser.uid, "medicines");

}


// ===============================
// LOAD DATA
// ===============================

async function loadData() {

  if (!currentUser) return;

  try {

    const drawerSnapshot = await getDocs(drawersRef());

    drawers = drawerSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));


    const medicineSnapshot = await getDocs(medicinesRef());

    medicines = medicineSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));


    renderDrawers();

  } catch (error) {

    console.error(error);

    alert("Data load nahi ho raha: " + error.message);

  }

}


// ===============================
// ADD DRAWER
// ===============================

addDrawerBtn?.addEventListener("click", async () => {

  if (!currentUser) {

    alert("Pehle Google se Sign in karo.");

    return;

  }


  const name = prompt("Drawer ka naam likho:");

  if (!name || !name.trim()) return;


  try {

    const drawerDoc = await addDoc(drawersRef(), {

      name: name.trim(),

      createdAt: Date.now()

    });


    drawers.push({

      id: drawerDoc.id,

      name: name.trim(),

      createdAt: Date.now()

    });


    renderDrawers();

  } catch (error) {

    console.error(error);

    alert("Drawer save nahi hua: " + error.message);

  }

});


// ===============================
// RENDER DRAWERS
// ===============================

function renderDrawers() {

  if (!drawerContainer) return;

  drawerContainer.innerHTML = "";


  if (!currentUser) {

    drawerContainer.innerHTML = `
      <div class="empty-state">
        🔐 Google Sign in karke apne drawers dekho.
      </div>
    `;

    return;

  }


  if (drawers.length === 0) {

    drawerContainer.innerHTML = `
      <div class="empty-state">
        🗄️ Abhi koi drawer nahi hai.<br>
        <small>+ Add Drawer दबाकर पहला drawer बनाओ.</small>
      </div>
    `;

    return;

  }


  drawers.forEach(drawer => {

    const medicinesInDrawer = medicines.filter(
      medicine => medicine.drawerId === drawer.id
    );


    const drawerBox = document.createElement("div");

    drawerBox.className = "drawer-card";


    drawerBox.innerHTML = `

      <div class="drawer-title">

        <h3>🗄️ ${escapeHtml(drawer.name)}</h3>

        <div class="drawer-actions">

          <button class="add-med-btn">
            ➕ Medicine
          </button>

          <button class="edit-drawer-btn">
            ✏️
          </button>

          <button class="delete-drawer-btn">
            🗑️
          </button>

        </div>

      </div>


      <div class="medicine-list">

        ${
          medicinesInDrawer.length === 0

          ? `<p class="empty-medicine">
               Is drawer me abhi medicine nahi hai.
             </p>`

          : medicinesInDrawer.map(medicine => `

              <div class="medicine-card">

                ${
                  medicine.image
                  ? `<img
                       src="${medicine.image}"
                       class="medicine-image"
                       data-image="${medicine.image}"
                     >`
                  : `<div class="no-image">💊</div>`
                }


                <div class="medicine-info">

                  <h4>${escapeHtml(medicine.name || "")}</h4>

                  <p>
                    Company:
                    ${escapeHtml(medicine.company || "-")}
                  </p>

                  <p>
                    Salt:
                    ${escapeHtml(medicine.salt || "-")}
                  </p>

                </div>


                <div class="medicine-actions">

                  <button
                    class="edit-med-btn"
                    data-id="${medicine.id}">
                    ✏️
                  </button>

                  <button
                    class="delete-med-btn"
                    data-id="${medicine.id}">
                    🗑️
                  </button>

                </div>

              </div>

          `).join("")
        }

      </div>

    `;


    // ADD MEDICINE

    drawerBox
      .querySelector(".add-med-btn")
      ?.addEventListener("click", () => {

        addMedicine(drawer.id);

      });


    // EDIT DRAWER

    drawerBox
      .querySelector(".edit-drawer-btn")
      ?.addEventListener("click", async () => {

        const newName = prompt(
          "Drawer ka naya naam:",
          drawer.name
        );

        if (!newName || !newName.trim()) return;


        await setDoc(
          doc(db, "users", currentUser.uid, "drawers", drawer.id),
          {
            name: newName.trim()
          },
          { merge: true }
        );


        drawer.name = newName.trim();

        renderDrawers();

      });


    // DELETE DRAWER

    drawerBox
      .querySelector(".delete-drawer-btn")
      ?.addEventListener("click", async () => {

        const medicinesToDelete = medicines.filter(
          m => m.drawerId === drawer.id
        );


        const ok = confirm(
          `"${drawer.name}" drawer delete karna hai?\n\nIske andar ki medicines bhi delete hongi.`
        );


        if (!ok) return;


        try {

          await deleteDoc(
            doc(db, "users", currentUser.uid, "drawers", drawer.id)
          );


          for (const medicine of medicinesToDelete) {

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


          drawers = drawers.filter(
            d => d.id !== drawer.id
          );


          medicines = medicines.filter(
            m => m.drawerId !== drawer.id
          );


          renderDrawers();

        } catch (error) {

          console.error(error);

          alert("Delete error: " + error.message);

        }

      });


    // EDIT MEDICINE

    drawerBox
      .querySelectorAll(".edit-med-btn")
      .forEach(button => {

        button.addEventListener("click", () => {

          const medicine = medicines.find(
            m => m.id === button.dataset.id
          );

          if (medicine) {

            editMedicine(medicine);

          }

        });

      });


    // DELETE MEDICINE

    drawerBox
      .querySelectorAll(".delete-med-btn")
      .forEach(button => {

        button.addEventListener("click", async () => {

          const medicine = medicines.find(
            m => m.id === button.dataset.id
          );

          if (!medicine) return;


          if (!confirm(
            `"${medicine.name}" delete karni hai?`
          )) return;


          await deleteDoc(
            doc(
              db,
              "users",
              currentUser.uid,
              "medicines",
              medicine.id
            )
          );


          medicines = medicines.filter(
            m => m.id !== medicine.id
          );


          renderDrawers();

        });

      });


    // IMAGE CLICK / ZOOM

    drawerBox
      .querySelectorAll(".medicine-image")
      .forEach(img => {

        img.addEventListener("click", () => {

          openImage(img.dataset.image);

        });

      });


    drawerContainer.appendChild(drawerBox);

  });

}


// ===============================
// ADD MEDICINE
// ===============================

async function addMedicine(drawerId) {

  if (!currentUser) return;


  const name = prompt("Medicine ka naam:");

  if (!name || !name.trim()) return;


  const company = prompt("Company:");

  const salt = prompt("Salt / Composition:");


  let image = "";


  const imageUrl = prompt(
    "Agar photo ka URL hai to paste karo, warna Cancel dabao:"
  );


  if (imageUrl) {

    image = imageUrl.trim();

  }


  try {

    const medicineDoc = await addDoc(medicinesRef(), {

      name: name.trim(),

      company: company?.trim() || "",

      salt: salt?.trim() || "",

      drawerId: drawerId,

      image: image,

      createdAt: Date.now()

    });


    medicines.push({

      id: medicineDoc.id,

      name: name.trim(),

      company: company?.trim() || "",

      salt: salt?.trim() || "",

      drawerId: drawerId,

      image: image,

      createdAt: Date.now()

    });


    renderDrawers();

  } catch (error) {

    console.error(error);

    alert("Medicine save nahi hui: " + error.message);

  }

}


// ===============================
// EDIT MEDICINE
// ===============================

async function editMedicine(medicine) {

  const name = prompt(
    "Medicine name:",
    medicine.name
  );

  if (!name || !name.trim()) return;


  const company = prompt(
    "Company:",
    medicine.company || ""
  );


  const salt = prompt(
    "Salt / Composition:",
    medicine.salt || ""
  );


  try {

    await setDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "medicines",
        medicine.id
      ),
      {

        name: name.trim(),

        company: company?.trim() || "",

        salt: salt?.trim() || ""

      },
      { merge: true }
    );


    medicine.name = name.trim();

    medicine.company = company?.trim() || "";

    medicine.salt = salt?.trim() || "";


    renderDrawers();

  } catch (error) {

    console.error(error);

    alert("Update error: " + error.message);

  }

}


// ===============================
// SEARCH
// ===============================

searchInput?.addEventListener("input", () => {

  const text = searchInput.value
    .trim()
    .toLowerCase();


  if (!text) {

    searchResults.innerHTML = "";

    return;

  }


  const results = medicines.filter(medicine => {

    const name = (medicine.name || "").toLowerCase();

    const company = (medicine.company || "").toLowerCase();

    const salt = (medicine.salt || "").toLowerCase();


    return (
      name.includes(text) ||
      company.includes(text) ||
      salt.includes(text)
    );

  });


  if (results.length === 0) {

    searchResults.innerHTML = `
      <div class="search-result">
        ❌ Medicine nahi mili.
      </div>
    `;

    return;

  }


  searchResults.innerHTML = results.map(medicine => {

    const drawer = drawers.find(
      d => d.id === medicine.drawerId
    );


    return `

      <div class="search-result">

        <strong>
          💊 ${escapeHtml(medicine.name)}
        </strong>

        <span>
          📍 Drawer:
          ${escapeHtml(drawer?.name || "Unknown")}
        </span>

      </div>

    `;

  }).join("");

});


// ===============================
// IMAGE VIEWER
// ===============================

function openImage(src) {

  let viewer = document.getElementById("imageViewer");

  let image = document.getElementById("zoomedImage");


  if (!viewer) {

    viewer = document.createElement("div");

    viewer.id = "imageViewer";

    viewer.className = "image-viewer";


    viewer.innerHTML = `

      <div class="image-viewer-inner">

        <button id="closeImageViewer">
          ✕
        </button>

        <img id="zoomedImage">

      </div>

    `;


    document.body.appendChild(viewer);


    document
      .getElementById("closeImageViewer")
      .addEventListener("click", () => {

        viewer.classList.remove("show");

      });

  }


  image = document.getElementById("zoomedImage");

  image.src = src;

  viewer.classList.add("show");

}


// ===============================
// HTML SAFETY
// ===============================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

      }
