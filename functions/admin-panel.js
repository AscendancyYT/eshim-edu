import {
  collection,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
window.db = getFirestore(app);

const db = window.db;

const userList = document.querySelector(".admin-users");
const adminList = document.querySelector(".admin-withdraws");
const txList = document.querySelector(".admin-transactions");
const purchaseList = document.querySelector(".admin-purchases");

const searchUserInput = document.getElementById("search-user");
const searchWithdrawInput = document.getElementById("search-withdraw");
const searchTransactionInput = document.getElementById("search-transaction");
const searchPurchaseInput = document.getElementById("search-purchase");

const modal = document.querySelector(".modal");
const modalForm = document.querySelector(".modal-form");
const modalInputs = {
  accID: document.getElementById("edit-accid"),
  name: document.getElementById("edit-name"),
  password: document.getElementById("edit-password"),
  telegram: document.getElementById("edit-telegram"),
  eBalance: document.getElementById("edit-balance"),
  status: document.getElementById("edit-status"),
  badge: document.getElementById("edit-badge")
};

let allUsers = [];
let allWithdraws = [];
let allPurchases = [];
let allTransactions = [];
let selectedUserId = null;

let isSearchingUsers = false;
let isSearchingWithdraws = false;
let isSearchingTransactions = false;
let isSearchingPurchases = false;

function searchSort(list, query, key) {
  const q = query.toLowerCase();
  return list
    .map((item) => ({
      item,
      score: item[key]?.toLowerCase().startsWith(q)
        ? 2
        : item[key]?.toLowerCase().includes(q)
        ? 1
        : 0,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}

function openUserModal(user) {
  selectedUserId = user.id;
  modalInputs.accID.value = user.accID || "";
  modalInputs.name.value = user.name || "";
  modalInputs.password.value = user.password || "";
  modalInputs.telegram.value = user.telegram || "";
  modalInputs.eBalance.value = user.eBalance || 0;
  modalInputs.status.value = user.status || "";
  modalInputs.badge.value = user.badge || "N/A"
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
  selectedUserId = null;
}

function renderUserList(users, limit = true) {
  userList.innerHTML = "";
  const displayUsers = limit ? users.slice(-15).reverse() : users;
  displayUsers.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    li.style.cursor = "pointer";
    li.onclick = () => openUserModal(user);
    userList.appendChild(li);
  });
}

function renderAdminWithdraws(withdraws, limit = true) {
  adminList.innerHTML = "";
  const display = limit ? withdraws.slice(-15).reverse() : withdraws;
  display.forEach((w) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div><b>UserID:</b> ${w.by}</div>
      <div><b>Amount:</b> ${w.amount}</div>
      <div><b>Status:</b> ${w.status}</div>
      <div><b>Date:</b> ${w.date}</div>
      <div><b>wId:</b> ${w.wId}</div>
      ${
        w.status === "pending"
          ? `
        <button data-id="${w.id}" class="approve">✅ Approve</button>
        <button data-id="${w.id}" class="deny">❌ Deny</button>
      `
          : ""
      }
    `;
    adminList.appendChild(li);
  });

  document
    .querySelectorAll(".approve")
    .forEach(
      (btn) => (btn.onclick = () => updateWithdraw(btn.dataset.id, "approved"))
    );
  document
    .querySelectorAll(".deny")
    .forEach(
      (btn) => (btn.onclick = () => updateWithdraw(btn.dataset.id, "denied"))
    );
}

function renderTransactions(list) {
  txList.innerHTML = "";
  if (!list.length) {
    txList.innerHTML = "<li>No transactions found.</li>";
    return;
  }

  list.forEach((tx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div><b>ID:</b> ${tx.trId}</div>
      <div><b>From:</b> ${tx.host?.name || "?"}</div>
      <div><b>To:</b> ${tx.guest?.name || "?"}</div>
      <div><b>Amount:</b> ${tx.amount}</div>
      <div><b>Date:</b> ${new Date(tx.date).toLocaleString()}</div>
    `;
    txList.appendChild(li);
  });
}

function renderPurchases(purchases, limit = true) {
  purchaseList.innerHTML = "";
  const display = limit ? purchases.slice(-15).reverse() : purchases;
  if (!display.length) {
    purchaseList.innerHTML = "<li>No purchases found.</li>";
    return;
  }

  display.forEach((p) => {
    const li = document.createElement("li");
    li.classList.add(p.status?.toLowerCase());
    li.innerHTML = `
      <b>AccID:</b> ${p.accID}<br/>
      <b>Amount:</b> ${p.amount} Eshims<br/>
      <b>Price:</b> ${p.price?.toLocaleString()} UZS<br/>
      <b>Status:</b> ${p.status}<br/>
      <b>Date:</b> ${new Date(p.createdAt).toLocaleString()}<br/>
      ${
        p.status === "waiting"
          ? `
        <button class="approve" data-id="${p.id}">✅ Approve</button>
        <button class="deny" data-id="${p.id}">❌ Deny</button>
      `
          : ""
      }
    `;
    purchaseList.appendChild(li);
  });

  document
    .querySelectorAll(".admin-purchases .approve")
    .forEach(
      (btn) => (btn.onclick = () => updatePurchase(btn.dataset.id, "approved"))
    );
  document
    .querySelectorAll(".admin-purchases .deny")
    .forEach(
      (btn) => (btn.onclick = () => updatePurchase(btn.dataset.id, "denied"))
    );
}

searchUserInput.oninput = () => {
  const query = searchUserInput.value.trim();
  isSearchingUsers = !!query;
  if (!query) {
    renderUserList(allUsers, true);
  } else {
    const filtered = searchSort(allUsers, query, "accID");
    renderUserList(filtered, false);
  }
};

searchWithdrawInput.oninput = () => {
  const query = searchWithdrawInput.value.trim();
  isSearchingWithdraws = !!query;
  if (!query) {
    renderAdminWithdraws(allWithdraws, true);
  } else {
    const filtered = searchSort(allWithdraws, query, "wId");
    renderAdminWithdraws(filtered, false);
  }
};

searchTransactionInput.oninput = () => {
  const query = searchTransactionInput.value.trim().toLowerCase();
  isSearchingTransactions = !!query;
  if (!query) {
    renderTransactions(allTransactions.slice(-15).reverse());
  } else {
    const filtered = allTransactions.filter(
      (tx) =>
        tx.trId?.toLowerCase().includes(query) ||
        tx.host?.name?.toLowerCase().includes(query) ||
        tx.guest?.name?.toLowerCase().includes(query) ||
        new Date(tx.date).toLocaleString().toLowerCase().includes(query)
    );
    renderTransactions(filtered);
  }
};

searchPurchaseInput.oninput = () => {
  const query = searchPurchaseInput.value.trim().toLowerCase();
  isSearchingPurchases = !!query;
  if (!query) {
    renderPurchases(allPurchases, true);
  } else {
    const filtered = allPurchases.filter(
      (p) =>
        p.accID?.toLowerCase().includes(query) ||
        p.status?.toLowerCase().includes(query) ||
        new Date(p.createdAt).toLocaleString().toLowerCase().includes(query)
    );
    renderPurchases(filtered, false);
  }
};

modalForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedUserId) return;

  const updatedUser = {
    status: modalInputs.status.value,
    name: modalInputs.name.value,
    password: modalInputs.password.value,
    telegram: modalInputs.telegram.value,
    eBalance: parseFloat(modalInputs.eBalance.value) || 0,
  };

  await updateDoc(doc(db, "users", selectedUserId), updatedUser);
  closeModal();
  await fetchUsers();
});

