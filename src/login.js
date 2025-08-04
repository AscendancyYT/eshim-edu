import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

// Telegram configuration from environment variables
const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_CHAT_ID;

// Function to send log to Telegram
async function sendTelegramLog(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error("Error sending Telegram log:", error.message);
  }
}

const loginForm = document.querySelector(".flip-card__front .flip-card__form");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginForm.querySelector('input[name="email"]').value;
  const password = loginForm.querySelector('input[name="password"]').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await sendTelegramLog(
      `User logged in: ${user.email} \n at ${new Date().toISOString()}`
    );

    alert("Muvaffaqiyatli kirish!");
  } catch (error) {
    await sendTelegramLog(
      `Login failed for ${email}: ${
        error.message
      } at ${new Date().toISOString()}`
    );
    alert(`Xatolik: ${error.message}`);
  }
});

const signupForm = document.querySelector(".flip-card__back .flip-card__form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = signupForm.querySelector('input[type="name"]').value;
  const email = signupForm.querySelector('input[name="email"]').value;
  const password = signupForm.querySelector('input[name="password"]').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Add user to Firestore
    const docRef = await addDoc(collection(db, "users"), {
      name: name,
      accID: user.uid,
      email: email,
      balance: 0,
    });

    console.log("Document written with ID: ", docRef.id);

    await sendTelegramLog(
      `New user registered: ${name} (${
        user.email
      }) at ${new Date().toISOString()}`
    );
    alert("Muvaffaqiyatli ro‘yxatdan o‘tingiz!");

  } catch (error) {
    await sendTelegramLog(
      `Signup failed for ${email}: ${
        error.message
      } at ${new Date().toISOString()}`
    );
    alert(`Xatolik: ${error.message}`);
  }
});

const toggleSwitch = document.querySelector(".toggle");
toggleSwitch.addEventListener("change", () => {
  const flipCard = document.querySelector(".flip-card__inner");
  flipCard.style.transform = toggleSwitch.checked
    ? "rotateY(180deg)"
    : "rotateY(0deg)";
});