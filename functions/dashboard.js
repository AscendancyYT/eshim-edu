import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  getDocs,
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "../index.html";
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

// UI refs
const userEmailEl = $("#userEmail");
const userPhotoEl = $("#userPhoto");
const userProfilePicEl = $(".userProfilePic");

const gradesSection = $(".section.grades");
const eshimpaySection = $(".section.eshimpay");

const cardNumberEl = $("#cardNumber");
const cardHolderEl = $("#cardHolder");
const cardBalanceEl = $("#cardBalance");

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
const cancelConfirmationBtn = $("#cancelConfirmation");
const finalConfirmBtn = $("#finalConfirmPayment");

const confirmRecipientNameEl = $("#confirmRecipientName");
const confirmCardNumberEl = $("#confirmCardNumber");
const confirmAmountEl = $("#confirmAmount");
const confirmNoteEl = $("#confirmNote");

// state
let currentUser = null;
let recipientUser = null;
let paymentDraft = { recipientCard: null, amount: 0, note: "" };

// utils
function formatTimestamp(v) {
  if (!v) return "Mavjud emas";
  if (typeof v.toDate === "function") return v.toDate().toLocaleString();
  if (typeof v === "number") return new Date(v).toLocaleString();
  return "Mavjud emas";
}

function normalizeBalanceId(input) {
  if (!input) return "";
  return input.replace(/\s+/g, "").toUpperCase();
}

function isValidBalanceId(input) {
  return /^\d{3}-[A-Z]{3}-\d{3}$/.test(input);
}

async function getUserByFullName(fullName) {
  const q = fsQuery(collection(db, "users"), where("fullName", "==", fullName));
  const qs = await getDocs(q);
  if (qs.empty) return null;

  let u = null;
  qs.forEach((docSnap) => {
    u = { id: docSnap.id, ...docSnap.data() };
  });

  if (u) {
    if (userEmailEl) setText(userEmailEl, u.email || "—");
    if (userPhotoEl && u.photoURL) userPhotoEl.src = u.photoURL;
    if (cardNumberEl) setText(cardNumberEl, u.balanceId || "Mavjud emas");
    if (cardHolderEl) setText(cardHolderEl, (u.fullName || "NOMA'LUM FOYDALANUVCHI").toUpperCase());
    if (cardBalanceEl) setText(cardBalanceEl, `${(u.balance ?? 0).toLocaleString()} ESHIM`);
    currentUser = u;
    console.log("Current user loaded:", u);
  }
  return u;
}

// sidebar navigation
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
    
    // Auto-close sidebar on mobile after selecting a tab
    if (window.innerWidth <= 768) {
      sidebar?.classList.remove("active");
    }
  });
});

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

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar?.classList.remove("active");
  }
});

// modal for grades
const modal = document.getElementById("gradeModal");
const closeModal = document.querySelector(".close");

if (closeModal) {
  closeModal.addEventListener("click", () => {
    modal?.classList.remove("show");
    setTimeout(() => { if (modal) modal.style.display = "none"; }, 300);
  });
}

window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal?.classList.remove("show");
    setTimeout(() => { if (modal) modal.style.display = "none"; }, 300);
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

// bootstrap
(async function bootstrap() {
  gradesSection?.classList.remove("hidden");
  gradesSection?.classList.add("active");

  // temporarily disable pay to avoid race
  if (payButton) payButton.disabled = true;
  if (finalConfirmBtn) finalConfirmBtn.disabled = true;

  const fullName = localStorage.getItem("fullName") || "";
  if (fullName) await getUserByFullName(fullName).catch(console.error);

  if (userProfilePicEl) {
    const initial = (fullName || "F").trim()[0] || "F";
    userProfilePicEl.innerHTML = initial.toUpperCase();
  }

  if (payButton) payButton.disabled = false; // ready
})();

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
      coinsContainer.innerHTML = "<p>Hozircha baholar mavjud emas.</p>";
      return;
    }
    querySnapshot.forEach((doc) => {
      const grade = doc.data();
      const coin = document.createElement("li");
      coin.className = "coin";
      coin.textContent = grade.grade || "?";
      coin.style.backgroundColor = getGradeColor(grade.grade);
      coin.addEventListener("click", () => {
        showModal(grade.subject || "Noma'lum fan", grade.reward || "Mukofot mavjud emas", grade.createdAt);
      });
      coinsContainer.appendChild(coin);
    });
  } catch (error) {
    console.error("Baholarni yuklashda xatolik:", error);
    const coinsContainer = document.querySelector(".coins");
    if (coinsContainer) { coinsContainer.innerHTML = "<p>Baholarni yuklashda xatolik yuz berdi.</p>"; }
  }
}

function getGradeColor(grade) {
  const g = parseInt(grade);
  if (g >= 5) return "#22c55e";
  if (g >= 4) return "#eab308";
  if (g >= 3) return "#f97316";
  return "#ef4444";
}

document.addEventListener("DOMContentLoaded", loadGrades);
setInterval(loadGrades, 30000);

// ================== PAYMENT SYSTEM ==================

