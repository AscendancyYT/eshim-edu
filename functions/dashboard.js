import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  getDocs,
  updateDoc,
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "./index.html";
}

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.appspot.com",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
  databaseURL: "https://eshim-edu-eclipse-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (sel) => document.querySelector(sel);
const setText = (el, t) => { if (el) el.textContent = String(t); };

const userEmailEl = $("#userEmail");
const userPhotoEl = $("#userPhoto");
const userProfilePicEl = $(".userProfilePic");

const gradesSection = $(".section.grades");
const eshimpaySection = $(".section.eshimpay");

const cardNumberEl = $("#cardNumber");
const cardHolderEl = $("#cardHolder");
const cardBalanceEl = $("#cardBalance");

// Payment modal elements
const payButton = $("#payButton");
const paymentModal = $("#paymentModal");
const confirmationModal = $("#confirmationModal");
const closePayModal = $("#closePayModal");
const closeConfirmModal = $("#closeConfirmModal");
const paymentForm = $("#paymentForm");
const recipientCardEl = $("#recipientCard");
const paymentAmountEl = $("#paymentAmount");
const paymentNoteEl = $("#paymentNote");
const paymentStatusEl = $("#paymentStatus");
const confirmationStatusEl = $("#confirmationStatus");
const cancelPaymentBtn = $("#cancelPayment");
const confirmPaymentBtn = $("#confirmPayment");
const cancelConfirmationBtn = $("#cancelConfirmation");
const finalConfirmBtn = $("#finalConfirmPayment");

// Confirmation modal display elements
const confirmRecipientNameEl = $("#confirmRecipientName");
const confirmCardNumberEl = $("#confirmCardNumber");
const confirmAmountEl = $("#confirmAmount");
const confirmNoteEl = $("#confirmNote");

let currentUser = null;
let recipientUser = null;

function formatTimestamp(v) {
  if (!v) return "Mavjud emas";
  if (typeof v.toDate === "function") return v.toDate().toLocaleString();
  if (typeof v === "number") return new Date(v).toLocaleString();
  return "Mavjud emas";
}

async function getUserByFullName(fullName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", fullName));
  const qs = await getDocs(q);
  if (qs.empty) return;

  qs.forEach((docSnap) => {
    const u = docSnap.data();
    if (userEmailEl) setText(userEmailEl, u.email || "—");
    if (userPhotoEl && u.photoURL) userPhotoEl.src = u.photoURL;
    
    // Update credit card display
    if (cardNumberEl) {
      const balanceId = u.balanceId || "Mavjud emas";
      setText(cardNumberEl, balanceId);
    }
    
    if (cardHolderEl) {
      setText(cardHolderEl, (u.fullName || "NOMA'LUM FOYDALANUVCHI").toUpperCase());
    }
    
    if (cardBalanceEl) {
      const balance = u.balance ?? 0;
      setText(cardBalanceEl, `${balance.toLocaleString()} SO'M`);
    }
    
    // Store current user data
    currentUser = u;
  });
}

function formatCardNumber(cardNumber) {
  // Ensure we have a 16-digit number
  const padded = cardNumber.toString().padStart(16, '0');
  // Format as XXXX XXXX XXXX XXXX
  return padded.replace(/(\d{4})(?=\d)/g, '$1 ');
}

const sidebarLinks = document.querySelectorAll(".sidebar .center .link, .sidebar .bottom");
sidebarLinks.forEach((el) => {
  el.addEventListener("click", (ev) => {
    ev.preventDefault();
    const section = el.getAttribute("data-section");
    if (!section) return;
    const map = { grades: gradesSection, eshimpay: eshimpaySection };
    [gradesSection, eshimpaySection].forEach((sec) => {
      if (!sec) return;
      if (sec === map[section]) {
        sec.classList.remove("hidden"); 
        sec.classList.add("active");
      } else {
        sec.classList.add("hidden"); 
        sec.classList.remove("active");
      }
    });
  });
});

// Sidebar toggle functionality
const sidebarButton = document.querySelector(".sidebarButton");
const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");

if (sidebarButton) {
  sidebarButton.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      sidebar?.classList.toggle("active");
    } else {
      sidebar?.classList.toggle("collapsed");
      content?.classList.toggle("expanded");
    }
  });
}

// Handle window resize
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar?.classList.remove("active");
  }
});

// Modal functionality
const modal = document.getElementById("gradeModal");
const closeModal = document.querySelector(".close");

if (closeModal) {
  closeModal.addEventListener("click", () => {
    modal?.classList.remove("show");
    setTimeout(() => {
      if (modal) modal.style.display = "none";
    }, 300);
  });
}

