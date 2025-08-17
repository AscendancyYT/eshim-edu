// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const toggleText = document.getElementById("toggleText");
const formTitle = document.getElementById("formTitle");
const fullNameField = document.getElementById("fullname");
const submitBtn = document.getElementById("submitBtn");
const classSelect = document.getElementById("select");

// Function to generate ID in format 123-ABC-789
function generateCustomId() {
  const digits = '0123456789';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Generate three random digits
  let firstPart = '';
  for (let i = 0; i < 3; i++) {
    firstPart += digits[Math.floor(Math.random() * 10)];
  }
  
  // Generate three random letters
  let secondPart = '';
  for (let i = 0; i < 3; i++) {
    secondPart += letters[Math.floor(Math.random() * 26)];
  }
  
  // Generate three random digits
  let thirdPart = '';
  for (let i = 0; i < 3; i++) {
    thirdPart += digits[Math.floor(Math.random() * 10)];
  }
  
  return `${firstPart}-${secondPart}-${thirdPart}`;
}

function renderClassOptions() {
  classSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Sinfni tanlang";
  placeholder.disabled = true;
  placeholder.selected = true;
  classSelect.appendChild(placeholder);

  const sections = ["A", "B", "D", "V", "G"];
  for (let grade = 1; grade <= 11; grade++) {
    for (const section of sections) {
      const value = `${grade}-${section}`;
      const opt = new Option(`${value}`, value);
      classSelect.add(opt);
    }
  }
}
renderClassOptions();

let isRegister = false;

toggleText.addEventListener("click", () => {
  isRegister = !isRegister;
  if (isRegister) {
    formTitle.textContent = "Xush Kelibsiz!";
    fullNameField.style.display = "block";
    classSelect.style.display = "block";
    submitBtn.textContent = "Yaratish";
    toggleText.textContent = "Akkauntga Kirish";
  } else {
    formTitle.textContent = "Xush Kelibsiz!";
    fullNameField.style.display = "none";
    classSelect.style.display = "none";
    submitBtn.textContent = "Login";
    toggleText.textContent = "Akkaunt Yaratish";
  }
});

// Handle form submission
document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const fullName = fullNameField.value.trim();
  const selectedClass = classSelect.value;

  try {
    if (isRegister) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Generate custom ID
      const customId = generateCustomId();

      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        class: selectedClass,
        createdAt: new Date(),
        balance: 0,
        role: "student",
        uid: user.uid,
        photoURL: "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
        grades: [],
        hasSellerPASS: false,
        balanceId: customId, 
      });

      window.location.href = "./src/dashboard.html";
      console.log("User registered:", user);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("fullName", fullName);
    } else {
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const displayName = userDoc.exists() ? userDoc.data().fullName : user.email;

      window.location.href = "./src/dashboard.html";
      console.log("User logged in:", user);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("fullName", displayName);
    }
  } catch (error) {
    console.error("Auth error:", error);

    let message = error.message;
    if (error.code === "auth/email-already-in-use") message = "❌ Bu email allaqachon ishlatilmoqda.";
    if (error.code === "auth/weak-password") message = "⚠️ Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
    if (error.code === "auth/wrong-password") message = "❌ Noto‘g‘ri parol.";
    if (error.code === "auth/user-not-found") message = "⚠️ Ushbu email bilan foydalanuvchi topilmadi.";

    alert(message);
  }
});