function showPaymentModal() {
  if (paymentModal) {
    paymentModal.style.display = "block";
    setTimeout(() => paymentModal.classList.add("show"), 10);
  }
}

function hidePaymentModal() {
  paymentModal?.classList.remove("show");
  setTimeout(() => { if (paymentModal) paymentModal.style.display = "none"; }, 300);
  // Don't reset form when moving to confirmation - only reset when truly canceling
}

function showConfirmationModal() {
  if (confirmationModal) {
    confirmationModal.style.display = "block";
    setTimeout(() => confirmationModal.classList.add("show"), 10);
    if (finalConfirmBtn) finalConfirmBtn.disabled = false;
  }
}

function hideConfirmationModal() {
  confirmationModal?.classList.remove("show");
  setTimeout(() => { if (confirmationModal) confirmationModal.style.display = "none"; }, 300);
  if (finalConfirmBtn) finalConfirmBtn.disabled = true;
  // Reset everything when confirmation modal closes
  resetPaymentForm();
}

function resetPaymentForm() {
  if (paymentForm) paymentForm.reset();
  if (paymentStatusEl) { paymentStatusEl.style.display = "none"; paymentStatusEl.className = "payment-status"; }
  if (confirmationStatusEl) { confirmationStatusEl.style.display = "none"; confirmationStatusEl.className = "payment-status"; }
  recipientUser = null;
  paymentDraft = { recipientCard: null, amount: 0, note: "" };
  if (finalConfirmBtn) finalConfirmBtn.disabled = true;
}

function showPaymentStatus(message, type = "info") {
  if (paymentStatusEl) { paymentStatusEl.textContent = message; paymentStatusEl.className = `payment-status ${type}`; paymentStatusEl.style.display = "block"; }
}

function showConfirmationStatus(message, type = "info") {
  if (confirmationStatusEl) { confirmationStatusEl.textContent = message; confirmationStatusEl.className = `payment-status ${type}`; confirmationStatusEl.style.display = "block"; }
}

