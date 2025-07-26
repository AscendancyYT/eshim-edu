import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0BvBkEdHI2TCt1MH4I8VFAteTUkMw_PE",
  authDomain: "eshim-coin.firebaseapp.com",
  projectId: "eshim-coin",
  storageBucket: "eshim-coin.appspot.com",
  messagingSenderId: "1027852914663",
  appId: "1:1027852914663:web:9381d871eedca60896f742",
  measurementId: "G-M1K1X7QVTS",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const telegram = localStorage.getItem("telegram");
let recipient = null;
let senderDocId = null;

if (!telegram) {
  window.location.href = "../index.html";
}

function makeid(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

window.findRecipient = async function () {
  const input = document.getElementById("recipientId").value.trim();
  const display = document.getElementById("recipientNameDisplay");
  const sendBtn = document.getElementById("sendBtn");
  const msg = document.getElementById("msg");

  display.textContent = "🔍 Searching...";
  msg.textContent = "";
  sendBtn.disabled = true;
  recipient = null;

  if (input === "") {
    display.textContent = "Recipient: None";
    return;
  }

  try {
    const q = query(collection(db, "users"), where("accID", "==", input));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      display.textContent = "❌ Recipient not found";
      return;
    }

    const docSnap = snapshot.docs[0];
    recipient = { ...docSnap.data(), id: docSnap.id };
    display.textContent = `Recipient: ${recipient.name}`;
    sendBtn.disabled = false;
  } catch (err) {
    console.error(err);
    display.textContent = "❌ Error fetching recipient";
  }
};

window.sendTransaction = async function () {
  const amount = parseFloat(document.getElementById("amount").value);
  const msg = document.getElementById("msg");

  if (!recipient) {
    msg.textContent = "❌ No valid recipient selected.";
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    msg.textContent = "❌ Invalid amount.";
    return;
  }

  try {
    const senderQuery = query(
      collection(db, "users"),
      where("telegram", "==", telegram)
    );
    const senderSnap = await getDocs(senderQuery);

    if (senderSnap.empty) {
      msg.textContent = "❌ Sender not found.";
      return;
    }

    const senderDoc = senderSnap.docs[0];
    const sender = senderDoc.data();
    senderDocId = senderDoc.id;

    if (sender.eBalance < amount) {
      msg.textContent = "❌ Not enough balance.";
      return;
    }

    await addDoc(collection(db, "transactions"), {
      trId: makeid(6),
      amount: amount,
      host: {
        name: sender.name,
        telegram: sender.telegram,
        accID: sender.accID,
      },
      guest: {
        name: recipient.name,
        accID: recipient.accID,
      },
      date: new Date().toISOString(),
    });

    const recipientRef = doc(db, "users", recipient.id);
    const senderRef = doc(db, "users", senderDocId);

    await updateDoc(recipientRef, {
      eBalance: parseFloat(recipient.eBalance) + amount,
    });

    await updateDoc(senderRef, {
      eBalance: parseFloat(sender.eBalance) - amount,
    });

    msg.textContent = `✅ Sent ${amount} Eshim to ${recipient.name}`;
    document.getElementById("recipientId").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("recipientNameDisplay").textContent =
      "Recipient: None";
    recipient = null;
    document.getElementById("sendBtn").disabled = true;
  } catch (err) {
    console.error(err);
    msg.textContent = "❌ Transaction failed.";
  }
};
