import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDoc,
  getDocs,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let unsubscribe = null;

// DOM elements
const sidebarButton = document.querySelector(".sidebarButton");
const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const links = document.querySelectorAll(".sidebar .link");
const sections = document.querySelectorAll(".content .section");
const pageTitle = document.getElementById("pageTitle");
const profileSection = document.getElementById("profileSection");
const gradesContainer = document.getElementById("gradesContainer");

// Grade CSS class
function getGradeClass(grade) {
  const scaled = Math.round(grade * 10);
  return `grade-${Math.floor(scaled / 10)}-${scaled % 10}`;
}

// Date formatting
function formatDate(timestamp) {
  if (!timestamp) return "Sana yo'q";
  try {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString("uz-UZ");
    }
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("uz-UZ");
    }
  } catch (error) {
    console.error("Date formatting error:", error);
  }
  return "Sana yo'q";
}

// Render grades
function renderGrades(grades) {
  if (!grades || grades.length === 0) {
    gradesContainer.innerHTML =
      '<div class="no-grades">Hozircha baholar yo\'q</div>';
    return;
  }

  const gradesGrid = document.createElement("div");
  gradesGrid.className = "grades-grid";

  grades.forEach((grade, index) => {
    let gradeValue = grade.grade ?? grade.reward ?? 0;
    if (gradeValue > 1) gradeValue = gradeValue / 5;
    gradeValue = Math.max(0, Math.min(1, gradeValue)); // stays 0–1

    const subject = grade.subject || `Fan ${index + 1}`;
    const date = formatDate(grade.createdAt);

    const gradeCard = document.createElement("div");
    gradeCard.className = `grade-card ${getGradeClass(gradeValue)}`;
    gradeCard.innerHTML = `
      <div class="grade-value">${gradeValue.toFixed(2)}</div>
      <div class="grade-subject">${subject}</div>
      <div class="grade-date">${date}</div>
    `;

    gradesGrid.appendChild(gradeCard);
  });

  gradesContainer.innerHTML = "";
  gradesContainer.appendChild(gradesGrid);
}

// Update stats (✅ only average ×10)
function updateStats(grades) {
  const averageGradeEl = document.getElementById("averageGrade");
  const totalSubjectsEl = document.getElementById("totalSubjects");
  const totalGradesEl = document.getElementById("totalGrades");

  if (!grades || grades.length === 0) {
    averageGradeEl.textContent = "0.00";
    totalSubjectsEl.textContent = "0";
    totalGradesEl.textContent = "0";
    return;
  }

  const validGrades = grades.map((g) => {
    let value = g.grade ?? g.reward ?? 0;
    if (value > 1) value = value / 5;
    return Math.max(0, Math.min(1, value));
  });

  const average =
    validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;

  // 🔑 only here → multiply by 10
  averageGradeEl.textContent = (average * 10).toFixed(2);

  const uniqueSubjects = new Set(grades.map((g) => g.subject || "Unknown"));
  totalSubjectsEl.textContent = uniqueSubjects.size.toString();
  totalGradesEl.textContent = grades.length.toString();
}

// Load user data
function loadUserData(user) {
  if (unsubscribe) unsubscribe();
  const userRef = doc(db, "users", user.uid);
  unsubscribe = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const userInfoEl = document.getElementById("accaunt");
        const userProfilePic = document.querySelector(".userProfilePic");
        const cardHolder = document.getElementById("cardHolder");
        const cardBalance = document.getElementById("cardBalance");
        const cardNumberEl = document.getElementById("cardNumber");
        if (cardNumberEl) {
          cardNumberEl.textContent = userData.balanceId || "000-XXX-000";
        }

        const fullName =
          userData.fullName || userData.email || user.email || "Foydalanuvchi";

        if (userInfoEl) userInfoEl.textContent = fullName;
        if (userProfilePic && fullName)
          userProfilePic.textContent = fullName.charAt(0).toUpperCase();
        if (cardHolder) cardHolder.textContent = fullName.toUpperCase();
        if (cardBalance)
          cardBalance.textContent = `${userData.balance || 0} ESHIM`;

        const grades = userData.grades || [];
        renderGrades(grades);
        updateStats(grades);
      } else {
        gradesContainer.innerHTML =
          '<div class="error">Foydalanuvchi ma\'lumotlari topilmadi</div>';
      }
    },
    (error) => {
      gradesContainer.innerHTML =
        '<div class="error">Ma\'lumotlarni yuklashda xatolik: ' +
        error.message +
        "</div>";
    }
  );
}