window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal?.classList.remove("show");
    setTimeout(() => {
      if (modal) modal.style.display = "none";
    }, 300);
  }
});

function showModal(subject, reward, createdAt) {
  const modalSubject = document.getElementById("modalSubject");
  const modalReward = document.getElementById("modalReward");
  const modalCreatedAt = document.getElementById("modalCreatedAt");
  
  if (modalSubject) modalSubject.textContent = `Fan: ${subject}`;
  if (modalReward) modalReward.textContent = `Mukofot: ${reward}`;
  if (modalCreatedAt) modalCreatedAt.textContent = `Yaratilgan sana: ${formatTimestamp(createdAt)}`;
  
  if (modal) {
    modal.style.display = "block";
    setTimeout(() => modal.classList.add("show"), 10);
  }
}

// Bootstrap function
(function bootstrap() {
  gradesSection?.classList.remove("hidden");
  gradesSection?.classList.add("active");
  const fullName = localStorage.getItem("fullName") || "";
  if (fullName) getUserByFullName(fullName).catch(console.error);
  if (userProfilePicEl) {
    const initial = (fullName || "F").trim()[0] || "F";
    userProfilePicEl.innerHTML = initial.toUpperCase();
  }
})();

// Load grades/coins data
async function loadGrades() {
  const fullName = localStorage.getItem("fullName");
  if (!fullName) return;

  try {
    const q = fsQuery(collection(db, "grades"), where("studentName", "==", fullName));
    const querySnapshot = await getDocs(q);
    
    const coinsContainer = document.querySelector(".coins");
    if (!coinsContainer) return;
    
    coinsContainer.innerHTML = "";
    
    if (querySnapshot.empty) {
      coinsContainer.innerHTML = '<p>Hozircha baholar mavjud emas.</p>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const grade = doc.data();
      const coin = document.createElement("li");
      coin.className = "coin";
      coin.textContent = grade.grade || "?";
      coin.style.backgroundColor = getGradeColor(grade.grade);
      
      coin.addEventListener("click", () => {
        showModal(
          grade.subject || "Noma'lum fan",
          grade.reward || "Mukofot mavjud emas",
          grade.createdAt
        );
      });
      
      coinsContainer.appendChild(coin);
    });
  } catch (error) {
    console.error("Baholarni yuklashda xatolik:", error);
    const coinsContainer = document.querySelector(".coins");
    if (coinsContainer) {
      coinsContainer.innerHTML = '<p>Baholarni yuklashda xatolik yuz berdi.</p>';
    }
  }
}

function getGradeColor(grade) {
  const gradeNum = parseInt(grade);
  if (gradeNum >= 5) return "#22c55e"; // green
  if (gradeNum >= 4) return "#eab308"; // yellow
  if (gradeNum >= 3) return "#f97316"; // orange
  return "#ef4444"; // red
}

// Load grades when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadGrades();
});

// Load grades when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadGrades();
});

// Refresh grades periodically
setInterval(loadGrades, 30000); // Refresh every 30 seconds

// Payment Modal Functions
function showPaymentModal() {
  if (paymentModal) {
    paymentModal.style.display = "block";
    setTimeout(() => paymentModal.classList.add("show"), 10);
  }
}

function hidePaymentModal() {
  paymentModal?.classList.remove("show");
  setTimeout(() => {
    if (paymentModal) paymentModal.style.display = "none";
  }, 300);
  resetPaymentForm();
}

function showConfirmationModal() {
  if (confirmationModal) {
    confirmationModal.style.display = "block";
    setTimeout(() => confirmationModal.classList.add("show"), 10);
  }
}

function hideConfirmationModal() {
  confirmationModal?.classList.remove("show");
  setTimeout(() => {
    if (confirmationModal) confirmationModal.style.display = "none";
  }, 300);
}

function resetPaymentForm() {
  if (paymentForm) paymentForm.reset();
  if (paymentStatusEl) {
    paymentStatusEl.style.display = "none";
    paymentStatusEl.className = "payment-status";
  }
  if (confirmationStatusEl) {
    confirmationStatusEl.style.display = "none";
    confirmationStatusEl.className = "payment-status";
  }
  recipientUser = null;
}

function showPaymentStatus(message, type = "info") {
  if (paymentStatusEl) {
    paymentStatusEl.textContent = message;
    paymentStatusEl.className = `payment-status ${type}`;
    paymentStatusEl.style.display = "block";
  }
}

function showConfirmationStatus(message, type = "info") {
  if (confirmationStatusEl) {
    confirmationStatusEl.textContent = message;
    confirmationStatusEl.className = `payment-status ${type}`;
    confirmationStatusEl.style.display = "block";
  }
}