async function findUserByBalanceId(balanceIdRaw) {
  try {
    const balanceId = normalizeBalanceId(balanceIdRaw);
    if (!isValidBalanceId(balanceId)) return null;
    const q = fsQuery(collection(db, "users"), where("balanceId", "==", balanceId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    let userData = null;
    querySnapshot.forEach((d) => { 
      userData = { id: d.id, ...d.data() }; 
      console.log("Recipient user found:", userData);
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

  const rawCard = recipientCardEl?.value || "";
  const recipientCard = normalizeBalanceId(rawCard);
  const amount = parseInt(paymentAmountEl?.value || "0", 10);
  const note = (paymentNoteEl?.value || "").trim();

  if (!recipientCard) {
    showPaymentStatus("Qabul qiluvchi karta raqamini kiriting", "error");
    return;
  }
  if (!isValidBalanceId(recipientCard)) {
    showPaymentStatus("Karta formati noto'g'ri. To'g'ri format: 123-ABC-456", "error");
    return;
  }
  if (amount <= 0 || Number.isNaN(amount)) {
    showPaymentStatus("Summa 0 dan katta bo'lishi kerak", "error");
    return;
  }
  if (amount > (currentUser.balance || 0)) {
    showPaymentStatus("Hisobingizda yetarli mablag' yo'q", "error");
    return;
  }
  if (recipientCard === normalizeBalanceId(currentUser.balanceId || "")) {
    showPaymentStatus("O'zingizga pul jo'natib bo'lmaydi", "error");
    return;
  }

  paymentDraft = { recipientCard, amount, note };

  showPaymentStatus("Qabul qiluvchi tekshirilmoqda...", "info");
  try {
    recipientUser = await findUserByBalanceId(recipientCard);
    if (!recipientUser) {
      showPaymentStatus("Bunday karta raqamli foydalanuvchi topilmadi", "error");
      return;
    }

    if (confirmRecipientNameEl) confirmRecipientNameEl.textContent = recipientUser.fullName || "Noma'lum";
    if (confirmCardNumberEl) confirmCardNumberEl.textContent = recipientCard;
    if (confirmAmountEl) confirmAmountEl.textContent = `${amount.toLocaleString()} ESHIM`;
    if (confirmNoteEl) confirmNoteEl.textContent = note || "Izoh yo'q";

    hidePaymentModal();
    showConfirmationModal();
  } catch (error) {
    console.error("To'lov jarayonida xatolik:", error);
    showPaymentStatus("To'lov jarayonida xatolik yuz berdi", "error");
  }
}

async function processPayment() {
  const { amount, recipientCard } = paymentDraft;
  
  console.log("=== PAYMENT DEBUG INFO ===");
  console.log("currentUser:", currentUser);
  console.log("recipientUser:", recipientUser);
  console.log("paymentDraft:", paymentDraft);
  console.log("currentUser has id?", currentUser?.id);
  console.log("recipientUser has id?", recipientUser?.id);
  console.log("amount:", amount, typeof amount);

  // Enhanced validation
  if (!currentUser) {
    console.error("currentUser is null or undefined");
    showConfirmationStatus("Joriy foydalanuvchi ma'lumotlari topilmadi", "error");
    return;
  }

  if (!recipientUser) {
    console.error("recipientUser is null or undefined");
    showConfirmationStatus("Qabul qiluvchi ma'lumotlari topilmadi", "error");
    return;
  }

  if (!currentUser.id) {
    console.error("currentUser.id is missing");
    showConfirmationStatus("Joriy foydalanuvchi ID si topilmadi", "error");
    return;
  }

  if (!recipientUser.id) {
    console.error("recipientUser.id is missing");
    showConfirmationStatus("Qabul qiluvchi ID si topilmadi", "error");
    return;
  }

  if (!amount || amount <= 0 || isNaN(amount)) {
    console.error("Invalid amount:", amount);
    showConfirmationStatus("Noto'g'ri summa", "error");
    return;
  }

  if (finalConfirmBtn) finalConfirmBtn.disabled = true;
  showConfirmationStatus("To'lov amalga oshirilmoqda...", "info");

  try {
    await runTransaction(db, async (transaction) => {
      const senderRef = doc(db, "users", currentUser.id);
      const recipientRef = doc(db, "users", recipientUser.id);

      console.log("Sender ref path:", senderRef.path);
      console.log("Recipient ref path:", recipientRef.path);

      const senderSnap = await transaction.get(senderRef);
      const recipientSnap = await transaction.get(recipientRef);

      if (!senderSnap.exists()) {
        throw new Error("Jo'natuvchi foydalanuvchi topilmadi");
      }

      if (!recipientSnap.exists()) {
        throw new Error("Qabul qiluvchi foydalanuvchi topilmadi");
      }

      const senderData = senderSnap.data();
      const recipientData = recipientSnap.data();

      console.log("Sender data:", senderData);
      console.log("Recipient data:", recipientData);

      // safety: prevent self-transfer by IDs too
      if (senderRef.id === recipientRef.id) {
        throw new Error("O'zingizga pul jo'natib bo'lmaydi");
      }

      const senderBalance = Number(senderData.balance || 0);
      const recipientBalance = Number(recipientData.balance || 0);

      console.log("Sender balance:", senderBalance);
      console.log("Recipient balance:", recipientBalance);
      console.log("Transfer amount:", amount);

      if (amount > senderBalance) {
        throw new Error("Hisobingizda yetarli mablag' yo'q");
      }

      const newSenderBalance = senderBalance - amount;
      const newRecipientBalance = recipientBalance + amount;

      console.log("New sender balance:", newSenderBalance);
      console.log("New recipient balance:", newRecipientBalance);

      // Update balances
      transaction.update(senderRef, { balance: newSenderBalance });
      transaction.update(recipientRef, { balance: newRecipientBalance });

      // Create transfer record
      const transfersRef = collection(db, "transfers");
      const newTransferRef = doc(transfersRef);
      transaction.set(newTransferRef, {
        fromUserId: currentUser.id,
        fromFullName: currentUser.fullName || "Noma'lum",
        fromBalanceId: currentUser.balanceId || "",
        toUserId: recipientUser.id,
        toFullName: recipientUser.fullName || "Noma'lum", 
        toBalanceId: recipientCard,
        amount,
        note: paymentDraft.note || "",
        createdAt: new Date(),
        status: "completed"
      });

      console.log("Transaction prepared successfully");
    });

    // Update local user balance
    currentUser.balance = (currentUser.balance || 0) - amount;
    if (cardBalanceEl) setText(cardBalanceEl, `${currentUser.balance.toLocaleString()} ESHIM`);

    console.log("Payment completed successfully");
    showConfirmationStatus("To'lov muvaffaqiyatli amalga oshirildi!", "success");
    setTimeout(() => { hideConfirmationModal(); }, 1500);
  } catch (error) {
    console.error("To'lovni amalga oshirishda xatolik:", error);
    showConfirmationStatus(error.message || "To'lovni amalga oshirishda xatolik yuz berdi", "error");
    if (finalConfirmBtn) finalConfirmBtn.disabled = false;
  }
}

// ================== EVENT LISTENERS ==================

// Modal and button events
payButton?.addEventListener("click", showPaymentModal);
closePayModal?.addEventListener("click", () => {
  hidePaymentModal();
  resetPaymentForm(); // Reset when explicitly closing payment modal
});
closeConfirmModal?.addEventListener("click", hideConfirmationModal);
cancelPaymentBtn?.addEventListener("click", () => {
  hidePaymentModal();
  resetPaymentForm(); // Reset when canceling payment
});
cancelConfirmationBtn?.addEventListener("click", () => { 
  hideConfirmationModal(); 
  showPaymentModal(); 
});

paymentForm?.addEventListener("submit", handlePaymentSubmit);
finalConfirmBtn?.addEventListener("click", processPayment);

// Modal close on outside click
window.addEventListener("click", (event) => {
  if (event.target === paymentModal) {
    hidePaymentModal();
    resetPaymentForm(); // Reset when clicking outside payment modal
  }
  if (event.target === confirmationModal) {
    hideConfirmationModal(); // This already calls resetPaymentForm
  }
});