window.onclick = (e) => {
  if (e.target === modal) closeModal();
};

async function fetchUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!isSearchingUsers) renderUserList(allUsers, true);
}

async function fetchWithdraws() {
  const snapshot = await getDocs(collection(db, "withdraws"));
  allWithdraws = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!isSearchingWithdraws) renderAdminWithdraws(allWithdraws, true);
}

async function fetchTransactions() {
  const snapshot = await getDocs(collection(db, "transactions"));
  allTransactions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!isSearchingTransactions)
    renderTransactions(allTransactions.slice(-15).reverse());
}

async function fetchPurchases() {
  const snapshot = await getDocs(collection(db, "purchaseReq"));
  allPurchases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!isSearchingPurchases) renderPurchases(allPurchases, true);
}

async function updateWithdraw(id, status) {
  await updateDoc(doc(db, "withdraws", id), { status });
  await fetchWithdraws();
}

async function updatePurchase(id, status) {
  await updateDoc(doc(db, "purchaseReq", id), { status });

  if (status === "approved") {
    const snapshot = await getDocs(collection(db, "purchaseReq"));
    const purchaseDoc = snapshot.docs.find((doc) => doc.id === id);
    const purchase = purchaseDoc?.data();

    if (purchase) {
      const { accID, amount } = purchase;
      const user = allUsers.find((u) => u.accID === accID);
      if (user) {
        const updatedBalance =
          (parseFloat(user.eBalance) || 0) + (parseFloat(amount) || 0);
        await updateDoc(doc(db, "users", user.id), {
          eBalance: updatedBalance,
        });
      }
    }
  }

  await fetchPurchases();
}

document.getElementById("auctionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const eshimId = document.getElementById("auctionEshimId").value.trim();
  if (!eshimId) return alert("Enter a valid ESHIM ID");

  const auctionRef = doc(db, "auction", "current");
  await setDoc(auctionRef, {
    eshimId,
    isActive: true,
    startedAt: serverTimestamp(),
    topBid: 0,
    topUser: null,
    duration: 60,
  });

  alert("Auction started successfully for ESHIM ID: " + eshimId);
  e.target.reset();
});

fetchUsers();
fetchWithdraws();
fetchTransactions();
fetchPurchases();

setInterval(() => {
  if (!isSearchingWithdraws) fetchWithdraws();
}, 1500);

setInterval(() => {
  if (!isSearchingTransactions) fetchTransactions();
}, 1500);

setInterval(() => {
  if (!isSearchingPurchases) fetchPurchases();
}, 1500);
