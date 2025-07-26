const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const langs = {
  en: {
    title: "Welcome to Eshim Edu",
    email: "Email",
    password: "Password",
    login: "Login",
    signup: "Sign Up",
  },
  ru: {
    title: "Добро пожаловать в Eshim Edu",
    email: "Электронная почта",
    password: "Пароль",
    login: "Войти",
    signup: "Зарегистрироваться",
  },
  uz: {
    title: "Eshim Edu ga xush kelibsiz",
    email: "Elektron pochta",
    password: "Parol",
    login: "Kirish",
    signup: "Ro'yxatdan o'tish",
  },
};

function setLang(lang) {
  localStorage.setItem("lang", lang);
  const t = langs[lang];
  document.getElementById("title").textContent = t.title;
  document.getElementById("email").placeholder = t.email;
  document.getElementById("password").placeholder = t.password;
  document.getElementById("loginBtn").textContent = t.login;
  document.getElementById("signupBtn").textContent = t.signup;
}

function initLang() {
  const lang = localStorage.getItem("lang") || "en";
  setLang(lang);
}
initLang();

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => alert("Logged in"))
    .catch((err) => alert(err.message));
}

function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth
    .createUserWithEmailAndPassword(email, password)
    .then(() => alert("Signed up"))
    .catch((err) => alert(err.message));
}
