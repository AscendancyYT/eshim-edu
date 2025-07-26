const translations = {
  ru: {
    hero_title: "Мотивация встречает образование",
    hero_text:
      "Мы не отслеживаем домашки. Мы зажигаем внутри тебя огонь — тот самый, что двигает тебя вперёд и заставляет мечтать смелее.",
    start_btn: "Начать путь",
    feature1_title: "🔥 Настоящая мотивация",
    feature1_text:
      "Ежедневные импульсы, личные достижения и мягкие напоминания.",
    feature2_title: "🌱 Рост, не выгорание",
    feature2_text: "Открывай свои сильные стороны без давления и гонки.",
    feature3_title: "💡 Для мыслящих",
    feature3_text:
      "Для любознательных умов и креативных душ, не для зомби с чеклистами.",
    extra1_title: "Совсем другой подход.",
    extra1_text:
      "Eshim Edu — не просто школьный сервис. Он не заваливает заданиями. Он даёт тебе вызовы и поддержку, которые действительно важны.",
    extra2_title: "Почему это работает",
    extra2_text:
      "Потому что ты — в центре. Что ты хочешь достичь, кем хочешь стать — всё зависит от тебя. Без давления, с максимумом вайба.",
  },
  uz: {
    hero_title: "Motivatsiya va Ta'lim",
    hero_text:
      "Biz uy vazifasini tekshirish uchun emasmiz. Biz sizdagi ichki olovni yoqamiz — u sizni yanada uzoqqa yetaklaydi.",
    start_btn: "Yo‘lni boshlang",
    feature1_title: "🔥 Haqiqiy motivatsiya",
    feature1_text: "Kunlik turtki, shaxsiy yutuqlar va bosimsiz eslatmalar.",
    feature2_title: "🌱 O‘zingni o‘stir, ezilma",
    feature2_text:
      "Kuchli tomonlaringni topishga yordam beramiz. Bu sening o‘sishing.",
    feature3_title: "💡 Fikr egalariga",
    feature3_text:
      "Qiziquvchan, ijodiy o‘quvchilar va kelajak yetakchilari uchun yaratilgan.",
    extra1_title: "Boshqacha qurilgan.",
    extra1_text:
      "Eshim Edu odatdagi maktab ilovasi emas. Bu sizni vazifalar bilan to‘ldirmaydi. Bu sizga ilhom va yordam beradi.",
    extra2_title: "Nega ishlaydi",
    extra2_text:
      "Chunki bu siz haqingizda. Siz kim bo‘lishni xohlaysiz, qanday o‘sishni xohlaysiz — biz sizni quvvatlaymiz.",
  },
};

let copyrightYear = document.querySelector(".copyrightYear");

const select = document.getElementById("languageSelect");
select.addEventListener("change", () => {
  const lang = select.value;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.innerText = translations[lang][key];
  });
});


copyrightYear.innerHTML = new Date().getFullYear()