// Leaderboard
function loadLeaderboard() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("balance", "desc"));
  const tableBody = document.querySelector("#balanceTable tbody");
  const userRankEl = document.getElementById("userRank");
  const userBalanceEl = document.getElementById("userBalance");

  onSnapshot(
    q,
    (snapshot) => {
      tableBody.innerHTML = "";
      let rank = 1;
      let myRank = "-";
      let myBalance = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = data.fullName || data.email || "Foydalanuvchi";
        const balance = data.balance || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${rank}</td><td>${name}</td><td>${balance}</td>`;

        if (currentUser && docSnap.id === currentUser.uid) {
          tr.style.fontWeight = "bold";
          tr.style.background = "#eef2ff";
          myRank = rank;
          myBalance = balance;
        }

        tableBody.appendChild(tr);
        rank++;
      });

      userRankEl.textContent = myRank;
      userBalanceEl.textContent = myBalance;
    },
    (err) => {
      tableBody.innerHTML = `<tr><td colspan="3">Xatolik: ${err.message}</td></tr>`;
    }
  );
}

// Modal toggle
document.getElementById("payButton")?.addEventListener("click", () => {
  document.getElementById("transferModal").classList.remove("hidden");
});
document.getElementById("closeModal")?.addEventListener("click", () => {
  document.getElementById("transferModal").classList.add("hidden");
});

// Live recipient lookup
const recipientCardInput = document.getElementById("recipientCard");
const recipientNameEl = document.getElementById("recipientName");

recipientCardInput?.addEventListener("blur", async () => {
  const cardNum = recipientCardInput.value.trim().toUpperCase();
  if (!cardNum) return;

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("balanceId", "==", cardNum));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      recipientNameEl.textContent = "❌ Karta egasi topilmadi";
      recipientNameEl.classList.add("error");
      return;
    }

    const recipientData = snapshot.docs[0].data();
    recipientNameEl.textContent = `✅ ${
      recipientData.fullName || "Noma’lum foydalanuvchi"
    }`;
    recipientNameEl.classList.remove("error");
  } catch (err) {
    recipientNameEl.textContent = "Xatolik yuz berdi";
    recipientNameEl.classList.add("error");
  }
});

// Transfer form
document.getElementById("transferForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const recipientCard = document
    .getElementById("recipientCard")
    .value.trim()
    .toUpperCase();
  const amount = parseFloat(document.getElementById("transferAmount").value);

  if (!recipientCard || isNaN(amount) || amount <= 0) {
    return alert("Ma’lumotlar noto‘g‘ri kiritildi!");
  }

  try {
    const senderRef = doc(db, "users", currentUser.uid);
    const senderSnap = await getDoc(senderRef);
    if (!senderSnap.exists()) return alert("Sizning akkauntingiz topilmadi!");

    const senderData = senderSnap.data();
    if ((senderData.balance || 0) < amount)
      return alert("Balansda yetarli mablag‘ yo‘q!");

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("balanceId", "==", recipientCard));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return alert("Qabul qiluvchi topilmadi!");

    const recipientDoc = snapshot.docs[0];
    const recipientRef = doc(db, "users", recipientDoc.id);
    const recipientData = recipientDoc.data();

    await updateDoc(senderRef, {
      balance: (senderData.balance || 0) - amount,
    });
    await updateDoc(recipientRef, {
      balance: (recipientData.balance || 0) + amount,
    });

    alert("Pul muvaffaqiyatli jo‘natildi!");

    document.getElementById("transferModal").classList.add("hidden");
    document.getElementById("transferForm").reset();
    loadUserData(currentUser);
  } catch (error) {
    alert("Xatolik: " + error.message);
  }
});

// Sidebar toggle
sidebarButton.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  content.classList.toggle("expanded");
});

// Section nav
links.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetSection = link.getAttribute("data-section");
    if (!targetSection) return;
    links.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    sections.forEach((section) => {
      section.classList.remove("active");
      section.classList.add("hidden");
    });
    const targetEl = document.querySelector(`.section.${targetSection}`);
    if (targetEl) {
      targetEl.classList.remove("hidden");
      setTimeout(() => targetEl.classList.add("active"), 10);
    }
    const titles = {
      grades: "Baholar",
      leaderboard: "Reytinglar",
      eshimpay: "EshimPAY",
      settings: "Sozlamalar",
    };
    if (pageTitle && titles[targetSection])
      pageTitle.textContent = titles[targetSection];
  });
});


// Logout
profileSection?.addEventListener("click", async () => {
  if (confirm("Tizimdan chiqmoqchimisiz?")) {
    try {
      if (unsubscribe) unsubscribe();
      await signOut(auth);
      window.location.href = "../index.html";
    } catch (error) {
      alert("Chiqishda xatolik: " + error.message);
    }
  }
});

// Auth observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserData(user);
    loadLeaderboard();
  } else {
    if (unsubscribe) unsubscribe();
    if (!window.location.pathname.includes("index.html")) {
      window.location.href = "../index.html";
    }
  }
});
