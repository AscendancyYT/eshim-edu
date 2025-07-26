import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0BvBkEdHI2TCt1MH4I8VFAteTUkMw_PE",
  authDomain: "eshim-coin.firebaseapp.com",
  projectId: "eshim-coin",
  storageBucket: "eshim-coin.firebasestorage.app",
  messagingSenderId: "1027852914663",
  appId: "1:1027852914663:web:9381d871eedca60896f742",
  measurementId: "G-M1K1X7QVTS",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const topBidEl = document.getElementById("topBid");
const topUserEl = document.getElementById("topUser");
const timerEl = document.getElementById("timer");
const bidBtn = document.getElementById("bidBtn");
const bidListEl = document.getElementById("bidList");
const activeEshimEl = document.getElementById("activeEshimId");
const accIdInput = document.getElementById("eshimId");
const bidAmountInput = document.getElementById("bidAmount");

let accID = null;
let bids = [];
let countdown = null;
let userDocRef = null;
let currentUserData = null;
const auctionRef = doc(db, "auction", "current");

async function fetchAccID() {
  const telegram = localStorage.getItem("telegram");
  if (!telegram) {
    alert("You're not logged in.");
    window.location.href = "/";
    return;
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("telegram", "==", telegram));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("No user found.");
      window.location.href = "/";
      return;
    }

    const userDoc = snapshot.docs[0];
    userDocRef = userDoc.ref;
    currentUserData = userDoc.data();
    accID = currentUserData.accID;
    accIdInput.value = accID;

    initAuction();
  } catch (err) {
    console.error("Error fetching accID:", err);
    alert("Failed to load user data.");
    window.location.href = "/";
  }
}

function initAuction() {
  onSnapshot(auctionRef, (snap) => {
    const data = snap.data();

    if (!data || !data.isActive) {
      activeEshimEl.textContent = "No active auction";
      bidBtn.disabled = true;
      bidAmountInput.disabled = true;
      timerEl.textContent = "Waiting...";
      return;
    }

    const { eshimId, topBid, topUser, startedAt, duration } = data;

    activeEshimEl.textContent = eshimId;
    topBidEl.textContent = topBid || 0;
    topUserEl.textContent = topUser || "N/A";
    bidBtn.disabled = false;
    bidAmountInput.disabled = false;
    bidBtn.textContent = "Place Bid";

    const startTime = startedAt?.seconds ? startedAt.seconds * 1000 : Date.now();
    startCountdown(startTime, duration || 60);
  });

  // Realtime public bids listener
  onSnapshot(collection(db, "auction", "current", "bids"), (snap) => {
    const allBids = [];
    snap.forEach((doc) => {
      const b = doc.data();
      allBids.push(b);
    });
    allBids.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
    updateBidList(allBids);
  });

  bidBtn.addEventListener("click", async () => {
    const amount = parseInt(bidAmountInput.value);
    if (!accID || isNaN(amount) || amount <= 0) {
      alert("Invalid bid or accID missing.");
      return;
    }

    const balance = currentUserData.eBalance || 0;
    if (amount > balance) {
      alert("Insufficient balance.");
      return;
    }

    const snap = await getDoc(auctionRef);
    const current = snap.data();

    if (amount <= (current?.topBid || 0)) {
      alert("Your bid must be higher than the current top bid!");
      return;
    }

    await updateDoc(userDocRef, {
      eBalance: balance - amount,
    });

    await updateDoc(auctionRef, {
      topBid: amount,
      topUser: accID,
    });

    await addDoc(collection(db, "auction", "current", "bids"), {
      userId: accID,
      amount,
      timestamp: new Date(),
    });

    bidAmountInput.value = "";
  });
}

function startCountdown(startedAt, duration) {
  const end = startedAt + duration * 1000;
  clearInterval(countdown);
  countdown = setInterval(async () => {
    const now = Date.now();
    const timeLeft = Math.max(0, Math.floor((end - now) / 1000));
    timerEl.textContent = timeLeft > 0 ? `${timeLeft}s` : "Ended";

    if (timeLeft <= 0) {
      clearInterval(countdown);
      bidBtn.disabled = true;
      bidBtn.classList.add("ended");
      bidBtn.textContent = "Auction Ended";
      await handleAuctionEnd();
    }
  }, 1000);
}

async function handleAuctionEnd() {
  const snap = await getDoc(auctionRef);
  const data = snap.data();
  if (!data?.topUser || !data?.eshimId) return;

  const q = query(collection(db, "users"), where("accID", "==", data.topUser));
  const res = await getDocs(q);
  if (res.empty) return;

  const winnerDoc = res.docs[0];

  await updateDoc(winnerDoc.ref, { accID: data.eshimId });

  await updateDoc(auctionRef, {
    winnerUID: winnerDoc.id,
  });

  if (accID === data.topUser) {
    localStorage.setItem("accID", data.eshimId);
  }

  alert(`🎉 Auction ended. ${data.topUser} is now assigned ESHIM ID ${data.eshimId}`);
}

function updateBidList(allBids = []) {
  bidListEl.innerHTML = "";
  allBids.forEach((bid) => {
    const el = document.createElement("div");
    el.className = "bid-item";
    const time = bid.timestamp?.toDate?.().toLocaleTimeString() || "--:--";
    el.innerText = `🟢 ${bid.userId} → ${bid.amount} Eshim @ ${time}`;
    bidListEl.appendChild(el);
  });
}

fetchAccID();