async function findUserByBalanceId(balanceId) {
  try {
    const q = fsQuery(collection(db, "users"), where("balanceId", "==", balanceId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    let userData = null;
    querySnapshot.forEach((doc) => {
      userData = { id: doc.id, ...doc.data() };
    });
    
    return userData;
  } catch (error) {
    console.error("Foydalanuvchini qidirishda xatolik:", error);
    return null;
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showPaymentStatus("Foydalanuvchi ma'lumotlari topilmadi", "error");
    return;
  }
  
  const recipientCard = recipientCardEl?.value?.trim();
  const amount = parseInt(paymentAmountEl?.value || "0");
  const note = paymentNoteEl?.value?.trim() || "";
  
  if (!recipientCard) {
    showPaymentStatus("Karta raqamini kiriting", "error");
    return;
  }
  
  if (amount <= 0) {
    showPaymentStatus("Summa 0 dan katta bo'lishi kerak", "error");
    return;
  }
  
  if (amount > (currentUser.balance || 0)) {
    showPaymentStatus("Hisobingizda yetarli mablag' yo'q", "error");
    return;
  }
  
  if (recipientCard === currentUser.balanceId) {
    showPaymentStatus("O'zingizga pul jo'natib bo'lmaydi", "error");
    return;
  }
  
  showPaymentStatus("Qabul qiluvchi tekshirilmoqda...", "info");
  
  try {
    recipientUser = await findUserByBalanceId(recipientCard);
    
    if (!recipientUser) {
      showPaymentStatus("Bunday karta raqamli foydalanuvchi topilmadi", "error");
      return;
    }
    
    // Show confirmation modal
    if (confirmRecipientNameEl) confirmRecipientNameEl.textContent = recipientUser.fullName || "Noma'lum";
    if (confirmCardNumberEl) confirmCardNumberEl.textContent = recipientCard;
    if (confirmAmountEl) confirmAmountEl.textContent = `${amount.toLocaleString()} SO'M`;
    if (confirmNoteEl) confirmNoteEl.textContent = note || "Izoh yo'q";
    
    hidePaymentModal();
    showConfirmationModal();
    
  } catch (error) {
    console.error("To'lov jarayonida xatolik:", error);
    showPaymentStatus("To'lov jarayonida xatolik yuz berdi", "error");
  }
}

async function processPayment() {
  if (!currentUser || !recipientUser) {
    showConfirmationStatus("To'lov ma'lumotlari noto'g'ri", "error");
    return;
  }
  
  const amount = parseInt(paymentAmountEl?.value || "0");
  
  showConfirmationStatus("To'lov amalga oshirilmoqda...", "info");
  
  try {
    // Use Firestore transaction to ensure atomic operation
    await runTransaction(db, async (transaction) => {
      const senderRef = doc(db, "users", currentUser.id);
      const recipientRef = doc(db, "users", recipientUser.id);
      
      // Update sender balance
      const newSenderBalance = (currentUser.balance || 0) - amount;
      transaction.update(senderRef, { balance: newSenderBalance });
      
      // Update recipient balance
      const newRecipientBalance = (recipientUser.balance || 0) + amount;
      transaction.update(recipientRef, { balance: newRecipientBalance });
    });
    
    // Update current user data locally
    currentUser.balance = (currentUser.balance || 0) - amount;
    
    // Update UI
    if (cardBalanceEl) {
      setText(cardBalanceEl, `${currentUser.balance.toLocaleString()} SO'M`);
    }
    
    showConfirmationStatus("To'lov muvaffaqiyatli amalga oshirildi!", "success");
    
    setTimeout(() => {
      hideConfirmationModal();
    }, 2000);
    
  } catch (error) {
    console.error("To'lovni amalga oshirishda xatolik:", error);
    showConfirmationStatus("To'lovni amalga oshirishda xatolik yuz berdi", "error");
  }
}

// Payment Modal Event Listeners
payButton?.addEventListener("click", showPaymentModal);
closePayModal?.addEventListener("click", hidePaymentModal);
closeConfirmModal?.addEventListener("click", hideConfirmationModal);
cancelPaymentBtn?.addEventListener("click", hidePaymentModal);
cancelConfirmationBtn?.addEventListener("click", () => {
  hideConfirmationModal();
  showPaymentModal();
});

paymentForm?.addEventListener("submit", handlePaymentSubmit);
finalConfirmBtn?.addEventListener("click", processPayment);

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  if (event.target === paymentModal) {
    hidePaymentModal();
  }
  if (event.target === confirmationModal) {
    hideConfirmationModal();
  }
});