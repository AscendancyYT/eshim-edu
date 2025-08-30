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
  onSnapshot,
  collection,
  query,
  orderBy,
  getDoc,
  getDocs,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Grade CSS class
function getGradeClass(grade) {
  const scaled = Math.round(grade * 10);
  return `grade-${Math.floor(scaled / 10)}-${scaled % 10}`;
}

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

function renderGrades(grades) {
  const gradesContainer = document.getElementById("gradesContainer");
  if (!gradesContainer) {
    console.warn("Grades container not found in DOM");
    return;
  }

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
    gradeValue = Math.max(0, Math.min(1, gradeValue));

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

function updateStats(grades) {
  const averageGradeEl = document.getElementById("averageGrade");
  const totalSubjectsEl = document.getElementById("totalSubjects");
  const totalGradesEl = document.getElementById("totalGrades");

  if (!averageGradeEl || !totalSubjectsEl || !totalGradesEl) {
    console.warn("Stats elements not found in DOM");
    return;
  }

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

  averageGradeEl.textContent = (average * 10).toFixed(2);

  const uniqueSubjects = new Set(grades.map((g) => g.subject || "Unknown"));
  totalSubjectsEl.textContent = uniqueSubjects.size.toString();
  totalGradesEl.textContent = grades.length.toString();
}

function loadUserData(user) {
  if (unsubscribe) unsubscribe();
  const userRef = doc(db, "users", user.uid);

  unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) {
      const gradesContainer = document.getElementById("gradesContainer");
      if (gradesContainer) {
        gradesContainer.innerHTML =
          '<div class="error">Foydalanuvchi ma\'lumotlari topilmadi</div>';
      }
      return;
    }

    const userData = docSnap.data();
    const fullName =
      userData.fullName || userData.email || user.email || "Foydalanuvchi";
    
    // Safe DOM updates with null checks
    const accountEl = document.getElementById("accaunt");
    if (accountEl) accountEl.textContent = fullName;
    
    const profilePicEl = document.querySelector(".userProfilePic");
    if (profilePicEl) profilePicEl.textContent = fullName.charAt(0).toUpperCase();
    
    const cardHolderEl = document.getElementById("cardHolder");
    if (cardHolderEl) cardHolderEl.textContent = fullName.toUpperCase();
    
    const cardBalanceEl = document.getElementById("cardBalance");
    if (cardBalanceEl) cardBalanceEl.textContent = `${userData.balance || 0} ESHIM`;
    
    const cardNumberEl = document.getElementById("cardNumber");
    if (cardNumberEl) cardNumberEl.textContent = userData.balanceId || "000-XXX-000";

    const grades = userData.grades || [];
    renderGrades(grades);
    updateStats(grades);
    
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = "Baholar";
  });
}

