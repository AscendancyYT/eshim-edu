import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const telegram = localStorage.getItem("telegram");
if (!telegram) window.location.href = "../index.html";

// Elements
const displayBal = document.querySelector(".displayBalance");
const sessionBal = document.querySelector(".sessionBalance");
const mineBtn = document.querySelector(".mineBtn");
const miningStatus = document.querySelector(".miningStatus");
const currentHashEl = document.querySelector(".currentHash");
const hashProgressEl = document.querySelector(".hashProgress");

let currentUser = null;
let miningInterval = null;
let sessionEarnings = 0;

async function getUser() {
  const q = query(collection(db, "users"), where("telegram", "==", telegram));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    alert("User not found.");
    return;
  }
  const docSnap = snapshot.docs[0];
  currentUser = { id: docSnap.id, ...docSnap.data() };
  displayBal.innerText = `Your Balance: ${currentUser.eBalance.toFixed(2)}`;
}

await getUser();

mineBtn.onclick = () => {
  if (miningInterval) {
    stopMining();
  } else {
    startMining();
  }
};

function startMining() {
  mineBtn.innerText = "Stop Mining";
  miningStatus.innerText = "Status: Mining ⛏️";
  currentHashEl.innerText = "Hash: -";
  hashProgressEl.innerText = "Progress: 0 / 100";
  sessionEarnings = 0;
  sessionBal.innerText = `Session Gain: 0`;
  miningInterval = setInterval(mineDigit, 1500);
}

function stopMining() {
  mineBtn.innerText = "Start Mining";
  miningStatus.innerText = "Status: Not Mining";
  currentHashEl.innerText = "Hash: -";
  hashProgressEl.innerText = "Progress: 0 / 100";
  clearInterval(miningInterval);
  miningInterval = null;
}

async function mineDigit() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "hashes"),
      where("claimed", "==", false),
      where("locked", "==", false),
      where("solvedDigits", "<", 100),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      miningStatus.innerText = "Status: No hashes available";
      return;
    }

    const docSnap = snapshot.docs[0];
    const hashId = docSnap.id;
    const hashRef = doc(db, "hashes", hashId);

    const liveDocSnap = await getDoc(hashRef);
    if (!liveDocSnap.exists()) {
      console.warn("Hash no longer exists:", hashId);
      return;
    }

    const liveData = liveDocSnap.data();

    if (
      liveData.locked === true ||
      liveData.claimed === true ||
      liveData.solvedDigits >= liveData.totalDigits
    ) {
      return;
    }

    await updateDoc(hashRef, { locked: true });

    const nextDigitIndex = liveData.currentIndex;
    const charMined = liveData.hash[nextDigitIndex];
    if (!charMined) {
      await updateDoc(hashRef, { locked: false });
      return;
    }

    const batch = writeBatch(db);
    const newSolved = liveData.solvedDigits + 1;
    const newIndex = nextDigitIndex + 1;

    batch.update(hashRef, {
      solvedDigits: newSolved,
      currentIndex: newIndex,
      locked: false,
      ...(newSolved >= liveData.totalDigits && {
        claimed: true,
        minedBy: currentUser.id
      })
    });

    const reward = 0.01;
    const newBalance = currentUser.eBalance + reward;
    currentUser.eBalance = newBalance;
    sessionEarnings += reward;

    const userRef = doc(db, "users", currentUser.id);
    batch.update(userRef, { eBalance: newBalance });

    await batch.commit();

    displayBal.innerText = `Your Balance: ${newBalance.toFixed(2)}`;
    sessionBal.innerText = `Session Gain: ${sessionEarnings.toFixed(2)}`;
    currentHashEl.innerText = `Hash: ${liveData.id || hashId}`;
    hashProgressEl.innerText = `Progress: ${newSolved} / ${liveData.totalDigits}`;
  } catch (err) {
    console.error("Mining failed:", err);
    miningStatus.innerText = "Status: Error during mining";
  }
}
