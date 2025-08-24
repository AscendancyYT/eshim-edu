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
const receiveButton = $("#receiveButton");
const scanQrButton = $("#scanQrButton");
const paymentModal = $("#paymentModal");
const qrModal = $("#qrModal");
const qrScanModal = $("#qrScanModal");
const confirmationModal = $("#confirmationModal");
const closePayModal = $("#closePayModal");
const closeQrModal = $("#closeQrModal");
const closeScanModal = $("#closeScanModal");
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

const qrCodeEl = $("#qrCode");
const qrAmountEl = $("#qrAmount");
const qrNoteEl = $("#qrNote");
const generateQrBtn = $("#generateQr");
const qrInfoEl = $("#qrInfo");

const qrDataInput = $("#qrDataInput");
const parseQrBtn = $("#parseQr");
const qrScanStatus = $("#qrScanStatus");

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

// ================== PAYMENT REQUEST CLEANUP ==================

// Clean up expired payment requests from localStorage
function cleanupExpiredPayments() {
  const keys = Object.keys(localStorage);
  let cleanedCount = 0;
  
  keys.forEach(key => {
    if (key.startsWith('payment_request_')) {
      try {
        const paymentData = JSON.parse(localStorage.getItem(key));
        
        // Check if expired (older than 24 hours)
        if (paymentData.expiresAt && Date.now() > paymentData.expiresAt) {
          localStorage.removeItem(key);
          cleanedCount++;
          console.log(`Expired payment request removed: ${key}`);
        }
      } catch (error) {
        // Remove corrupted data
        localStorage.removeItem(key);
        cleanedCount++;
        console.log(`Corrupted payment request removed: ${key}`);
      }
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired payment requests`);
  }
}

// Get all active payment requests for current user
function getActivePaymentRequests() {
  if (!currentUser) return [];
  
  const keys = Object.keys(localStorage);
  const activeRequests = [];
  
  keys.forEach(key => {
    if (key.startsWith('payment_request_')) {
      try {
        const paymentData = JSON.parse(localStorage.getItem(key));
        
        // Check if not expired and belongs to current user
        if (paymentData.expiresAt && 
            Date.now() < paymentData.expiresAt && 
            paymentData.recipientId === currentUser.balanceId) {
          activeRequests.push(paymentData);
        }
      } catch (error) {
        console.error('Error parsing payment request:', error);
      }
    }
  });
  
  return activeRequests.sort((a, b) => b.timestamp - a.timestamp);
}

// Display active payment requests in QR info section
function displayActivePaymentRequests() {
  const activeRequests = getActivePaymentRequests();
  
  if (activeRequests.length === 0) return;
  
  let html = `
    <div style="background: #fff7ed; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
      <h4 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">
        <i class="bx bx-time-five"></i> Faol QR Kodlar (${activeRequests.length})
      </h4>
  `;
  
  activeRequests.forEach((request, index) => {
    const timeLeft = request.expiresAt - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    html += `
      <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: ${index === activeRequests.length - 1 ? '0' : '10px'}; border: 1px solid #fed7aa;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: bold; color: #92400e;">${request.amount.toLocaleString()} ESHIM</span>
          <span style="font-size: 12px; color: #a3a3a3;">${hoursLeft}s ${minutesLeft}d qoldi</span>
        </div>
        ${request.note ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${request.note}</p>` : ''}
        <div style="margin-top: 8px;">
          <button onclick="copyPaymentLink('${request.id}')" style="font-size: 12px; padding: 4px 8px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
            <i class="bx bx-copy"></i> Linkni Nusxalash
          </button>
          <button onclick="removePaymentRequest('${request.id}')" style="font-size: 12px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">
            <i class="bx bx-trash"></i> O'chirish
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  if (qrInfoEl && qrInfoEl.style.display !== 'none') {
    qrInfoEl.innerHTML += html;
  }
}

// Copy payment link to clipboard
function copyPaymentLink(paymentId) {
  const paymentLink = `${window.location.origin}/payment.html?id=${paymentId}`;
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(paymentLink).then(() => {
      showTemporaryMessage('Link nusxalandi!', 'success');
    }).catch(() => {
      fallbackCopyText(paymentLink);
    });
  } else {
    fallbackCopyText(paymentLink);
  }
}

// Fallback copy method for older browsers
function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showTemporaryMessage('Link nusxalandi!', 'success');
  } catch (err) {
    showTemporaryMessage('Linkni nusxalashda xatolik', 'error');
  }
  
  document.body.removeChild(textArea);
}

// Remove specific payment request
function removePaymentRequest(paymentId) {
  if (confirm('Bu QR kodni o\'chirishni xohlaysizmi?')) {
    localStorage.removeItem(`payment_request_${paymentId}`);
    showTemporaryMessage('QR kod o\'chirildi', 'info');
    
    // Refresh the display
    if (qrInfoEl && qrInfoEl.style.display !== 'none') {
      generateQrCode(); // This will regenerate the current QR and show updated active requests
    }
  }
}

// Show temporary message
function showTemporaryMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  const colors = {
    success: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
    error: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
    info: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.style.background = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.border = `1px solid ${color.border}`;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 300);
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

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
  
  // Cleanup expired payments on load
  cleanupExpiredPayments();
  
  // Auto cleanup every 5 minutes
  setInterval(cleanupExpiredPayments, 5 * 60 * 1000);
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

// ================== QR CODE LINK-BASED SYSTEM ==================

// Generate unique payment ID
function generatePaymentId() {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Start countdown timer for payment request
function startCountdown(paymentId, expirationTime) {
  const countdownElement = document.getElementById(`countdown_${paymentId}`);
  if (!countdownElement) return;
  
  const timer = setInterval(() => {
    const now = Date.now();
    const timeLeft = expirationTime - now;
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      countdownElement.textContent = 'Muddati tugagan';
      countdownElement.style.background = '#fee2e2';
      countdownElement.style.color = '#991b1b';
      // Remove expired request
      localStorage.removeItem(`payment_request_${paymentId}`);
      return;
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    countdownElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

// Share payment link (Web Share API or fallback)
function sharePaymentLink(paymentId) {
  const paymentLink = `${window.location.origin}/payment.html?id=${paymentId}`;
  const paymentData = JSON.parse(localStorage.getItem(`payment_request_${paymentId}`));
  
  if (navigator.share) {
    navigator.share({
      title: 'EshimPAY To\'lov So\'rovi',
      text: `${paymentData.recipientName} sizdan ${paymentData.amount.toLocaleString()} ESHIM so'ramoqda`,
      url: paymentLink
    }).catch(console.error);
  } else {
    // Fallback - copy to clipboard
    copyPaymentLink(paymentId);
  }
}

// Generate QR code with payment link instead of payment data
function generateQrCode() {
  if (!currentUser) {
    alert("Foydalanuvchi ma'lumotlari topilmadi");
    return;
  }

  const amount = parseInt(qrAmountEl?.value || "0", 10);
  const note = (qrNoteEl?.value || "").trim();

  if (amount <= 0 || isNaN(amount)) {
    alert("To'g'ri summa kiriting");
    return;
  }

  // Store payment request in localStorage with unique ID
  const paymentId = generatePaymentId();
  const paymentRequest = {
    id: paymentId,
    recipientId: currentUser.balanceId,
    recipientName: currentUser.fullName,
    amount: amount,
    note: note,
    timestamp: Date.now(),
    status: 'pending'
  };

  // Store in localStorage with expiration (24 hours)
  const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  localStorage.setItem(`payment_request_${paymentId}`, JSON.stringify({
    ...paymentRequest,
    expiresAt: expirationTime
  }));

  // Create payment link - adjust this to your actual domain
  const baseUrl = window.location.origin;
  const paymentLink = `${baseUrl}/payment.html?id=${paymentId}`;
  
  // Generate QR code with the payment link
  const qrSize = 200;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(paymentLink)}`;
  
  // Display QR code
  if (qrCodeEl) {
    qrCodeEl.innerHTML = `
      <img src="${qrApiUrl}" alt="QR Code" style="max-width: 100%; height: auto; border-radius: 8px;" />
      <p style="margin-top: 15px; font-size: 14px; color: #666; text-align: center;">
        QR kodni scan qiling va ${amount.toLocaleString()} ESHIM to'lang
      </p>
      <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #6c757d; word-break: break-all;">
        Link: ${paymentLink}
      </div>
      <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
        <button onclick="copyPaymentLink('${paymentId}')" style="font-size: 12px; padding: 8px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
          <i class="bx bx-copy"></i> Linkni Nusxalash
        </button>
        <button onclick="sharePaymentLink('${paymentId}')" style="font-size: 12px; padding: 8px 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
          <i class="bx bx-share"></i> Ulashish
        </button>
      </div>
    `;
  }

  // Show payment info with countdown
  if (qrInfoEl) {
    const expiryDate = new Date(expirationTime);
    qrInfoEl.innerHTML = `
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
        <h4 style="margin: 0 0 10px 0; color: #0c4a6e;">To'lov So'rovi Yaratildi:</h4>
        <p style="margin: 5px 0; color: #0c4a6e;"><strong>Qabul Qiluvchi:</strong> ${currentUser.fullName}</p>
        <p style="margin: 5px 0; color: #0c4a6e;"><strong>Karta ID:</strong> ${currentUser.balanceId}</p>
        <p style="margin: 5px 0; color: #0c4a6e;"><strong>Summa:</strong> ${amount.toLocaleString()} ESHIM</p>
        ${note ? `<p style="margin: 5px 0; color: #0c4a6e;"><strong>Izoh:</strong> ${note}</p>` : ''}
        <p style="margin: 5px 0; color: #0c4a6e; font-size: 12px;"><strong>To'lov ID:</strong> ${paymentId}</p>
        <p style="margin: 5px 0; color: #0c4a6e; font-size: 12px;"><strong>Amal muddati:</strong> ${expiryDate.toLocaleString()}</p>
        <div id="countdown_${paymentId}" style="margin: 10px 0; padding: 8px; background: #e0f2fe; border-radius: 4px; font-weight: bold; color: #0891b2; text-align: center;">
          24:00:00
        </div>
      </div>
    `;
    qrInfoEl.style.display = "block";
    
    // Start countdown timer
    startCountdown(paymentId, expirationTime);
    
    // Display other active payment requests
    setTimeout(displayActivePaymentRequests, 100);
  }
}

function showQrModal() {
  if (qrModal) {
    qrModal.style.display = "block";
    setTimeout(() => qrModal.classList.add("show"), 10);
  }
}

function hideQrModal() {
  qrModal?.classList.remove("show");
  setTimeout(() => { if (qrModal) qrModal.style.display = "none"; }, 300);
  resetQrForm();
}

function resetQrForm() {
  if (qrAmountEl) qrAmountEl.value = "";
  if (qrNoteEl) qrNoteEl.value = "";
  if (qrCodeEl) qrCodeEl.innerHTML = "";
  if (qrInfoEl) qrInfoEl.style.display = "none";
}

// ================== QR CODE SCANNING FOR LINKS ==================

function parseQrData() {
  const qrData = qrDataInput?.value?.trim();
  
  if (!qrData) {
    showQrScanStatus("QR kod ma'lumotlarini kiriting", "error");
    return;
  }

  try {
    // Check if it's a payment link
    if (qrData.includes('/payment.html?id=') || qrData.includes('?id=PAY_')) {
      let paymentId;
      
      if (qrData.includes('/payment.html?id=')) {
        // Extract payment ID from URL
        const url = new URL(qrData);
        paymentId = url.searchParams.get('id');
      } else {
        // Direct payment ID
        paymentId = qrData.split('?id=')[1] || qrData;
      }
      
      if (!paymentId) {
        throw new Error("To'lov ID topilmadi");
      }

      // Check if this is a valid payment request
      const paymentData = localStorage.getItem(`payment_request_${paymentId}`);
      if (!paymentData) {
        showQrScanStatus("To'lov so'rovi topilmadi yoki muddati tugagan", "error");
        return;
      }

      // Parse payment request
      const paymentRequest = JSON.parse(paymentData);
      
      // Check if expired
      if (paymentRequest.expiresAt && Date.now() > paymentRequest.expiresAt) {
        localStorage.removeItem(`payment_request_${paymentId}`);
        showQrScanStatus("To'lov so'rovi muddati tugagan", "error");
        return;
      }

      // Check if trying to pay to self
      if (paymentRequest.recipientId === currentUser?.balanceId) {
        showQrScanStatus("O'zingizga pul jo'natib bo'lmaydi", "error");
        return;
      }

      // Redirect to payment page with the ID
      window.location.href = `/payment.html?id=${paymentId}`;
      return;
    }

    // Fallback: try to parse as JSON (for backward compatibility)
    const paymentRequest = JSON.parse(qrData);
    
    if (!paymentRequest.recipientId || !paymentRequest.amount) {
      throw new Error("QR kodda yetarli ma'lumot yo'q");
    }

    const amount = parseInt(paymentRequest.amount);
    if (amount <= 0 || isNaN(amount)) {
      throw new Error("Noto'g'ri summa");
    }

    if (paymentRequest.recipientId === currentUser?.balanceId) {
      showQrScanStatus("O'zingizga pul jo'natib bo'lmaydi", "error");
      return;
    }

    // Populate payment form with QR data (old format)
    if (recipientCardEl) recipientCardEl.value = paymentRequest.recipientId;
    if (paymentAmountEl) paymentAmountEl.value = amount;
    if (paymentNoteEl) paymentNoteEl.value = paymentRequest.note || "";
    
    hideQrScanModal();
    showPaymentModal();
    
    showPaymentStatus(`QR kod muvaffaqiyatli o'qildi! ${paymentRequest.recipientName || 'Foydalanuvchi'}ga ${amount.toLocaleString()} ESHIM jo'natishni tasdiqlang.`, "success");
    
  } catch (error) {
    console.error("QR kod tahlil qilishda xatolik:", error);
    showQrScanStatus("QR kod formati noto'g'ri yoki buzilgan", "error");
  }
}

function showQrScanModal() {
  if (qrScanModal) {
    qrScanModal.style.display = "block";
    setTimeout(() => qrScanModal.classList.add("show"), 10);
  }
}

function hideQrScanModal() {
  qrScanModal?.classList.remove("show");
  setTimeout(() => { if (qrScanModal) qrScanModal.style.display = "none"; }, 300);
  resetQrScanForm();
}

function resetQrScanForm() {
  if (qrDataInput) qrDataInput.value = "";
  if (qrScanStatus) {
    qrScanStatus.style.display = "none";
    qrScanStatus.className = "payment-status";
  }
}

function showQrScanStatus(message, type = "info") {
  if (qrScanStatus) {
    qrScanStatus.textContent = message;
    qrScanStatus.className = `payment-status ${type}`;
    qrScanStatus.style.display = "block";
  }
}

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

// Global functions for onclick handlers
window.copyPaymentLink = copyPaymentLink;
window.sharePaymentLink = sharePaymentLink;
window.removePaymentRequest = removePaymentRequest;

// Modal and button events
payButton?.addEventListener("click", showPaymentModal);
receiveButton?.addEventListener("click", showQrModal);
scanQrButton?.addEventListener("click", showQrScanModal);
closePayModal?.addEventListener("click", () => {
  hidePaymentModal();
  resetPaymentForm(); // Reset when explicitly closing payment modal
});
closeQrModal?.addEventListener("click", hideQrModal);
closeScanModal?.addEventListener("click", hideQrScanModal);
closeConfirmModal?.addEventListener("click", hideConfirmationModal);
cancelPaymentBtn?.addEventListener("click", () => {
  hidePaymentModal();
  resetPaymentForm(); // Reset when canceling payment
});
cancelConfirmationBtn?.addEventListener("click", () => { 
  hideConfirmationModal(); 
  showPaymentModal(); 
});
generateQrBtn?.addEventListener("click", generateQrCode);
parseQrBtn?.addEventListener("click", parseQrData);

paymentForm?.addEventListener("submit", handlePaymentSubmit);
finalConfirmBtn?.addEventListener("click", processPayment);

// Modal close on outside click
window.addEventListener("click", (event) => {
  if (event.target === paymentModal) {
    hidePaymentModal();
    resetPaymentForm(); // Reset when clicking outside payment modal
  }
  if (event.target === qrModal) {
    hideQrModal();
  }
  if (event.target === qrScanModal) {
    hideQrScanModal();
  }
  if (event.target === confirmationModal) {
    hideConfirmationModal(); // This already calls resetPaymentForm
  }
});