function loadLeaderboard() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("balance", "desc"));
  const tableBody = document.querySelector("#balanceTable tbody");
  const userRankEl = document.getElementById("userRank");
  const userBalanceEl = document.getElementById("userBalance");

  if (!tableBody || !userRankEl || !userBalanceEl) {
    console.warn("Leaderboard elements not found in DOM");
    return;
  }

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
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="3">Xatolik: ${err.message}</td></tr>`;
      }
    }
  );
}

// Initialize all event listeners
function initializeApp1() {
  // Modal handlers
  const payButton = document.getElementById("payButton");
  const closeModal = document.getElementById("closeModal");
  const transferModal = document.getElementById("transferModal");
  
  payButton?.addEventListener("click", () => {
    transferModal?.classList.remove("hidden");
  });
  
  closeModal?.addEventListener("click", () => {
    transferModal?.classList.add("hidden");
  });

  // Recipient card validation
  const recipientCardInput = document.getElementById("recipientCard");
  const recipientNameEl = document.getElementById("recipientName");

  recipientCardInput?.addEventListener("blur", async () => {
    const cardNum = recipientCardInput.value.trim().toUpperCase();
    if (!cardNum || !recipientNameEl) return;

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
        recipientData.fullName || "Noma'lum foydalanuvchi"
      }`;
      recipientNameEl.classList.remove("error");
    } catch (err) {
      if (recipientNameEl) {
        recipientNameEl.textContent = "Xatolik yuz berdi";
        recipientNameEl.classList.add("error");
      }
    }
  });

  // Transfer form handler
  const transferForm = document.getElementById("transferForm");
  transferForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const recipientCard = document
      .getElementById("recipientCard")
      ?.value.trim()
      .toUpperCase();
    const amount = parseFloat(document.getElementById("transferAmount")?.value || "0");

    if (!recipientCard || isNaN(amount) || amount <= 0) {
      return alert("Ma'lumotlar noto'g'ri kiritildi!");
    }

    try {
      const senderRef = doc(db, "users", currentUser.uid);
      const senderSnap = await getDoc(senderRef);
      if (!senderSnap.exists()) return alert("Sizning akkauntingiz topilmadi!");

      const senderData = senderSnap.data();
      if ((senderData.balance || 0) < amount)
        return alert("Balansda yetarli mablag' yo'q!");

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

      alert("Pul muvaffaqiyatli jo'natildi!");

      transferModal?.classList.add("hidden");
      transferForm?.reset();
      if (recipientNameEl) recipientNameEl.textContent = "";
      if (currentUser) loadUserData(currentUser);
    } catch (error) {
      alert("Xatolik: " + error.message);
    }
  });

  // Navigation links
  const links = document.querySelectorAll(".sidebar .link");
  const sections = document.querySelectorAll(".content .section");
  const pageTitle = document.getElementById("pageTitle");

  links?.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute("data-section");
      if (!targetSection) return;
      
      // Close mobile sidebar when clicking a link
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const sidebar = document.querySelector(".sidebar");
        sidebar?.classList.remove("mobile-open");
        document.body.classList.remove('sidebar-open');
      }
      
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      sections?.forEach((section) => {
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

  // Profile section (logout)
  const profileSection = document.getElementById("profileSection");
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
}

// Mobile Sidebar Setup - GUARANTEED TO WORK
function setupMobileSidebar() {
  console.log('🔄 Setting up mobile sidebar...');
  
  const sidebarButton = document.querySelector('.sidebarButton');
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  
  if (!sidebarButton || !sidebar) {
    console.error('❌ Sidebar elements not found!');
    console.log('Button:', !!sidebarButton, 'Sidebar:', !!sidebar);
    return;
  }
  
  console.log('✅ Sidebar elements found');
  
  // Force remove any existing listeners and clone the button
  const newButton = sidebarButton.cloneNode(true);
  sidebarButton.parentNode.replaceChild(newButton, sidebarButton);
  
  // Add the main click handler
  newButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Sidebar button clicked!');
    console.log('📱 Window width:', window.innerWidth);
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      const isOpen = sidebar.classList.contains('mobile-open');
      console.log('📱 Mobile mode - Currently open:', isOpen);
      
      if (isOpen) {
        // Close sidebar
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        console.log('📱 ➡️ Closing sidebar');
      } else {
        // Open sidebar
        sidebar.classList.add('mobile-open');
        document.body.classList.add('sidebar-open');
        console.log('📱 ⬅️ Opening sidebar');
      }
    } else {
      // Desktop mode
      console.log('💻 Desktop mode');
      sidebar.classList.toggle('collapsed');
      if (content) content.classList.toggle('expanded');
    }
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
      if (!sidebar.contains(e.target) && !newButton.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('sidebar-open');
        console.log('📱 🔒 Sidebar closed (clicked outside)');
      }
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('mobile-open');
      document.body.classList.remove('sidebar-open');
      console.log('📱 ➡️ 💻 Switched to desktop - sidebar closed');
    }
  });
  
  console.log('✅ Mobile sidebar setup complete!');
}

// Initialize everything when DOM is ready
function init() {
  console.log('🚀 Initializing dashboard...');
  
  // Setup basic app functionality
  initializeApp1();
  
  // Setup mobile sidebar with delay to ensure DOM is ready
  setTimeout(setupMobileSidebar, 100);
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Firebase auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserData(user);
    loadLeaderboard();
    console.log('👤 User authenticated:', user.email);
  } else {
    if (unsubscribe) unsubscribe();
    if (!window.location.pathname.includes("index.html")) {
      window.location.href = "../index.html";
    }
  }
});