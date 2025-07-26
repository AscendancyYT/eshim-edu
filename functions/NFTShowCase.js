const firebaseConfig = {
  apiKey: "AIzaSyD0BvBkEdHI2TCt1MH4I8VFAteTUkMw_PE",
  authDomain: "eshim-coin.firebaseapp.com",
  projectId: "eshim-coin",
  storageBucket: "eshim-coin.firebasestorage.app",
  messagingSenderId: "1027852914663",
  appId: "1:1027852914663:web:9381d871eedca60896f742",
  measurementId: "G-M1K1X7QVTS",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const nftGrid = document.getElementById("nft-grid");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");

function showModal(nft) {
  modalContent.innerHTML = `
  <img src="${nft.imageURL}" alt="${nft.name}" />
  <h2>${nft.name}</h2>
  <p><strong>Description:</strong> ${nft.description}</p>
        <p><strong>Owner:</strong> ${nft.owner}</p>
        <p><strong>ID:</strong> ${nft.id}</p>
        <p><strong>Rarity:</strong> ${nft.rarity}</p>
        <div class="close-btn" onclick="modal.style.display='none'">Close</div>
        `;
  modal.style.display = "flex";
}

async function loadNFTs() {
  const snapshot = await db.collection("NFTs").get();
  snapshot.forEach((doc) => {
    const nft = doc.data();
    const card = document.createElement("div");
    card.className = `card ${
      nft.rarity.toLowerCase() === "mythic" ? "mythic" : ""
    }`;
    card.innerHTML = `
          <img src="${nft.imageURL}" alt="${nft.name}" />
          <div class="info">${nft.name}</div>
          `;
    card.onclick = () => showModal(nft);
    nftGrid.appendChild(card);
  });
}

loadNFTs();